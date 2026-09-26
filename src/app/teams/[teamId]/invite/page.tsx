import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { InviteForm } from "@/components/forms/InviteForm";

export default async function Invite({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ code?: string }> }) {
  const session = await getSession();
  const { teamId } = await params; const { code } = await searchParams;
  if (!session) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/invite?code=${code || ""}`)}`);
  if (session.user.role !== "participant") redirect("/projects?access=denied");
  if (!/^[0-9a-f-]{36}$/i.test(teamId) || !code) notFound();
  const team = await db.team.findFirst({ where: { id: teamId, invite_code: code }, select: { name: true, event: { select: { name: true } }, _count: { select: { members: true } } } });
  if (!team) notFound();
  return <div className="panel mx-auto max-w-lg space-y-6"><span className="badge">Team invitation</span><h1>Join {team.name}</h1><p className="text-ink-secondary">{team.event.name} · {team._count.members} of 4 members</p>{team._count.members >= 4 ? <p role="alert" className="text-error">This team is full.</p> : <InviteForm teamId={teamId} code={code} />}</div>;
}
