import Link from "next/link";
import type { Prisma } from "@prisma/client";
import type { PUBLIC_PROJECT_INCLUDE } from "@/lib/projects";
import { stringList } from "@/lib/display";
import { CardGlow } from "./CardGlow";

type Props = { project: Prisma.ProjectGetPayload<{ include: typeof PUBLIC_PROJECT_INCLUDE }> };
export function ProjectCard({ project }: Props) {
  return <CardGlow>
    {project.thumbnail_url && <img src={project.thumbnail_url} alt={`${project.title} thumbnail`} className="aspect-video w-full rounded-md object-cover" loading="lazy" referrerPolicy="no-referrer" />}
    <div className="flex flex-wrap items-center gap-2"><span className="badge">{project.track.name}</span>{project.is_duplicate && <span className="rounded-sm bg-warning-light px-2 py-1 text-xs font-medium text-warning">Duplicate</span>}</div>
    <div className="min-w-0"><h2 className="text-h3"><Link href={`/projects/${project.id}`} className="card-title break-words text-ink no-underline transition-colors duration-150">{project.title}</Link></h2><p className="mt-2 text-sm text-ink-secondary">by {project.team.name}</p></div>
    <p className="line-clamp-3 flex-1 text-sm text-ink-secondary">{project.tagline || project.summary || "Explore this team's submission."}</p>
    <div className="flex flex-wrap gap-2">{stringList(project.tech_tags).map(tag => <span key={tag} className="rounded-sm border border-border px-2 py-1 font-mono text-xs text-ink-secondary">{tag}</span>)}</div>
    <Link href={`/projects/${project.id}`} className="group/link inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold">View project <span aria-hidden="true" className="transition-transform duration-150 group-hover/link:translate-x-0.5">→</span></Link>
  </CardGlow>;
}
