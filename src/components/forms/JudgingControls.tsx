"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, FormError, SubmitButton } from "./Field";
import { useMutation } from "./use-mutation";

type Track = { id: string; name: string };
type Judge = { id: string; name: string; email: string; tracks: string[] };
type Project = { id: string; title: string; track_id: string };
type Criterion = { id?: string; name: string; weight: number; max_score: number };
type Props = { eventId: string; tracks: Track[]; judges: Judge[]; projects: Project[]; rubric: { name: string; criteria: Criterion[] } | null; scored: boolean };

export function JudgingControls({ eventId, tracks, judges, projects, rubric, scored }: Props) {
  const router = useRouter();
  const invite = useMutation();
  const rubricMutation = useMutation();
  const assignment = useMutation();
  const [inviteResult, setInviteResult] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState(rubric?.name ?? "Event rubric");
  const [criteria, setCriteria] = useState<Criterion[]>(rubric?.criteria.length ? rubric.criteria : [{ name: "Functionality", weight: 1, max_score: 5 }]);
  const [judgeId, setJudgeId] = useState(judges[0]?.id ?? "");
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? "");

  async function inviteJudge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await invite.send("/api/organizer/judges", "POST", { event_id: eventId, name: data.get("name"), email: data.get("email"), track_ids: data.getAll("track_ids") });
    if (result) { setInviteResult(result.temporary_password ? `Invitation created. Share this generated password with the judge: ${result.temporary_password}` : "This judge already has an account. Track access was updated."); router.refresh(); }
  }

  async function saveRubric(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await rubricMutation.send("/api/organizer/rubric", "PUT", { event_id: eventId, name, criteria });
    if (result) { setNotice("Rubric saved. Results need recalculation."); router.refresh(); }
  }

  async function assignManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await assignment.send("/api/organizer/assignments", "POST", { event_id: eventId, mode: "manual", judge_id: judgeId, project_ids: data.getAll("project_ids") });
    if (result) { setNotice(`${result.assigned} new assignments created.`); router.refresh(); }
  }

  async function assignAutomatic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await assignment.send("/api/organizer/assignments", "POST", { event_id: eventId, mode: "automatic", track_id: trackId, target_reviews: Number(data.get("target_reviews")) });
    if (result) { setNotice(`${result.assigned} new assignments created across ${result.projects} projects.`); router.refresh(); }
  }

  return <div className="space-y-8">
    {notice && <p role="status" className="rounded border border-success bg-success-light p-4 text-sm">{notice}</p>}
    <section className="panel space-y-5"><h2>Invite a judge</h2><p className="text-sm text-ink-secondary">Create access and choose the tracks this judge may review. Share the generated password securely.</p><form onSubmit={inviteJudge} className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Name" name="name" required /><Field label="Email" name="email" type="email" required /></div><fieldset><legend className="mb-2 text-sm font-medium">Assigned tracks</legend><div className="grid gap-2 md:grid-cols-2">{tracks.map(track => <label key={track.id} className="flex items-center gap-2 text-sm"><input className="h-4 w-4" type="checkbox" name="track_ids" value={track.id} />{track.name}</label>)}</div></fieldset><FormError error={invite.error} /><SubmitButton pending={invite.pending}>Invite judge</SubmitButton></form>{inviteResult && <p role="status" className="rounded border border-success bg-success-light p-4 text-sm break-all">{inviteResult}</p>}</section>
    <section className="panel space-y-5"><h2>Scoring rubric</h2><p className="text-sm text-ink-secondary">Weights are relative: a 2 weighs twice as much as a 1. Once scores exist, criteria and scales stay fixed while names and weights remain editable.</p><form onSubmit={saveRubric} className="space-y-5"><Field label="Rubric name" name="rubric_name" value={name} onChange={event => setName(event.target.value)} required />{criteria.map((criterion, index) => <div key={criterion.id ?? index} className="grid gap-3 rounded border border-border p-4 md:grid-cols-[1fr_8rem_8rem_auto]"><Field label="Criterion" name={`criterion_${index}`} value={criterion.name} onChange={event => setCriteria(old => old.map((row, at) => at === index ? { ...row, name: event.target.value } : row))} required /><Field label="Weight" name={`weight_${index}`} type="number" min="0.01" max="999.99" step="0.01" value={criterion.weight} onChange={event => setCriteria(old => old.map((row, at) => at === index ? { ...row, weight: Number(event.target.value) } : row))} required /><Field label="Max score" name={`max_${index}`} type="number" min="2" max="100" value={criterion.max_score} onChange={event => setCriteria(old => old.map((row, at) => at === index ? { ...row, max_score: Number(event.target.value) } : row))} disabled={scored} required />{!scored && <button type="button" className="self-end text-sm text-error" onClick={() => setCriteria(old => old.filter((_, at) => at !== index))}>Remove</button>}</div>)}{!scored && <button type="button" className="button-secondary" onClick={() => setCriteria(old => [...old, { name: "", weight: 1, max_score: 5 }])}>Add criterion</button>}<FormError error={rubricMutation.error} /><SubmitButton pending={rubricMutation.pending}>Save rubric</SubmitButton></form></section>
    <div className="grid gap-8 lg:grid-cols-2"><section className="panel space-y-5"><h2>Assign projects</h2><p className="text-sm text-ink-secondary">Select one qualified judge and the projects they should review.</p><form onSubmit={assignManual} className="space-y-5"><div className="field"><label htmlFor="manual_judge">Judge</label><select id="manual_judge" value={judgeId} onChange={event => setJudgeId(event.target.value)} required>{judges.map(judge => <option key={judge.id} value={judge.id}>{judge.name} ({judge.tracks.join(", ")})</option>)}</select></div><fieldset><legend className="mb-2 text-sm font-medium">Projects</legend><div className="max-h-64 space-y-2 overflow-auto">{projects.map(project => <label key={project.id} className="flex items-center gap-2 text-sm"><input className="h-4 w-4" type="checkbox" name="project_ids" value={project.id} />{project.title} ({tracks.find(track => track.id === project.track_id)?.name})</label>)}</div></fieldset><FormError error={assignment.error} /><SubmitButton pending={assignment.pending}>Assign selected</SubmitButton></form></section><section className="panel space-y-5"><h2>Balance a track</h2><p className="text-sm text-ink-secondary">Fill missing reviews across qualified judges, starting with the lightest workload.</p><form onSubmit={assignAutomatic} className="space-y-5"><div className="field"><label htmlFor="auto_track">Track</label><select id="auto_track" value={trackId} onChange={event => setTrackId(event.target.value)}>{tracks.map(track => <option key={track.id} value={track.id}>{track.name}</option>)}</select></div><Field label="Target reviews per project" name="target_reviews" type="number" min="1" max="10" defaultValue="3" required /><FormError error={assignment.error} /><SubmitButton pending={assignment.pending}>Assign automatically</SubmitButton></form></section></div>
  </div>;
}
