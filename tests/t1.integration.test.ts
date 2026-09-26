import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { loadEnvFile } from "node:process";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { requiredEnv } from "../src/lib/env";
import { seedTokens } from "../src/lib/seed-config";

if (!process.env.DATABASE_URL) loadEnvFile();
const db = new PrismaClient();
const base = requiredEnv("APP_URL");
const tokens = seedTokens();
type Entity = Record<string, unknown> & { id: string; tracks: { id: string }[]; invite_code: string };

async function request(path: string, method = "GET", token?: string, payload?: unknown) {
  const response = await fetch(new URL(path, base), { method, headers: { "Content-Type": "application/json", ...(token ? { Cookie: `session=${token}` } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}) });
  const text = await response.text();
  let parsed: { data?: Entity; error?: string } = {};
  if (response.headers.get("content-type")?.includes("application/json")) parsed = JSON.parse(text) as typeof parsed;
  return { status: response.status, text, data: parsed.data!, error: parsed.error, cookie: response.headers.get("set-cookie")?.match(/session=([^;]+)/)?.[1] };
}

test("T1 workflows, ownership, sessions, fixture integrity and concurrent joins", async () => {
  const marker = `t1-${randomBytes(6).toString("hex")}`;
  const password = ` ${randomBytes(24).toString("hex")} `;
  const accountIds: string[] = [];
  const eventIds: string[] = [];
  try {
    const fixture = await db.event.findUniqueOrThrow({ where: { external_id: "evt_01" } });
    assert.equal(fixture.submissions_close.toISOString(), "2026-03-01T18:00:00.000Z");
    assert.equal(await db.project.count({ where: { team: { event_id: fixture.id } } }), 41);
    assert.equal(await db.score.count({ where: { project: { team: { event_id: fixture.id } } } }), 378);
    assert.equal(await db.user.count({ where: { role: "judge", external_id: { startsWith: "jdg_" } } }), 30);
    assert.equal(await db.project.count({ where: { is_duplicate: true, external_id: "prj_41" } }), 1);
    assert.equal((await request("/projects")).status, 200);
    assert.match((await request("/projects?q=Glass%20Signal")).text, /Glass Signal/);
    const late = await request("/projects/new", "POST", tokens.participant, { title: "late", summary: "probe" });
    assert.equal(late.status, 403); assert.match(late.error!, /closed/);
    for (const [path, method] of [["/api/events", "POST"], ["/api/teams", "POST"], ["/api/projects/new", "POST"], ["/api/projects/not-a-uuid", "PUT"], ["/api/teams/not-a-uuid/invite", "POST"]]) {
      assert.equal((await request(path, method, undefined, {})).status, 401);
      assert.equal((await request(path, method, tokens.judge_a, {})).status, 403);
    }
    const event = await request("/api/events", "POST", tokens.organizer, { name: marker, submissions_open: new Date(Date.now() - 60000).toISOString(), submissions_close: new Date(Date.now() + 3600000).toISOString(), tracks: ["Track A", "Track B"], prizes: ["First prize"], custom_questions: [{ id: "impact", label: "Who does it help?", required: true }] });
    assert.equal(event.status, 201, event.text); eventIds.push(event.data.id);
    const identities: { token: string; id: string }[] = [];
    for (let index = 0; index < 7; index++) {
      const user = await request("/api/auth/register", "POST", undefined, { name: `${marker}-${index}`, email: `${marker}-${index}@example.org`, password, role: "admin" });
      assert.equal(user.status, 201, user.text); assert.equal(user.data.role, "participant");
      assert.ok(user.cookie); accountIds.push(user.data.id); identities.push({ token: user.cookie, id: user.data.id });
    }
    const [owner, outsider] = identities;
    const team = await request("/api/teams", "POST", owner.token, { event_id: event.data.id, name: marker });
    assert.equal(team.status, 201, team.text);
    assert.equal((await request("/api/teams", "POST", owner.token, { event_id: event.data.id, name: "Other" })).status, 409);
    assert.equal((await request(`/api/teams/${team.data.id}`, "GET", outsider.token)).status, 404);
    const draft = { team_id: team.data.id, track_id: event.data.tracks[0].id, title: `${marker}-project`, summary: "Complete description", tagline: "Tagline", thumbnail_url: `${base}/preview.png`, image_urls: [`${base}/one.png`, `${base}/two.png`], demo_video_url: `${base}/demo`, repo_url: `${base}/repo`, live_url: `${base}/live`, tech_tags: [marker, "TypeScript"], custom_answers: {}, status: "draft" };
    assert.equal((await request("/api/projects/new", "POST", outsider.token, draft)).status, 403);
    const created = await request("/api/projects/new", "POST", owner.token, draft);
    assert.equal(created.status, 201, created.text);
    const publicDraft = await request(`/projects/${created.data.id}`);
    assert.doesNotMatch(publicDraft.text, new RegExp(`${marker}-project`));
    assert.match(publicDraft.text, /Page not found/);
    assert.equal((await request(`/api/projects/${created.data.id}`, "GET", outsider.token)).status, 404);
    assert.equal((await request(`/api/projects/${created.data.id}`, "PUT", outsider.token, draft)).status, 404);
    assert.equal((await request(`/api/projects/${created.data.id}`, "PUT", owner.token, { ...draft, status: "submitted" })).status, 400);
    assert.equal((await request(`/api/projects/${created.data.id}`, "PUT", owner.token, { ...draft, repo_url: "javascript:alert(1)" })).status, 400);
    const submitted = { ...draft, status: "submitted", custom_answers: { impact: "Builders" } };
    assert.equal((await request(`/api/projects/${created.data.id}`, "PUT", owner.token, submitted)).status, 200);
    const filtered = await request(`/api/projects?tag=${marker}&track=${event.data.tracks[0].id}`);
    assert.match(filtered.text, new RegExp(`${marker}-project`));
    assert.equal((await request(`/projects/${created.data.id}`)).status, 200);
    const joins = await Promise.all(identities.slice(1).map(identity => request(`/api/teams/${team.data.id}/invite`, "POST", identity.token, { invite_code: team.data.invite_code })));
    assert.ok(joins.every(join => [201, 409].includes(join.status)), JSON.stringify(joins.map(join => [join.status, join.error])));
    for (const [index, result] of joins.entries()) if (result.status === 409) await request(`/api/teams/${team.data.id}/invite`, "POST", identities[index + 1].token, { invite_code: team.data.invite_code });
    assert.equal(await db.teamMember.count({ where: { team_id: team.data.id } }), 4);
    await db.event.update({ where: { id: event.data.id }, data: { submissions_close: new Date(Date.now() - 1000) } });
    assert.equal((await request(`/api/projects/${created.data.id}`, "PUT", owner.token, submitted)).status, 403);
    assert.equal((await request("/api/projects/new", "POST", owner.token, draft)).status, 403);
    await db.user.update({ where: { id: outsider.id }, data: { role: "organizer" } });
    assert.equal((await request(`/api/events/${event.data.id}`, "GET", outsider.token)).status, 404);
    await db.user.update({ where: { id: outsider.id }, data: { role: "admin" } });
    assert.equal((await request(`/api/events/${event.data.id}`, "GET", outsider.token)).status, 200);
    await db.session.update({ where: { token: owner.token }, data: { expires_at: new Date(Date.now() - 1000) } });
    assert.equal((await request("/api/teams", "GET", owner.token)).status, 401);
    const login = await request("/api/auth/login", "POST", undefined, { email: `${marker}-0@example.org`, password });
    assert.equal(login.status, 200); assert.ok(login.cookie);
    assert.equal((await request("/api/auth/logout", "POST", login.cookie)).status, 200);
    assert.equal((await request("/api/teams", "GET", login.cookie)).status, 401);
    assert.equal((await request("/api/auth/login", "POST", undefined, { email: `${marker}-0@example.org`, password: "incorrect password" })).status, 401);
    const csrf = await fetch(new URL("/api/events", base), { method: "POST", headers: { Cookie: `session=${tokens.organizer}`, Origin: "null", "Content-Type": "application/json" }, body: "{}" });
    assert.equal(csrf.status, 403);
  } finally {
    await db.project.deleteMany({ where: { team: { event_id: { in: eventIds } } } });
    await db.event.deleteMany({ where: { id: { in: eventIds } } });
    await db.user.deleteMany({ where: { id: { in: accountIds } } });
    await db.$disconnect();
  }
});
