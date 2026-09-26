import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync(".env")) {
  process.stdout.write(".env already exists; kept existing configuration.\n");
} else {
  let config = readFileSync(".env.example", "utf8");
  for (const key of ["POSTGRES_PASSWORD", "SEED_PASSWORD", "SEED_SESSION_SECRET"]) config = config.replace(`${key}=\n`, `${key}=${randomBytes(24).toString("hex")}\n`);
  const values = Object.fromEntries(config.trim().split(/\r?\n/).map(line => line.split("=")));
  config += `DATABASE_URL=postgresql://${values.POSTGRES_USER}:${values.POSTGRES_PASSWORD}@localhost:${values.DB_HOST_PORT}/${values.POSTGRES_DB}\n`;
  writeFileSync(".env", config, { mode: 0o600 });
  process.stdout.write("Created .env with generated local credentials. Run docker compose up --build.\n");
}
