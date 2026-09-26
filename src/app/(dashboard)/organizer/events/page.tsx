import Link from "next/link";
import { db } from "@/lib/db";
import { pageActor } from "@/lib/page-auth";
import { ownedEvents } from "@/lib/permissions";
import { timestamp } from "@/lib/display";
import { EventForm } from "@/components/forms/EventForm";

export default async function Events() {
  const actor = await pageActor("organizer");
  const events = await db.event.findMany({ where: ownedEvents(actor), include: { _count: { select: { tracks: true, teams: true } } }, orderBy: { created_at: "desc" } });
  return <div className="space-y-12"><div><h1>My events</h1><p className="mt-3 text-ink-secondary">Set the schedule and give teams a place to share their work.</p></div><div className="grid items-start gap-8 lg:grid-cols-2"><section className="space-y-5"><h2>Your workspace</h2>{events.map(event => <article key={event.id} className="panel space-y-3"><h3><Link href={`/organizer/events/${event.id}`}>{event.name}</Link></h3><p className="text-sm text-ink-secondary">Submissions close {timestamp(event.submissions_close)}</p><p className="text-sm">{event._count.tracks} tracks · {event._count.teams} teams</p></article>)}{!events.length && <p className="panel text-ink-secondary">No events yet. Create your first event to get started.</p>}</section><EventForm /></div></div>;
}
