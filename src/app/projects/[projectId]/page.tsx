import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { stringList, timestamp } from "@/lib/display";
import { questions } from "@/lib/events";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) notFound();
  const project = await db.project.findFirst({ where: { id: projectId, status: "submitted" }, include: { track: true, team: { select: { name: true, event: true } } } });
  if (!project) notFound();
  const answers = project.custom_answers && typeof project.custom_answers === "object" && !Array.isArray(project.custom_answers) ? project.custom_answers : {};
  return <div className="space-y-12"><Link href="/projects" className="text-sm">← Back to gallery</Link><div className="space-y-4"><div className="flex gap-2"><span className="badge">{project.track.name}</span>{project.is_duplicate && <span className="badge">Duplicate submission</span>}</div><h1>{project.title}</h1><p className="text-h4 text-ink-secondary">{project.tagline}</p><p className="text-sm text-ink-secondary">{project.team.name} · {project.team.event.name}{project.submitted_at && ` · Submitted ${timestamp(project.submitted_at)}`}</p></div>
    <div className="grid gap-8 lg:grid-cols-3"><section className="space-y-6 lg:col-span-2">{project.thumbnail_url && <img src={project.thumbnail_url} alt={`${project.title} preview`} className="w-full rounded-lg border border-border" referrerPolicy="no-referrer" />}<div className="panel space-y-5"><h2>About the project</h2><p className="whitespace-pre-wrap break-words text-ink-secondary">{project.summary || "No description supplied."}</p></div>{stringList(project.image_urls).length > 0 && <section className="space-y-4"><h2>Image gallery</h2><div className="grid gap-4 sm:grid-cols-2">{stringList(project.image_urls).map((image, index) => <img key={image} src={image} alt={`${project.title}, image ${index + 1}`} className="w-full rounded-lg border border-border" loading="lazy" referrerPolicy="no-referrer" />)}</div></section>}{questions(project.team.event.custom_questions).map(question => <div key={question.id} className="panel space-y-3"><h3>{question.label}</h3><p className="whitespace-pre-wrap break-words">{typeof answers[question.id] === "string" ? answers[question.id] as string : "No answer supplied."}</p></div>)}</section>
    <aside className="space-y-6"><div className="panel space-y-4"><h2 className="text-h3">Explore the build</h2>{[["Repository", project.repo_url], ["Live project", project.live_url], ["Demo video", project.demo_video_url]].map(([label, href]) => href && <a key={label} className="block text-sm" href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>)}</div><div className="panel space-y-4"><h2 className="text-h3">Technology</h2><div className="flex flex-wrap gap-2">{stringList(project.tech_tags).map(tag => <span className="badge" key={tag}>{tag}</span>)}</div>{!stringList(project.tech_tags).length && <p className="text-sm text-ink-secondary">No technology tags supplied.</p>}</div></aside></div>
  </div>;
}
