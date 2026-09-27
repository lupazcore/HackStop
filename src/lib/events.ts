import { HttpError } from "./http";
import { date, strings, text } from "./validation";

export type Question = { id: string; label: string; required: boolean };
export function questions(value: unknown): Question[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) throw new HttpError(400, "Custom questions must be a list of at most 20 questions.");
  const result = value.map((item: unknown) => {
    if (!item || typeof item !== "object" || !("id" in item) || !("label" in item) || !("required" in item) || typeof item.required !== "boolean") throw new HttpError(400, "Each question needs an id, label and required flag.");
    const id = text(item.id, "Question id", 50);
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new HttpError(400, "Question ids may contain letters, numbers, underscores and hyphens.");
    if (["__proto__", "prototype", "constructor"].includes(id)) throw new HttpError(400, "That question id is reserved. Choose another id.");
    return { id, label: text(item.label, "Question", 500), required: item.required };
  });
  if (new Set(result.map(q => q.id)).size !== result.length) throw new HttpError(400, "Question ids must be unique.");
  return result;
}

export function eventInput(input: Record<string, unknown>) {
  const submissionsClose = date(input.submissions_close, "Submission deadline", true)!;
  const submissionsOpen = date(input.submissions_open, "Submissions open");
  const judgingOpen = date(input.judging_open, "Judging open");
  const judgingClose = date(input.judging_close, "Judging close");
  const votingOpens = date(input.voting_opens, "Voting opens");
  const votingCloses = date(input.voting_closes, "Voting closes");
  if (submissionsOpen && submissionsOpen >= submissionsClose) throw new HttpError(400, "Submissions must open before they close.");
  if (judgingOpen && judgingOpen < submissionsClose) throw new HttpError(400, "Judging cannot open before submissions close.");
  if (judgingClose && judgingClose <= (judgingOpen ?? submissionsClose)) throw new HttpError(400, "Judging must close after it opens and after submissions close.");
  if (Boolean(votingOpens) !== Boolean(votingCloses)) throw new HttpError(400, "Set both voting dates or leave both empty.");
  if (votingOpens && votingCloses && votingOpens >= votingCloses) throw new HttpError(400, "Voting must close after it opens.");
  const tracks = strings(input.tracks, "Tracks", 30);
  if (!tracks.length) throw new HttpError(400, "Add at least one track.");
  return {
    name: text(input.name, "Event name"), submissions_open: submissionsOpen, submissions_close: submissionsClose,
    judging_open: judgingOpen, judging_close: judgingClose, voting_opens: votingOpens, voting_closes: votingCloses, prizes: strings(input.prizes, "Prizes", 30, 500),
    custom_questions: questions(input.custom_questions), tracks: { create: tracks.map(name => ({ name })) },
  };
}
