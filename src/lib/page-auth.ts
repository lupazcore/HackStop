import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSession } from "./session";

export async function pageActor(...roles: Role[]) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!roles.includes(session.user.role)) redirect("/projects?access=denied");
  return session.user;
}
