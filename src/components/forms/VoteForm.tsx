"use client";
import { useRouter } from "next/navigation";
import { FormError, SubmitButton } from "./Field";
import { useMutation } from "./use-mutation";
import { ThemedSelect } from "./ThemedSelect";

export function VoteForm({ projectId }: { projectId: string }) {
  const mutation = useMutation();
  const router = useRouter();
  return <form className="flex flex-wrap items-end gap-3" onSubmit={async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (await mutation.send("/api/votes", "POST", { project_id: projectId, value: Number(data.get("value")) })) router.refresh();
  }}>
    <div className="min-w-32"><ThemedSelect id={`vote_${projectId}`} name="value" label="Rating" ariaLabel="Rating from 1 to 5" defaultValue="5" options={[1, 2, 3, 4, 5].map(value => ({ value: String(value), label: String(value) }))} /></div>
    <SubmitButton pending={mutation.pending}>Cast vote</SubmitButton>
    <FormError error={mutation.error} />
  </form>;
}
