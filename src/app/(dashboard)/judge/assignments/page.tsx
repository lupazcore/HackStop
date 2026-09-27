import Link from "next/link";
import { db } from "@/lib/db";
import { pageActor } from "@/lib/page-auth";

export default async function JudgeAssignments() {
  const actor = await pageActor("judge");
  const assignments = await db.judgeAssignment.findMany({ where: { judge_id: actor.id, project: { status: "submitted", track: { judge_assignments: { some: { judge_id: actor.id } } } } }, include: { project: { select: { id: true, title: true, tagline: true, team: { select: { name: true, event: { select: { name: true, judging_close: true } } } }, track: { select: { name: true } } } } }, orderBy: { assigned_at: "asc" } });
  const finished = assignments.filter(assignment => assignment.status === "completed").length;
  return <div className="space-y-8"><div><h1>My reviews</h1><p className="mt-3 text-ink-secondary">{finished} of {assignments.length} assigned projects completed. Your scores are private to you and the event organizer.</p></div><div className="grid gap-5 md:grid-cols-2">{assignments.map(assignment => <article key={assignment.id} className="panel space-y-3"><span className="badge">{assignment.status.replaceAll("_", " ")}</span><h2 className="text-h3">{assignment.project.title}</h2><p className="text-sm text-ink-secondary">{assignment.project.team.name} · {assignment.project.track.name} · {assignment.project.team.event.name}</p>{assignment.project.tagline && <p className="text-sm">{assignment.project.tagline}</p>}<Link className="font-medium" href={`/judge/scoring/${assignment.project.id}`}>{assignment.status === "completed" ? "Review scores" : "Score project"}</Link></article>)}</div>{!assignments.length && <p className="panel text-ink-secondary">No projects are assigned to you yet. Ask your organizer to add you to a track and assign projects.</p>}</div>;
}
