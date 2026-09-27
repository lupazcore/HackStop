import { db } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { recomputeResults } from "@/lib/normalization";
import { ownedEvents, requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { uuid } from "@/lib/validation";

function csv(value: string | number | null | undefined): string {
  const plain = String(value ?? "");
  return `"${plain.replaceAll('"', '""')}"`;
}

function numbers(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
}

export async function GET(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    const selected = new URL(request.url).searchParams.get("event_id");
    const event = await db.event.findFirst({ where: { ...(selected ? { id: uuid(selected, "Event ID") } : {}), ...ownedEvents(actor) }, select: { id: true, external_id: true, rubric: { include: { criteria: { orderBy: { sort_order: "asc" } } } } }, orderBy: { created_at: "desc" } });
    if (!event) throw new HttpError(404, "Event not found in your account.");
    let results = await db.normalizedResult.findMany({ where: { project: { team: { event_id: event.id } } }, include: { project: { select: { external_id: true, title: true, is_duplicate: true, team: { select: { name: true } }, track: { select: { name: true } } } } }, orderBy: { rank: "asc" } });
    const submittedCount = await db.project.count({ where: { team: { event_id: event.id }, status: "submitted" } });
    if (results.length !== submittedCount) {
      await recomputeResults(event.id);
      results = await db.normalizedResult.findMany({ where: { project: { team: { event_id: event.id } } }, include: { project: { select: { external_id: true, title: true, is_duplicate: true, team: { select: { name: true } }, track: { select: { name: true } } } } }, orderBy: { rank: "asc" } });
    }
    const criteria = event.rubric?.criteria.map(criterion => criterion.name) ?? [];
    const header = ["project_id", "title", "team_name", "track", "review_count", ...criteria.flatMap(name => [`${name}_raw_avg`, `${name}_normalized`]), "weighted_total", "rank"];
    const rows = results.filter(result => result.rank !== null && !result.project.is_duplicate).map(result => {
      const raw = numbers(result.raw_avg);
      const normalized = numbers(result.criterion_scores);
      return [result.project.external_id ?? result.project_id, result.project.title, result.project.team.name, result.project.track.name, result.review_count, ...criteria.flatMap(name => [raw[name], normalized[name]]), result.weighted_total.toNumber(), result.rank].map(csv).join(",");
    });
    return new Response([header.map(csv).join(","), ...rows].join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="results-${event.external_id ?? event.id}.csv"` } });
  });
}
