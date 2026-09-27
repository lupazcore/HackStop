import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageActor } from "@/lib/page-auth";
import { ownedEvents } from "@/lib/permissions";
import { stringList, timestamp } from "@/lib/display";
import { questions } from "@/lib/events";

export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const actor = await pageActor("organizer");
  const { eventId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const event = await db.event.findFirst({ where: { id: eventId, ...ownedEvents(actor) }, include: { tracks: true } });
  if (!event) notFound();
  return <div className="space-y-12"><Link href="/organizer/events">← My events</Link><div><span className="badge">{event.submissions_close <= new Date() ? "Submissions closed" : event.submissions_open && event.submissions_open > new Date() ? "Upcoming" : "Accepting submissions"}</span><h1 className="mt-4">{event.name}</h1><Link className="button mt-6" href={`/organizer/events/${event.id}/judging`}>Manage judging</Link></div><div className="grid gap-6 md:grid-cols-2"><section className="panel space-y-4"><h2>Schedule</h2>{[["Submissions open", event.submissions_open], ["Submissions close", event.submissions_close], ["Judging opens", event.judging_open], ["Judging closes", event.judging_close]].map(([label, date]) => <p className="text-sm" key={String(label)}><span className="font-medium">{String(label)}: </span>{date instanceof Date ? timestamp(date) : "Not set"}</p>)}</section><section className="panel space-y-4"><h2>Tracks</h2><ul className="space-y-2">{event.tracks.map(track => <li key={track.id}><Link href={`/projects?track=${track.id}`}>{track.name}</Link></li>)}</ul></section><section className="panel space-y-4"><h2>Prizes</h2>{stringList(event.prizes).length ? <ul className="space-y-3">{stringList(event.prizes).map(prize => <li key={prize}>{prize}</li>)}</ul> : <p className="text-ink-secondary">No prizes configured.</p>}</section><section className="panel space-y-4"><h2>Custom questions</h2>{questions(event.custom_questions).length ? <ul className="space-y-3">{questions(event.custom_questions).map(question => <li key={question.id}>{question.label}{question.required ? " (required)" : " (optional)"}</li>)}</ul> : <p className="text-ink-secondary">No custom questions configured.</p>}</section></div></div>;
}
