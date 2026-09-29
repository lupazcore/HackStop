"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormError, SubmitButton } from "./Field";
import { useMutation } from "./use-mutation";
import { ThemedSelect } from "./ThemedSelect";

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
  return <form onSubmit={save} className="panel space-y-6 border-t-[3px] border-t-primary"><h2>Score this project</h2>{criteria.map(criterion => <ThemedSelect key={criterion.id} id={`score_${criterion.id}`} label={<>{criterion.name} <span className="font-normal text-ink-secondary">({totalWeight ? Math.round(100 * criterion.weight / totalWeight) : 0}% weight)</span></>} value={values[criterion.id] ?? ""} onValueChange={value => setValues(old => ({ ...old, [criterion.id]: value }))} disabled={!open} triggerClassName={values[criterion.id] ? "border-primary bg-primary-light" : undefined} options={[{ value: "", label: "Not scored yet" }, ...Array.from({ length: criterion.max_score }, (_, index) => ({ value: String(index + 1), label: `${index + 1} of ${criterion.max_score}` }))]} />)}<div className="field"><label htmlFor="judge_comment">Optional comment</label><textarea id="judge_comment" value={comment} onChange={event => setComment(event.target.value)} maxLength={5000} disabled={!open} /></div><FormError error={mutation.error} />{notice && <p role="status" className="rounded-sm border border-success bg-success-light p-3 text-sm text-success">{notice}</p>}{open ? <SubmitButton pending={mutation.pending}>Save review</SubmitButton> : <p className="rounded-sm bg-warning-light p-3 text-sm text-warning">Scoring is closed for this event.</p>}</form>;
}
