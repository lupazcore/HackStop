import { Prisma, type ProjectStatus } from "@prisma/client";
import { db } from "./db";
import { requireOpen } from "./deadline";
import { questions } from "./events";
import { body, HttpError, success } from "./http";
import { ownedTeams, type Actor } from "./permissions";
import { strings, text, url, uuid } from "./validation";

function projectInput(input: Record<string, unknown>, customQuestions: Prisma.JsonValue) {
  const status = input.status ?? "draft";
  if (status !== "draft" && status !== "submitted") throw new HttpError(400, "Status must be draft or submitted.");
  const answers = input.custom_answers ?? {};
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) throw new HttpError(400, "Custom answers must be a key-value object.");
  const fields = questions(customQuestions);
  const customAnswers: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!fields.some(q => q.id === key)) throw new HttpError(400, `Unknown custom question: ${key}`);
    customAnswers[key] = text(value, key, 5000, false);
  }
  for (const field of fields) if (status === "submitted" && field.required && !customAnswers[field.id]) throw new HttpError(400, `Answer required: ${field.label}`);
  return {
    title: text(input.title, "Title"), tagline: text(input.tagline, "Tagline", 500, false),
    summary: text(input.summary, "Description", 50000, status === "submitted"),
    thumbnail_url: url(input.thumbnail_url, "Thumbnail"), image_urls: strings(input.image_urls, "Image gallery", 20, 2048).map(value => url(value, "Gallery image")),
    demo_video_url: url(input.demo_video_url, "Demo video"), repo_url: url(input.repo_url, "Repository"), live_url: url(input.live_url, "Live link"),
    tech_tags: strings(input.tech_tags, "Tech tags", 30, 50), custom_answers: customAnswers, status: status as ProjectStatus,
  };
}

export async function saveProject(request: Request, actor: Actor, projectId?: string) {
  const input = await body(request);
  const result = await db.$transaction(async tx => {
    const existing = projectId ? await tx.project.findFirst({ where: { id: uuid(projectId), team: ownedTeams(actor) }, include: { team: { include: { event: true } } } }) : null;
    if (projectId && !existing) throw new HttpError(404, "Project not found in your team.");
    let team = existing?.team;
    if (!team && input.team_id) {
      team = (await tx.team.findFirst({ where: { id: uuid(input.team_id, "team_id"), ...ownedTeams(actor) }, include: { event: true } })) ?? undefined;
      if (!team) throw new HttpError(403, "You can only submit for your own team.");
    }
    if (!team) {
      const teams = await tx.team.findMany({ where: ownedTeams(actor), include: { event: true }, take: 2 });
      if (teams.length !== 1) throw new HttpError(400, "Choose a team for this submission.");
      team = teams[0];
    }
    requireOpen(team.event);
    const trackId = uuid(input.track_id ?? existing?.track_id, "track_id");
    if (!(await tx.track.findFirst({ where: { id: trackId, event_id: team.event_id } }))) throw new HttpError(400, "Track must belong to your team's event.");
    const data = projectInput(input, team.event.custom_questions);
    if (!existing && await tx.project.findFirst({ where: { team_id: team.id, is_duplicate: false } })) throw new HttpError(409, "Your team already has a project. Edit the existing submission.");
    const submittedAt = data.status === "submitted" ? existing?.submitted_at ?? new Date() : null;
    requireOpen(team.event);
    return existing
      ? tx.project.update({ where: { id: existing.id, team: ownedTeams(actor) }, data: { ...data, track_id: trackId, submitted_at: submittedAt } })
      : tx.project.create({ data: { ...data, team_id: team.id, track_id: trackId, submitted_at: submittedAt } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 10000 });
  return success(result, projectId ? 200 : 201);
}

export function galleryWhere(filters: { q?: string; track?: string; team?: string; tag?: string }): Prisma.ProjectWhereInput {
  return {
    status: "submitted",
    ...(filters.track ? { track_id: uuid(filters.track, "track") } : {}),
    ...(filters.team ? { team: { name: { contains: filters.team, mode: "insensitive" } } } : {}),
    ...(filters.tag ? { tech_tags: { array_contains: [filters.tag] } } : {}),
    ...(filters.q ? { OR: [
      { title: { contains: filters.q, mode: "insensitive" } },
      { tagline: { contains: filters.q, mode: "insensitive" } },
      { summary: { contains: filters.q, mode: "insensitive" } },
      { team: { name: { contains: filters.q, mode: "insensitive" } } },
    ] } : {}),
  };
}

export const PUBLIC_PROJECT_INCLUDE = { track: { select: { id: true, name: true, event_id: true } }, team: { select: { id: true, name: true } } } as const;
