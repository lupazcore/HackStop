import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { requiredEnv } from "../src/lib/env";
import { seedTokens } from "../src/lib/seed-config";
import { password } from "../src/lib/validation";

type Fixture = {
  event: { id: string; name: string; submissions_close: string };
  tracks: { id: string; name: string }[];
  judges: { id: string; name: string; email: string; tracks: string[] }[];
  teams: { id: string; name: string; members: string[] }[];
  projects: { id: string; team: string; track: string; title: string; summary: string; repo_url: string; submitted_at: string }[];
  scores: { judge: string; project: string; criteria: Record<string, number>; comment: string }[];
};

const db = new PrismaClient();
async function main() {
  const fixture = JSON.parse(await readFile(requiredEnv("FIXTURES_PATH"), "utf8")) as Fixture;
  const tokens = seedTokens();
  const passwordHash = await hash(password(requiredEnv("SEED_PASSWORD")), 12);
  await db.$transaction(async tx => {
    const seeded = await tx.event.findUnique({ where: { external_id: fixture.event.id } });
    if (!seeded) {
      const organizer = await tx.user.create({ data: { external_id: "organizer", email: requiredEnv("SEED_ORGANIZER_EMAIL"), name: "Organizer", role: "organizer", password_hash: passwordHash } });
      await tx.user.create({ data: { external_id: "admin", email: requiredEnv("SEED_ADMIN_EMAIL"), name: "Admin", role: "admin", password_hash: passwordHash } });
      const event = await tx.event.create({ data: { external_id: fixture.event.id, organizer_id: organizer.id, name: fixture.event.name, submissions_close: new Date(fixture.event.submissions_close) } });
      await tx.track.createMany({ data: fixture.tracks.map(track => ({ external_id: track.id, name: track.name, event_id: event.id })) });
      const tracks = new Map((await tx.track.findMany({ where: { event_id: event.id } })).map(track => [track.external_id!, track.id]));
      await tx.user.createMany({ data: fixture.judges.map(judge => ({ external_id: judge.id, email: judge.email, name: judge.name, role: "judge", password_hash: passwordHash })) });
      const memberEmails = [...new Set(fixture.teams.flatMap(team => team.members))];
      await tx.user.createMany({ data: memberEmails.map(email => ({ email, name: email.split("@")[0], role: "participant", password_hash: passwordHash })) });
      const users = await tx.user.findMany({ select: { id: true, email: true, external_id: true } });
      const usersByEmail = new Map(users.map(user => [user.email, user.id]));
      const judges = new Map(users.filter(user => user.external_id?.startsWith("jdg_")).map(user => [user.external_id!, user.id]));
      await tx.team.createMany({ data: fixture.teams.map(team => ({ external_id: team.id, name: team.name, event_id: event.id, invite_code: randomBytes(24).toString("hex") })) });
      const teams = new Map((await tx.team.findMany({ where: { event_id: event.id } })).map(team => [team.external_id!, team.id]));
      await tx.teamMember.createMany({ data: fixture.teams.flatMap(team => team.members.map((email, index) => ({ team_id: teams.get(team.id)!, user_id: usersByEmail.get(email)!, role: index === 0 ? "leader" : "member" }))) });
      await tx.judgeTrackAssignment.createMany({ data: fixture.judges.flatMap(judge => judge.tracks.map(track => ({ judge_id: judges.get(judge.id)!, track_id: tracks.get(track)! }))) });
      const seen = new Set<string>();
      const sorted = [...fixture.projects].sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
      await tx.project.createMany({ data: sorted.map(project => {
        const key = `${project.team}:${project.title}`;
        // Preserve the later fixture duplicate so historical judge work is not lost.
        const duplicate = seen.has(key);
        seen.add(key);
        return { external_id: project.id, team_id: teams.get(project.team)!, track_id: tracks.get(project.track)!, title: project.title, summary: project.summary, repo_url: project.repo_url, submitted_at: new Date(project.submitted_at), status: "submitted", is_duplicate: duplicate, image_urls: [], tech_tags: [], custom_answers: {} };
      }) });
      const projects = new Map((await tx.project.findMany({ where: { team: { event_id: event.id } } })).map(project => [project.external_id!, project.id]));
      const criteriaNames = [...new Set(fixture.scores.flatMap(score => Object.keys(score.criteria)))];
      const rubric = await tx.rubric.create({ data: { event_id: event.id, name: "Default Rubric", criteria: { create: criteriaNames.map((name, index) => ({ name, weight: 1, max_score: 5, sort_order: index })) } }, include: { criteria: true } });
      const criteria = new Map(rubric.criteria.map(criterion => [criterion.name, criterion.id]));
      await tx.judgeAssignment.createMany({ data: fixture.scores.map(score => ({ judge_id: judges.get(score.judge)!, project_id: projects.get(score.project)!, status: "completed" })), skipDuplicates: true });
      await tx.score.createMany({ data: fixture.scores.flatMap(score => Object.entries(score.criteria).map(([name, value]) => ({ judge_id: judges.get(score.judge)!, project_id: projects.get(score.project)!, criterion_id: criteria.get(name)!, value, comment: score.comment }))) });
    }
    const identities = { organizer: requiredEnv("SEED_ORGANIZER_EMAIL"), judge_a: fixture.judges[0].email, judge_b: fixture.judges[1].email, participant: fixture.teams[0].members[0] };
    for (const [role, email] of Object.entries(identities)) {
      const user = await tx.user.findUniqueOrThrow({ where: { email } });
      const token = tokens[role as keyof typeof tokens];
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await tx.session.upsert({ where: { token }, create: { token, user_id: user.id, expires_at: expiresAt }, update: { expires_at: expiresAt } });
    }
  }, { timeout: 60000 });
  process.stdout.write("seeded. test logins:\n" + Object.entries(tokens).map(([role, token]) => `  ${role.padEnd(13)}Cookie: session=${token}\n`).join(""));
}

main().catch((error: unknown) => {
  process.stderr.write(JSON.stringify({ level: "error", message: error instanceof Error ? error.message : "Fixture seed failed" }) + "\n");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
