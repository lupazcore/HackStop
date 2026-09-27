import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { requiredEnv } from "../src/lib/env";
import { seedTokens } from "../src/lib/seed-config";

type ComposeConfig = { services?: { app?: { environment?: Record<string, string> } } };
const compose = JSON.parse(execFileSync("docker", ["compose", "config", "--format", "json"], { encoding: "utf8" })) as ComposeConfig;
const appEnvironment = compose.services?.app?.environment;
if (!appEnvironment?.APP_URL || !appEnvironment.SEED_SESSION_SECRET) throw new Error("Compose must supply APP_URL and SEED_SESSION_SECRET.");
process.env.APP_URL = appEnvironment.APP_URL;
process.env.SEED_SESSION_SECRET = appEnvironment.SEED_SESSION_SECRET;
const config = `[portal]\nbase_url = ${JSON.stringify(requiredEnv("APP_URL"))}\n\n[tiers]\nclaimed = ["T1", "T2"]\npitch = "Self-hosted submissions, judge assignments, weighted scoring, normalized rankings and CSV export."\n\n[auth]\n${Object.entries(seedTokens()).map(([key, token]) => `${key} = "Cookie: session=${token}"`).join("\n")}\n\n[routes]\ngallery = "/projects"\nsubmit = "/projects/new"\njudge_scores = "/api/judge/scores"\npeer_scores = "/api/judge/scores?judge=judge_a"\ncsv_export = "/api/export.csv"\n`;
writeFileSync(".dogfood.toml", config, { mode: 0o600 });
process.stdout.write("Wrote .dogfood.toml with T1 and T2 claimed and all four seeded session headers.\n");
