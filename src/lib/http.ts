import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requiredEnv } from "./env";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api(action: () => Promise<Response>): Promise<Response> {
  try { return await action(); }
  catch (error: unknown) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return NextResponse.json({ error: "This record already exists." }, { status: 409 });
      if (error.code === "P2034") return NextResponse.json({ error: "Another request changed this record. Please retry." }, { status: 409 });
      if (error.code === "P2028") return NextResponse.json({ error: "The database is busy. Please retry shortly." }, { status: 503 });
      if (error.code === "P2025") return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    process.stderr.write(JSON.stringify({ level: "error", message: error instanceof Error ? error.message : "Unknown server error" }) + "\n");
    return NextResponse.json({ error: "The server could not complete this request. Please retry." }, { status: 500 });
  }
}

export function checkOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(requiredEnv("APP_URL")).origin) throw new HttpError(403, "Request origin is not allowed.");
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  checkOrigin(request);
  if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(400, "Send a JSON request body.");
  const raw = await request.text();
  if (raw.length > 100_000) throw new HttpError(413, "Request body is too large.");
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch { throw new HttpError(400, "Request body must be valid JSON."); }
  throw new HttpError(400, "Request body must be a JSON object.");
}

export function success(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}
