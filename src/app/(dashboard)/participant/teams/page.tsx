import Link from "next/link";
import { db } from "@/lib/db";
import { pageActor } from "@/lib/page-auth";
import { ownedTeams } from "@/lib/permissions";
import { requiredEnv } from "@/lib/env";
import { TeamForm } from "@/components/forms/TeamForm";

export default async function Teams() {
  const actor = await pageActor("participant");
  const [teams, events] = await Promise.all([db.team.findMany({ where: ownedTeams(actor), include: { event: true, members: { include: { user: { select: { name: true } } } } } }), db.event.findMany({ select: { id: true, name: true }, orderBy: { created_at: "desc" } })]);
  return <div className="space-y-12"><div><h1>My teams</h1><p className="mt-3 text-ink-secondary">Build together. Share an invite link to bring your teammates in.</p></div><div className="grid items-start gap-8 lg:grid-cols-2"><section className="space-y-6">{teams.map(team => <article className="panel space-y-5" key={team.id}><div><span className="badge">{team.event.name}</span><h2 className="mt-4">{team.name}</h2></div><ul className="space-y-2 text-sm">{team.members.map(member => <li key={member.id}>{member.user.name} <span className="text-ink-secondary">· {member.role}</span></li>)}</ul><p className="text-sm text-ink-secondary">{team.members.length} of 4 members</p><div className="field"><label htmlFor={`invite-${team.id}`}>Team invite link</label><input id={`invite-${team.id}`} readOnly value={new URL(`/teams/${team.id}/invite?code=${team.invite_code}`, requiredEnv("APP_URL")).href} /></div><Link className="button-secondary" href="/participant/submissions">Manage submission</Link></article>)}{!teams.length && <p className="panel text-ink-secondary">You have no team yet. Create one or open an invite link from a teammate.</p>}</section><TeamForm events={events.filter(event => !teams.some(team => team.event_id === event.id))} /></div></div>;
}
