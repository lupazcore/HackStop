import Link from "next/link";
import { db } from "@/lib/db";
import { pageActor } from "@/lib/page-auth";
import { ownedTeams } from "@/lib/permissions";
import { timestamp } from "@/lib/display";

export default async function Submissions({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const actor = await pageActor("participant");
  const projects = await db.project.findMany({ where: { team: ownedTeams(actor) }, include: { team: { include: { event: true } }, track: true }, orderBy: { updated_at: "desc" } });
  return <div className="space-y-12"><div className="flex flex-wrap items-end justify-between gap-5"><div><h1>My submissions</h1><p className="mt-3 text-ink-secondary">Draft, refine, and share your team&apos;s work.</p></div><Link className="button" href="/participant/submissions/new">New project</Link></div>{(await searchParams).saved && <p role="status" className="rounded border border-border bg-success-light p-4 text-sm">Your project was saved.</p>}<div className="grid gap-6 md:grid-cols-2">{projects.map(project => <article key={project.id} className="panel space-y-4"><div className="flex gap-2"><span className="badge">{project.status}</span>{project.is_duplicate && <span className="badge">Duplicate</span>}</div><h2 className="text-h3">{project.title}</h2><p className="text-sm text-ink-secondary">{project.team.name} · {project.track.name}</p><p className="text-sm text-ink-secondary">Deadline: {timestamp(project.team.event.submissions_close)}</p><div className="flex gap-4"><Link href={`/participant/submissions/${project.id}/edit`} className="text-sm font-medium">{project.team.event.submissions_close <= new Date() ? "View saved submission" : "Edit project"}</Link>{project.status === "submitted" && <Link className="text-sm" href={`/projects/${project.id}`}>View in gallery</Link>}</div></article>)}</div>{!projects.length && <p className="panel text-ink-secondary">No projects yet. Create a team, then start a project submission.</p>}</div>;
}
