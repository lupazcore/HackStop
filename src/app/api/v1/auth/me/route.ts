import { api, HttpError, success } from "@/lib/http";
import { getSession } from "@/lib/session";

export async function GET() {
  return api(async () => {
    const session = await getSession();
    if (!session) throw new HttpError(401, "Sign in to access your profile.");
    return success(session.user);
  });
}
