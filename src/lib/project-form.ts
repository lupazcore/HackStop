import { db } from "./db";
import { ownedTeams, type Actor } from "./permissions";
import { questions } from "./events";

export async function formTeams(actor: Actor) {
  const teams = await db.team.findMany({ where: ownedTeams(actor), include: { event: { include: { tracks: true } } } });
  const now = new Date();
  return teams.map(team => ({ id: team.id, name: team.name, accepting: now < team.event.submissions_close && (!team.event.submissions_open || now >= team.event.submissions_open), event: { name: team.event.name, submissions_close: team.event.submissions_close.toISOString(), submissions_open: team.event.submissions_open?.toISOString() ?? null, tracks: team.event.tracks.map(track => ({ id: track.id, name: track.name })), custom_questions: questions(team.event.custom_questions) } }));
}
