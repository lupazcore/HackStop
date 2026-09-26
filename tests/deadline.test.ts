import assert from "node:assert/strict";
import { test } from "node:test";
import { requireOpen } from "../src/lib/deadline";
import { HttpError } from "../src/lib/http";
import { requireSelf, requireRole, ownedTeams } from "../src/lib/permissions";

test("submission window includes opening but excludes the exact close timestamp", () => {
  const event = { submissions_open: new Date("2026-01-01T00:00:00Z"), submissions_close: new Date("2026-01-02T00:00:00Z") };
  assert.throws(() => requireOpen(event, new Date("2025-12-31T23:59:59.999Z")), (e: unknown) => e instanceof HttpError && e.status === 403);
  requireOpen(event, event.submissions_open);
  requireOpen(event, new Date("2026-01-01T23:59:59.999Z"));
  assert.throws(() => requireOpen(event, event.submissions_close), (e: unknown) => e instanceof HttpError && e.status === 403);
});

test("ownership is bound to the authenticated identity, independent of role", () => {
  const actor = { id: "owner", name: "Owner", email: "owner@example.org", role: "judge" as const };
  requireSelf(actor, "owner");
  assert.throws(() => requireSelf(actor, "peer"), (e: unknown) => e instanceof HttpError && e.status === 403);
  assert.deepEqual(ownedTeams(actor), { members: { some: { user_id: "owner" } } });
  assert.throws(() => requireRole(null, "judge"), (e: unknown) => e instanceof HttpError && e.status === 401);
});
