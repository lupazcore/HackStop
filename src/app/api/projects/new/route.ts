import { api } from "@/lib/http";
import { requireRole } from "@/lib/permissions";
import { saveProject } from "@/lib/projects";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "participant");
    return saveProject(request, actor);
  });
}
