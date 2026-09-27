"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormError, SubmitButton } from "./Field";
import { useMutation } from "./use-mutation";

type Criterion = { id: string; name: string; max_score: number; weight: number };
type Props = { projectId: string; criteria: Criterion[]; saved: { criterion_id: string; value: number; comment: string | null }[]; open: boolean };

export function ScoreForm({ projectId, criteria, saved, open }: Props) {
  const router = useRouter();
  const mutation = useMutation();
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(saved.map(score => [score.criterion_id, String(score.value)])));
  const [comment, setComment] = useState(saved.find(score => score.comment)?.comment ?? "");
  const [notice, setNotice] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scores = criteria.filter(criterion => values[criterion.id]).map(criterion => ({ criterion_id: criterion.id, value: Number(values[criterion.id]) }));
    const result = await mutation.send(`/api/judge/assignments/${projectId}`, "PUT", { scores, comment });
    if (result) { setNotice(result.status === "completed" ? "Review completed. You can update it until judging closes." : "Partial review saved. Return to finish the remaining criteria."); router.refresh(); }
  }
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  return <form onSubmit={save} className="panel space-y-6"><h2>Score this project</h2>{criteria.map(criterion => <div className="field" key={criterion.id}><label htmlFor={`score_${criterion.id}`}>{criterion.name} <span className="font-normal text-ink-secondary">({totalWeight ? Math.round(100 * criterion.weight / totalWeight) : 0}% weight)</span></label><select id={`score_${criterion.id}`} value={values[criterion.id] ?? ""} onChange={event => setValues(old => ({ ...old, [criterion.id]: event.target.value }))} disabled={!open}><option value="">Not scored yet</option>{Array.from({ length: criterion.max_score }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} of {criterion.max_score}</option>)}</select></div>)}<div className="field"><label htmlFor="judge_comment">Optional comment</label><textarea id="judge_comment" value={comment} onChange={event => setComment(event.target.value)} maxLength={5000} disabled={!open} /></div><FormError error={mutation.error} />{notice && <p role="status" className="rounded border border-success bg-success-light p-3 text-sm">{notice}</p>}{open ? <SubmitButton pending={mutation.pending}>Save review</SubmitButton> : <p className="text-sm text-warning">Scoring is closed for this event.</p>}</form>;
}
