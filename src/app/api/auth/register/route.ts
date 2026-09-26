import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { api, body, success } from "@/lib/http";
import { createSession, PUBLIC_USER } from "@/lib/session";
import { email, password, text } from "@/lib/validation";

export async function POST(request: Request) {
  return api(async () => {
    const input = await body(request);
    const data = { name: text(input.name, "Name"), email: email(input.email), password_hash: await hash(password(input.password), 12), role: "participant" as const };
    const user = await db.user.create({ data, select: PUBLIC_USER });
    return createSession(user.id, success(user, 201));
  });
}
