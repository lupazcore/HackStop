"use client";
import { useRouter } from "next/navigation";
import { FormError, SubmitButton } from "./Field";
import { useMutation } from "./use-mutation";

export function InviteForm({ teamId, code }: { teamId: string; code: string }) {
  const mutation = useMutation(); const router = useRouter();
  return <form className="space-y-5" onSubmit={async event => { event.preventDefault(); if (await mutation.send(`/api/teams/${teamId}/invite`, "POST", { invite_code: code })) { router.push("/participant/teams"); router.refresh(); } }}><FormError error={mutation.error} /><SubmitButton pending={mutation.pending}>Join team</SubmitButton></form>;
}
