import { createHmac } from "node:crypto";
import { requiredEnv } from "./env";

export function seedTokens() {
  const secret = requiredEnv("SEED_SESSION_SECRET");
  if (secret.length < 32) throw new Error("SEED_SESSION_SECRET must contain at least 32 characters.");
  const token = (prefix: string) => `${prefix}_${createHmac("sha256", secret).update(prefix).digest("hex")}`;
  return { organizer: token("org"), judge_a: token("jdg_a"), judge_b: token("jdg_b"), participant: token("prt") };
}
