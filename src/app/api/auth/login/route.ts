import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { api, body, HttpError, success } from "@/lib/http";
import { createSession } from "@/lib/session";
import { email } from "@/lib/validation";

export async function POST(request: Request) {
  return api(async () => {
    const input = await body(request);
    const address = email(input.email);
    if (typeof input.password !== "string" || !input.password.length || Buffer.byteLength(input.password, "utf8") > 72) throw new HttpError(400, "Enter a password of at most 72 UTF-8 bytes.");
    const secret = input.password;
    const user = await db.user.findUnique({ where: { email: address } });
    if (!user || !(await compare(secret, user.password_hash))) throw new HttpError(401, "Email or password is incorrect.");
    return createSession(user.id, success({ id: user.id, name: user.name, email: user.email, role: user.role }));
  });
}
