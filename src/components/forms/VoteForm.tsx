"use client";
import { useRouter } from "next/navigation";
import { FormError, SubmitButton } from "./Field";
import { useMutation } from "./use-mutation";

export function VoteForm({ projectId }: { projectId: string }) {
  const mutation = useMutation();
  const router = useRouter();
  return <form className="flex flex-wrap items-end gap-3" onSubmit={async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (await mutation.send("/api/votes", "POST", { project_id: projectId, value: Number(data.get("value")) })) router.refresh();
  }}>
    <label className="field"><span>Rating</span><select name="value" defaultValue="5" aria-label="Rating from 1 to 5">{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    <SubmitButton pending={mutation.pending}>Cast vote</SubmitButton>
    <FormError error={mutation.error} />
  </form>;
}
