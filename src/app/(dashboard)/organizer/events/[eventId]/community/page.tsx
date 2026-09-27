import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { timestamp } from "@/lib/display";
import { pageActor } from "@/lib/page-auth";
import { ownedEvents } from "@/lib/permissions";

export default async function CommunityPage({ params }: { params: Promise<{ eventId: string }> }) {
  const actor = await pageActor("organizer", "admin");
  const { eventId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) notFound();
  const event = await db.event.findFirst({ where: { id: eventId, ...ownedEvents(actor) }, select: { id: true, name: true } });
  if (!event) notFound();
  const actions = await db.communityAudit.findMany({ where: { project: { team: { event_id: event.id } } }, select: { id: true, action: true, created_at: true, actor: { select: { name: true } }, project: { select: { title: true } } }, orderBy: { created_at: "desc" } });
  return <div className="space-y-8"><Link href={`/organizer/events/${event.id}`}>Back to event</Link><div><h1>Community activity</h1><p className="mt-2 text-ink-secondary">Votes and comments for {event.name}</p></div>{actions.length ? <ol className="space-y-3">{actions.map(action => <li className="panel text-sm" key={action.id}><strong>{action.actor.name}</strong> {action.action === "vote" ? "voted on" : "commented on"} <strong>{action.project.title}</strong><span className="ml-2 text-ink-secondary">{timestamp(action.created_at)}</span></li>)}</ol> : <p className="panel text-ink-secondary">No community activity yet.</p>}</div>;
}
