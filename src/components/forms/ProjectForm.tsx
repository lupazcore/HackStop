"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/lib/events";
import { Field, TextField, FormError } from "./Field";
import { useMutation } from "./use-mutation";

export type ProjectValues = { id: string; team_id: string; track_id: string; title: string; tagline: string | null; summary: string | null; thumbnail_url: string | null; image_urls: string[]; demo_video_url: string | null; repo_url: string | null; live_url: string | null; tech_tags: string[]; custom_answers: Record<string, string>; status: string };
export type FormTeam = { id: string; name: string; accepting: boolean; event: { name: string; submissions_close: string; submissions_open: string | null; tracks: { id: string; name: string }[]; custom_questions: Question[] } };
export function ProjectForm({ teams, project }: { teams: FormTeam[]; project?: ProjectValues }) {
  const mutation = useMutation(); const router = useRouter();
  const [teamId, setTeamId] = useState(project?.team_id ?? teams[0]?.id ?? "");
  const team = teams.find(item => item.id === teamId);
  const closed = !team?.accepting;
  return <form className="space-y-8" onSubmit={async event => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const lines = (name: string) => String(values.get(name) || "").split("\n").map(line => line.trim()).filter(Boolean);
    const customAnswers = Object.fromEntries((team?.event.custom_questions ?? []).map(question => [question.id, values.get(`question_${question.id}`) ?? ""]));
    const input = { ...Object.fromEntries(values), team_id: teamId, image_urls: lines("image_urls"), tech_tags: String(values.get("tech_tags") || "").split(",").map(tag => tag.trim()).filter(Boolean), custom_answers: customAnswers, status: submitter?.value ?? "draft" };
    if (await mutation.send(project ? `/api/projects/${project.id}` : "/api/projects/new", project ? "PUT" : "POST", input)) { router.push("/participant/submissions?saved=1"); router.refresh(); }
  }}>
    <div className="panel space-y-5"><div className="field"><label htmlFor="team_id">Team and event</label><select id="team_id" name="team_id" value={teamId} disabled={Boolean(project)} onChange={event => setTeamId(event.target.value)}>{teams.map(team => <option key={team.id} value={team.id}>{team.name} · {team.event.name}</option>)}</select></div>{team && <p className="text-sm text-ink-secondary">Submission deadline: {new Date(team.event.submissions_close).toLocaleString()} (your timezone)</p>}{closed && <p role="status" className="rounded border border-border bg-warning-light p-4 text-sm">This event is not accepting submissions. Your saved project is read-only.</p>}</div>
    <fieldset disabled={closed || mutation.pending} className="panel space-y-5"><legend className="px-2 text-h3">Project details</legend>
      <Field label="Title" name="title" defaultValue={project?.title} required maxLength={255} /><Field label="Tagline" name="tagline" defaultValue={project?.tagline ?? ""} maxLength={500} /><TextField label="Description" name="summary" defaultValue={project?.summary ?? ""} maxLength={50000} />
      <div className="field"><label htmlFor="track_id">Track</label><select key={teamId} id="track_id" name="track_id" required defaultValue={project?.track_id ?? ""}><option value="">Choose a track</option>{team?.event.tracks.map(track => <option key={track.id} value={track.id}>{track.name}</option>)}</select></div>
      <Field label="Technology tags" name="tech_tags" defaultValue={project?.tech_tags.join(", ")} hint="Separate tags with commas." maxLength={1500} />
    </fieldset>
    <fieldset disabled={closed || mutation.pending} className="panel space-y-5"><legend className="px-2 text-h3">Media and links</legend>
      <Field label="Thumbnail URL" name="thumbnail_url" type="url" defaultValue={project?.thumbnail_url ?? ""} maxLength={2048} /><TextField label="Image gallery URLs (one per line)" name="image_urls" defaultValue={project?.image_urls.join("\n")} maxLength={41000} /><Field label="Demo video URL" name="demo_video_url" type="url" defaultValue={project?.demo_video_url ?? ""} maxLength={2048} /><Field label="Repository URL" name="repo_url" type="url" defaultValue={project?.repo_url ?? ""} maxLength={2048} /><Field label="Live project URL" name="live_url" type="url" defaultValue={project?.live_url ?? ""} maxLength={2048} />
    </fieldset>
    {Boolean(team?.event.custom_questions.length) && <fieldset disabled={closed || mutation.pending} className="panel space-y-5"><legend className="px-2 text-h3">Event questions</legend><p className="text-sm text-ink-secondary">Answers are public when you submit. Required questions may be left blank in a draft.</p>{team?.event.custom_questions.map(question => <TextField key={`${teamId}-${question.id}`} label={`${question.label}${question.required ? " (required for submission)" : ""}`} name={`question_${question.id}`} maxLength={5000} defaultValue={project?.custom_answers[question.id] ?? ""} />)}</fieldset>}
    <FormError error={mutation.error} /><div className="flex flex-wrap gap-3"><button type="submit" value="draft" className="button-secondary" disabled={closed || mutation.pending}>{mutation.pending ? "Saving..." : "Save as draft"}</button><button type="submit" value="submitted" className="button" disabled={closed || mutation.pending}>{mutation.pending ? "Saving..." : project?.status === "submitted" ? "Update submission" : "Submit project"}</button></div><p className="text-sm text-ink-secondary">Drafts are private to your team. Submitted projects appear in the public gallery and can be edited until the deadline.</p>
  </form>;
}
