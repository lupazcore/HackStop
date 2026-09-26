import Link from "next/link";
import type { Prisma } from "@prisma/client";
import type { PUBLIC_PROJECT_INCLUDE } from "@/lib/projects";
import { stringList } from "@/lib/display";

type Props = { project: Prisma.ProjectGetPayload<{ include: typeof PUBLIC_PROJECT_INCLUDE }> };
export function ProjectCard({ project }: Props) {
  return <article className="panel flex flex-col gap-5 transition-shadow hover:shadow-sm">
    {project.thumbnail_url && <img src={project.thumbnail_url} alt={`${project.title} thumbnail`} className="aspect-video w-full rounded object-cover" loading="lazy" referrerPolicy="no-referrer" />}
    <div className="flex flex-wrap items-center gap-2"><span className="badge">{project.track.name}</span>{project.is_duplicate && <span className="rounded-full bg-warning-light px-2 py-1 text-xs font-medium text-ink-secondary">Duplicate</span>}</div>
    <div><h2 className="text-h3"><Link href={`/projects/${project.id}`} className="text-ink hover:text-primary">{project.title}</Link></h2><p className="mt-2 text-sm text-ink-secondary">by {project.team.name}</p></div>
    <p className="line-clamp-3 flex-1 text-sm text-ink-secondary">{project.tagline || project.summary || "Explore this team's submission."}</p>
    <div className="flex flex-wrap gap-2">{stringList(project.tech_tags).map(tag => <span key={tag} className="rounded border border-border px-2 py-1 text-xs text-ink-secondary">{tag}</span>)}</div>
    <Link href={`/projects/${project.id}`} className="text-sm font-medium">View project <span aria-hidden="true">→</span></Link>
  </article>;
}
