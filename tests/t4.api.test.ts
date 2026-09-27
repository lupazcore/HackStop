import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { requiredEnv } from "../src/lib/env";
import { seedTokens } from "../src/lib/seed-config";

if (!process.env.DATABASE_URL) loadEnvFile();
const db = new PrismaClient();
const base = requiredEnv("APP_URL");
const tokens = seedTokens();

async function request(path: string, method = "GET", auth?: { cookie?: string; bearer?: string }, payload?: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth?.cookie) headers.Cookie = `session=${auth.cookie}`;
  if (auth?.bearer) headers.Authorization = `Bearer ${auth.bearer}`;
  const response = await fetch(new URL(path, base), {
    method,
    headers,
    ...(payload ? { body: JSON.stringify(payload) } : {})
  });
  const text = await response.text();
  let json: Record<string, unknown> = {};
  if (response.headers.get("content-type")?.includes("application/json")) {
    try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* ignore */ }
  }
  return { status: response.status, headers: response.headers, text, json, data: json.data, error: json.error as string | undefined };
}

test("T4: OpenAPI 3.1.0 specification integrity and discovery", async () => {
  const localSpec = JSON.parse(readFileSync("docs/openapi.json", "utf8")) as { openapi: string; paths: Record<string, unknown>; components: { schemas: Record<string, unknown> } };
  assert.equal(localSpec.openapi, "3.1.0");
  assert.ok(Object.keys(localSpec.paths).length >= 15);
  assert.ok(localSpec.components.schemas.User);
  assert.ok(localSpec.components.schemas.Event);
  assert.ok(localSpec.components.schemas.Project);
  assert.ok(localSpec.components.schemas.NormalizedResult);

  const discovery = await request("/api/v1");
  assert.equal(discovery.status, 200);
  assert.equal((discovery.json as { version: string }).version, "v1");

  const servedSpec = await request("/api/v1/openapi.json");
  assert.equal(servedSpec.status, 200);
  const parsedServed = servedSpec.json as typeof localSpec;
  assert.equal(parsedServed.openapi, "3.1.0");
  assert.equal(Object.keys(parsedServed.paths).length, Object.keys(localSpec.paths).length);
});

test("T4: REST API v1 endpoints, role enforcement, and bearer token support", async () => {
  const fixture = await db.event.findUniqueOrThrow({ where: { external_id: "evt_01" } });

  const health = await request("/api/v1/health");
  assert.equal(health.status, 200);
  assert.deepEqual(health.data, { status: "ready" });

  const gallery = await request("/api/v1/projects");
  assert.equal(gallery.status, 200);
  assert.ok(Array.isArray(gallery.data));
  assert.ok((gallery.data as unknown[]).length > 0);

  const unauthMe = await request("/api/v1/auth/me");
  assert.equal(unauthMe.status, 401);

  const cookieMe = await request("/api/v1/auth/me", "GET", { cookie: tokens.organizer });
  assert.equal(cookieMe.status, 200);
  assert.equal((cookieMe.data as { role: string }).role, "organizer");

  const bearerMe = await request("/api/v1/auth/me", "GET", { bearer: tokens.organizer });
  assert.equal(bearerMe.status, 200);
  assert.equal((bearerMe.data as { role: string }).role, "organizer");

  const unauthEvents = await request("/api/v1/events");
  assert.equal(unauthEvents.status, 401);

  const participantEvents = await request("/api/v1/events", "GET", { bearer: tokens.participant });
  assert.equal(participantEvents.status, 403);

  const organizerEvents = await request("/api/v1/events", "GET", { bearer: tokens.organizer });
  assert.equal(organizerEvents.status, 200);
  assert.ok(Array.isArray(organizerEvents.data));

  const judgeAssignments = await request("/api/v1/judge/assignments", "GET", { bearer: tokens.judge_a });
  assert.equal(judgeAssignments.status, 200);
  assert.ok(Array.isArray(judgeAssignments.data));

  const participantBlockedAssignments = await request("/api/v1/judge/assignments", "GET", { bearer: tokens.participant });
  assert.equal(participantBlockedAssignments.status, 403);

  const ownScores = await request("/api/v1/judge/scores", "GET", { bearer: tokens.judge_a });
  assert.equal(ownScores.status, 200);
  assert.ok(Array.isArray(ownScores.data));

  const peerScores = await request("/api/v1/judge/scores?judge=judge_a", "GET", { bearer: tokens.judge_b });
  assert.equal(peerScores.status, 403);

  const csvOrganizer = await request(`/api/v1/export.csv?event_id=${fixture.id}`, "GET", { bearer: tokens.organizer });
  assert.equal(csvOrganizer.status, 200);
  assert.match(csvOrganizer.headers.get("content-type") ?? "", /text\/csv/);
  assert.ok(csvOrganizer.text.includes("project_id"));

  const csvParticipant = await request(`/api/v1/export.csv?event_id=${fixture.id}`, "GET", { bearer: tokens.participant });
  assert.equal(csvParticipant.status, 403);

  const votes = await request(`/api/v1/votes?event_id=${fixture.id}`, "GET", { bearer: tokens.participant });
  assert.equal(votes.status, 200);
  assert.ok(Array.isArray(votes.data));

  const audit = await request(`/api/v1/organizer/community-audit?event_id=${fixture.id}`, "GET", { bearer: tokens.organizer });
  assert.equal(audit.status, 200);
  assert.ok(Array.isArray(audit.data));

  const auditBlocked = await request(`/api/v1/organizer/community-audit?event_id=${fixture.id}`, "GET", { bearer: tokens.participant });
  assert.equal(auditBlocked.status, 403);
});
