import type { Prisma } from "@prisma/client";
import { HttpError } from "./http";

export async function lockJudgingEvent(tx: Prisma.TransactionClient, eventId: string): Promise<void> {
  // Prisma has no row-lock API; all judging mutations share this lock before reading scores or rubric data.
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Event" WHERE id = ${eventId}::uuid FOR UPDATE`;
  if (!rows.length) throw new HttpError(404, "Event not found.");
}

export function assertJudgingOpen(event: { submissions_close: Date; judging_open: Date | null; judging_close: Date | null }): void {
  const now = new Date();
  if (now < (event.judging_open ?? event.submissions_close)) throw new HttpError(409, "Judging has not opened yet.");
  if (event.judging_close && now >= event.judging_close) throw new HttpError(409, "Judging has closed.");
}
