import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { db } from "./db";
import { requiredEnv } from "./env";

export const PUBLIC_USER = { id: true, name: true, email: true, role: true } as const;
export async function getSession() {
  const token = (await cookies()).get("session")?.value;
  if (!token || token.length > 255) return null;
  const session = await db.session.findUnique({ where: { token }, include: { user: { select: PUBLIC_USER } } });
  return session && session.expires_at > new Date() ? session : null;
}

export function sessionExpiry(): Date { return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); }

export function setSessionCookie(response: NextResponse, token: string, expires: Date) {
  response.cookies.set("session", token, { httpOnly: true, sameSite: "lax", path: "/", secure: new URL(requiredEnv("APP_URL")).protocol === "https:", expires });
}

export async function createSession(userId: string, response: NextResponse) {
  const token = randomBytes(32).toString("hex");
  const expires = sessionExpiry();
  await db.session.create({ data: { token, user_id: userId, expires_at: expires } });
  setSessionCookie(response, token, expires);
  return response;
}
