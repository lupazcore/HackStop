import { db } from "@/lib/db";
import { api, HttpError, success } from "@/lib/http";
import { ownedTeams, requireRole } from "@/lib/permissions";
import { saveProject, PUBLIC_PROJECT_INCLUDE } from "@/lib/projects";
import { getSession } from "@/lib/session";
import { uuid } from "@/lib/validation";

type Context = { params: Promise<{ projectId: string }> };
export async function GET(_request: Request, context: Context) {
  return api(async () => {
    const actor = requireRole(await getSession(), "participant");
    const project = await db.project.findFirst({ where: { id: uuid((await context.params).projectId), team: ownedTeams(actor) }, include: PUBLIC_PROJECT_INCLUDE });
    if (!project) throw new HttpError(404, "Project not found in your team.");
    return success(project);
  });
}

export async function PUT(request: Request, context: Context) {
  return api(async () => {
    const actor = requireRole(await getSession(), "participant");
    return saveProject(request, actor, (await context.params).projectId);
  });
}
