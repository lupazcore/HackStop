"use client";
import { useRouter } from "next/navigation";
import { FormError, SubmitButton } from "./Field";
import { useMutation } from "./use-mutation";

export function CommentForm({ projectId }: { projectId: string }) {
  const mutation = useMutation();
  const router = useRouter();
  return <form className="space-y-3" onSubmit={async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (await mutation.send(`/api/projects/${projectId}/comments`, "POST", { body: data.get("body") })) { form.reset(); router.refresh(); }
  }}>
    <label className="field"><span>Your comment</span><textarea name="body" maxLength={2000} required rows={4} /></label>
    <FormError error={mutation.error} /><SubmitButton pending={mutation.pending}>Post comment</SubmitButton>
  </form>;
}
