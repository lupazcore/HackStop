import { db } from "@/lib/db";
import { api, checkOrigin, success } from "@/lib/http";
import { requireRole } from "@/lib/permissions";
import { getSession, setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  return api(async () => {
    const session = await getSession();
    requireRole(session, "participant", "judge", "organizer", "admin");
    checkOrigin(request);
    await db.session.deleteMany({ where: { id: session!.id, user_id: session!.user_id } });
    const response = success({ signed_out: true });
    setSessionCookie(response, "", new Date(0));
    return response;
  });
}
