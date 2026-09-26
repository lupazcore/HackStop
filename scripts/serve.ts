import { spawn } from "node:child_process";
import { cpSync } from "node:fs";
import { requiredEnv } from "../src/lib/env";

const development = process.argv[2] === "dev";
if (!development) cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
const argumentsList = development ? ["node_modules/next/dist/bin/next", "dev", "--port", requiredEnv("APP_PORT")] : [".next/standalone/server.js"];
const child = spawn(process.execPath, argumentsList, { stdio: "inherit", env: { ...process.env, PORT: requiredEnv("APP_PORT"), HOSTNAME: new URL(requiredEnv("APP_URL")).hostname } });
child.on("error", error => { process.stderr.write(error.message + "\n"); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
