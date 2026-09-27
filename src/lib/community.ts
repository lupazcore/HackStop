import type { Prisma } from "@prisma/client";
import { requiredEnv } from "./env";

export function hourlyLimit(name: "VOTE_RATE_LIMIT_PER_HOUR" | "COMMENT_RATE_LIMIT_PER_HOUR"): number {
  const value = Number(requiredEnv(name));
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  return value;
}

export function hourAgo(now: Date): Date {
  return new Date(now.getTime() - 60 * 60 * 1000);
}

export function votingIsOpen(event: { voting_opens: Date | null; voting_closes: Date | null }, now: Date): boolean {
  return Boolean(event.voting_opens && event.voting_closes && event.voting_opens <= now && now < event.voting_closes);
}

export async function lockCommunityActor(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
}
