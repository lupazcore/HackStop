import { db } from "@/lib/db";
import { api, success } from "@/lib/http";
import { galleryWhere, PUBLIC_PROJECT_INCLUDE } from "@/lib/projects";

export async function GET(request: Request) {
  return api(async () => {
    const params = new URL(request.url).searchParams;
    const filters = Object.fromEntries(["q", "track", "team", "tag"].map(key => [key, params.get(key)?.slice(0, 255) || undefined]));
    return success(await db.project.findMany({ where: galleryWhere(filters), include: PUBLIC_PROJECT_INCLUDE, orderBy: { title: "asc" } }));
  });
}
