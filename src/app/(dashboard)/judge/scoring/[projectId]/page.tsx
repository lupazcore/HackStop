import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreForm } from "@/components/forms/ScoreForm";
import { StatusBadge } from "@/components/StatusBadge";
import { db } from "@/lib/db";
import { pageActor } from "@/lib/page-auth";

export default async function ScoreProject({ params }: { params: Promise<{ projectId: string }> }) {
  const actor = await pageActor("judge");
  const { projectId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) notFound();
  const assignment = await db.judgeAssignment.findFirst({
    where: { judge_id: actor.id, project_id: projectId, project: { status: "submitted", track: { judge_assignments: { some: { judge_id: actor.id } } } } },
    include: {
      project: { include: {
        team: { include: {
          event: { include: {
            rubric: { include: {
              criteria: { orderBy: { sort_order: "asc" } }
            } }
          } }
        } },
        track: true
      } },
      scores: { where: { judge_id: actor.id } }
    }
  });
  if (!assignment) notFound();
  const project = assignment.project;
  const event = project.team.event;
  const now = new Date();
  const open = now >= (event.judging_open ?? event.submissions_close) && (!event.judging_close || now < event.judging_close);
  const queue = await db.judgeAssignment.findMany({ where: { judge_id: actor.id, project: { status: "submitted", track: { judge_assignments: { some: { judge_id: actor.id } } } } }, select: { project_id: true }, orderBy: { assigned_at: "asc" } });
  const position = queue.findIndex(item => item.project_id === projectId);
  return <div className="space-y-8">
    <Link href="/judge/assignments">← My reviews</Link>
    <div><StatusBadge status={assignment.status} /><h1 className="mt-4 break-words">{project.title}</h1><p className="mt-3 text-ink-secondary">{project.team.name} · {project.track.name} · {event.name}</p></div>
    <nav aria-label="Review queue" className="flex flex-wrap justify-between gap-4 border-y border-border py-3 text-sm">{position > 0 ? <Link href={`/judge/scoring/${queue[position - 1].project_id}`}>← Previous project</Link> : <span />}{position >= 0 && position < queue.length - 1 ? <Link href={`/judge/scoring/${queue[position + 1].project_id}`}>Next project →</Link> : <span />}</nav>
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
      <section className="panel min-w-0 space-y-4"><h2>Project details</h2>{project.tagline && <p className="font-medium">{project.tagline}</p>}{project.summary && <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink-secondary">{project.summary}</p>}<div className="flex flex-wrap gap-4 text-sm">{project.repo_url && <a href={project.repo_url} target="_blank" rel="noreferrer">Repository</a>}{project.live_url && <a href={project.live_url} target="_blank" rel="noreferrer">Live project</a>}{project.demo_video_url && <a href={project.demo_video_url} target="_blank" rel="noreferrer">Demo video</a>}</div></section>
      <ScoreForm projectId={projectId} criteria={event.rubric?.criteria.map(criterion => ({ id: criterion.id, name: criterion.name, max_score: criterion.max_score, weight: criterion.weight.toNumber() })) ?? []} saved={assignment.scores.map(score => ({ criterion_id: score.criterion_id, value: score.value, comment: score.comment }))} open={open} />
    </div>
  </div>;
}
