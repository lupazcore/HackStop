import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaClient, type Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { recomputeResults } from "../src/lib/normalization";
import { requiredEnv } from "../src/lib/env";
import { seedTokens } from "../src/lib/seed-config";

if (!process.env.DATABASE_URL) loadEnvFile();
const observer = new PrismaClient();
const tokens = seedTokens();

async function request(path: string, token: string, method = "GET", payload?: unknown) {
  const response = await fetch(new URL(path, requiredEnv("APP_URL")), {
    method, headers: { Cookie: `session=${token}`, "Content-Type": "application/json" },
    ...(payload ? { body: JSON.stringify(payload) } : {})
  });
  return { status: response.status, text: await response.text() };
}

test("normalization serializes with score saves and rubric changes", async t => {
  try {
    for (const mutation of ["score", "rubric"] as const) await t.test(mutation, async () => {
      let eventId: string | undefined;
      const restore: (() => void)[] = [];
      const restoreQueries = () => { for (const undo of restore.splice(0).reverse()) undo(); };
      const read = Promise.withResolvers<void>();
      const resume = Promise.withResolvers<void>();
      let calculation: Promise<number> | undefined;
      let save: ReturnType<typeof request> | undefined;
      try {
        const fixture = await db.event.findUniqueOrThrow({ where: { external_id: "evt_01" } });
        const judge = await db.user.findUniqueOrThrow({ where: { external_id: "jdg_01" } });
        const event = await db.event.create({ data: { organizer_id: fixture.organizer_id, name: `Concurrency ${randomUUID()}`, submissions_close: new Date(Date.now() - 60000), judging_close: new Date(Date.now() + 3600000) } });
        eventId = event.id;
        const track = await db.track.create({ data: { event_id: event.id, name: "Review" } });
        const rubric = await db.rubric.create({ data: { event_id: event.id, name: "Review", criteria: { create: [{ name: "Build", weight: 1, max_score: 5, sort_order: 0 }, { name: "Impact", weight: 1, max_score: 5, sort_order: 1 }] } }, include: { criteria: { orderBy: { sort_order: "asc" } } } });
        await db.judgeTrackAssignment.create({ data: { judge_id: judge.id, track_id: track.id } });
        const projects: string[] = [];
        for (let index = 0; index < 2; index++) {
          const team = await db.team.create({ data: { event_id: event.id, name: `Team ${index}`, invite_code: randomUUID() } });
          const project = await db.project.create({ data: { team_id: team.id, track_id: track.id, title: `Project ${index}`, status: "submitted" } });
          projects.push(project.id);
          await db.judgeAssignment.create({ data: { judge_id: judge.id, project_id: project.id, status: "completed" } });
          await db.score.createMany({ data: rubric.criteria.map((criterion, criterionIndex) => ({ judge_id: judge.id, project_id: project.id, criterion_id: criterion.id, value: criterionIndex === 0 ? [2, 4][index] : [5, 1][index] })) });
        }

        const pauseAfterRead = (client: Pick<Prisma.TransactionClient, "score">) => {
          const original = client.score.findMany.bind(client.score);
          restore.push(() => { Reflect.set(client.score, "findMany", original); });
          Reflect.set(client.score, "findMany", async (args: Prisma.ScoreFindManyArgs) => {
            const rows = await original(args);
            read.resolve();
            await resume.promise;
            return rows;
          });
        };
        pauseAfterRead(db);
        const transaction = db.$transaction.bind(db);
        restore.push(() => { Reflect.set(db, "$transaction", transaction); });
        Reflect.set(db, "$transaction", (action: (tx: Prisma.TransactionClient) => Promise<number>, options?: { maxWait?: number; timeout?: number }) => transaction(async tx => {
          pauseAfterRead(tx);
          return action(tx);
        }, options));

        calculation = recomputeResults(event.id);
        await Promise.race([read.promise, calculation.then(() => { throw new Error("Normalization did not read scores."); })]);
        let saved = false;
        save = mutation === "score"
          ? request(`/api/judge/assignments/${projects[0]}`, tokens.judge_a, "PUT", { scores: [{ criterion_id: rubric.criteria[0].id, value: 5 }] })
          : request("/api/organizer/rubric", tokens.organizer, "PUT", { event_id: event.id, name: "Reweighted", criteria: rubric.criteria.map((criterion, index) => ({ id: criterion.id, name: criterion.name, weight: index === 0 ? 3 : 1, max_score: 5 })) });
        void save.then(() => { saved = true; });
        let waiting = false;
        const deadline = Date.now() + 3000;
        while (!saved && !waiting && Date.now() < deadline) {
          const rows = await observer.$queryRaw<{ waiting: boolean }[]>`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%FROM "Event"%' AND query LIKE '%FOR UPDATE%') AS waiting`;
          waiting = rows[0].waiting;
          if (!saved && !waiting) await delay(10);
        }
        resume.resolve();
        await calculation;
        const response = await save;
        assert.equal(response.status, 200, response.text);
        restoreQueries();

        const exported = await request(`/api/export.csv?event_id=${event.id}`, tokens.organizer);
        assert.equal(exported.status, 200, exported.text);
        const result = await db.normalizedResult.findUniqueOrThrow({ where: { project_id: projects[0] } });
        const expected = mutation === "score" ? Math.SQRT1_2 : -Math.SQRT1_2 / 2;
        assert.ok(Math.abs(result.weighted_total.toNumber() - expected) < 0.000001, `Stale ${mutation} result: ${result.weighted_total}, expected ${expected}`);
        assert.ok(exported.text.includes(`"${result.weighted_total.toNumber()}"`));
        assert.ok(waiting, "The write must wait for the normalizer's event lock.");
      } finally {
        resume.resolve();
        await Promise.allSettled([calculation, save]);
        restoreQueries();
        if (eventId) {
          await db.project.deleteMany({ where: { team: { event_id: eventId } } });
          await db.event.delete({ where: { id: eventId } });
        }
      }
    });
  } finally {
    await db.$disconnect();
    await observer.$disconnect();
  }
});
