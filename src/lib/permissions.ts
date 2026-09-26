import type { Role } from "@prisma/client";
import type { getSession } from "./session";
import { HttpError } from "./http";

type Session = Awaited<ReturnType<typeof getSession>>;
export type Actor = NonNullable<Session>["user"];

export function requireRole(session: Session, ...roles: Role[]): Actor {
  if (!session) throw new HttpError(401, "Please sign in to continue.");
  if (!roles.includes(session.user.role)) throw new HttpError(403, "Your role cannot perform this action.");
  return session.user;
}

export function requireSelf(actor: Actor, ownerId: string): void {
  if (actor.id !== ownerId) throw new HttpError(403, "This request does not belong to your account.");
}

export function ownedEvents(actor: Actor) {
  return actor.role === "admin" ? {} : { organizer_id: actor.id };
}

export function ownedTeams(actor: Actor) {
  return { members: { some: { user_id: actor.id } } };
}
