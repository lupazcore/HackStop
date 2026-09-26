import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { galleryWhere, PUBLIC_PROJECT_INCLUDE } from "@/lib/projects";
import { ProjectCard } from "@/components/ProjectCard";

type Filters = { q?: string; track?: string; team?: string; tag?: string; access?: string };
export default async function Gallery({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams;
  const validTrack = filters.track && /^[0-9a-f-]{36}$/i.test(filters.track) ? filters.track : undefined;
  const [projects, tracks] = await Promise.all([
    db.project.findMany({ where: galleryWhere({ ...filters, track: validTrack }), include: PUBLIC_PROJECT_INCLUDE, orderBy: [{ title: "asc" }, { submitted_at: "asc" }] }),
    db.track.findMany({ orderBy: { name: "asc" }, include: { event: { select: { name: true } } } }),
  ]);
  return <div className="space-y-12">
    <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="mb-3 text-xs font-medium uppercase tracking-widest text-ink-secondary">Built by the community</p><h1>Project gallery</h1><p className="mt-3 max-w-2xl text-ink-secondary">Explore what teams are building. Discover ideas, browse tracks, and look inside each project.</p></div><Link className="button-secondary" href="/participant/submissions">Your submission</Link></div>
    {filters.access === "denied" && <p role="alert" className="rounded border border-error bg-error-light p-4 text-error">Your role cannot access that workspace.</p>}
    <section aria-label="Browse projects" className="space-y-6">
      <form action="/projects" className="panel grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="field sm:col-span-2"><label htmlFor="q">Search projects</label><div className="relative"><Search size={18} className="absolute left-3 top-3 text-ink-secondary" aria-hidden="true" /><input className="pl-10" id="q" name="q" defaultValue={filters.q} placeholder="Search title, description, or team" maxLength={255} /></div></div>
        <div className="field"><label htmlFor="track">Track</label><select id="track" name="track" defaultValue={validTrack ?? ""}><option value="">All tracks</option>{tracks.map(track => <option key={track.id} value={track.id}>{track.name} · {track.event.name}</option>)}</select></div>
        <div className="field"><label htmlFor="tag">Technology tag</label><input id="tag" name="tag" defaultValue={filters.tag} placeholder="Exact tag, e.g. TypeScript" maxLength={50} /></div>
        <div className="field sm:col-span-2"><label htmlFor="team">Team name</label><input id="team" name="team" defaultValue={filters.team} placeholder="Filter by team" maxLength={255} /></div><div className="flex items-end gap-3"><button className="button" type="submit">Apply filters</button><Link href="/projects" className="button-secondary">Clear</Link></div>
      </form>
      <p className="text-sm text-ink-secondary">{projects.length} {projects.length === 1 ? "project" : "projects"}{filters.q ? ` matching “${filters.q}”` : " to explore"}</p>
      {projects.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{projects.map(project => <ProjectCard key={project.id} project={project} />)}</div> : <div className="panel space-y-3"><h2 className="text-h3">No projects found</h2><p className="text-ink-secondary">Try another search or clear your filters. Draft projects appear here once submitted.</p></div>}
    </section>
  </div>;
}
