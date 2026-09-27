import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VoteForm } from "@/components/forms/VoteForm";
import { votingIsOpen } from "@/lib/community";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export default async function VotingPage({ searchParams }: { searchParams: Promise<{ event_id?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?next=%2Fvote");
  const eventId = (await searchParams).event_id;
  if (!eventId) {
    const events = await db.event.findMany({ where: { voting_opens: { lte: new Date() }, voting_closes: { gt: new Date() } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
    return <div className="space-y-8"><h1>Community voting</h1><p className="text-ink-secondary">Choose an event to view its ballot.</p>{events.length ? <ul className="space-y-3">{events.map(event => <li key={event.id}><Link href={`/vote?event_id=${event.id}`}>{event.name}</Link></li>)}</ul> : <p className="panel">No event is accepting votes right now.</p>}</div>;
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) notFound();
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true, name: true, organizer_id: true, voting_opens: true, voting_closes: true } });
  if (!event) notFound();
  if (!votingIsOpen(event, new Date())) return <div className="space-y-4"><h1>{event.name}</h1><p>Voting is not open for this event.</p></div>;
  const [projects, votes, judgeAssignment] = await Promise.all([
    db.project.findMany({ where: { status: "submitted", is_duplicate: false, team: { event_id: event.id } }, select: { id: true, title: true, tagline: true, team: { select: { name: true } }, track: { select: { name: true } } } }),
    db.communityVote.findMany({ where: { user_id: session.user.id, project: { team: { event_id: event.id } } }, select: { project_id: true, value: true } }),
    session.user.role === "judge" ? db.judgeTrackAssignment.findFirst({ where: { judge_id: session.user.id, track: { event_id: event.id } }, select: { id: true } }) : Promise.resolve(null),
  ]);
  const canVote = event.organizer_id !== session.user.id && !judgeAssignment;
  const ownVotes = new Map(votes.map(vote => [vote.project_id, vote.value]));
  const ballot = projects.map(project => ({ project, order: createHash("sha256").update(session.id).update(project.id).digest("hex") })).sort((a, b) => a.order.localeCompare(b.order));
  return <div className="space-y-8"><div><p className="mb-3 text-xs font-medium uppercase tracking-widest text-ink-secondary">Community ballot</p><h1>{event.name}</h1><p className="mt-3 text-ink-secondary">Rate each project once from 1 to 5. The order stays the same throughout this session.</p>{!canVote && <p className="mt-3 text-ink-secondary">Organizers and assigned judges cannot vote on this event.</p>}</div><ol className="grid gap-5 md:grid-cols-2">{ballot.map(({ project }) => <li className="panel space-y-4" key={project.id} data-project-id={project.id}><div><span className="badge">{project.track.name}</span><h2 className="mt-3 text-h3"><Link href={`/projects/${project.id}`}>{project.title}</Link></h2><p className="text-sm text-ink-secondary">by {project.team.name}</p>{project.tagline && <p className="mt-2 text-sm">{project.tagline}</p>}</div>{ownVotes.has(project.id) ? <p className="font-medium">Your rating: {ownVotes.get(project.id)} of 5</p> : canVote ? <VoteForm projectId={project.id} /> : null}</li>)}</ol></div>;
}
