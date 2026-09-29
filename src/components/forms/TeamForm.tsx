"use client";
import { useRouter } from "next/navigation";
import { Field, FormError } from "./Field";
import { useMutation } from "./use-mutation";
import { ThemedSelect } from "./ThemedSelect";

export function TeamForm({ events }: { events: { id: string; name: string }[] }) {
  const mutation = useMutation();
  const router = useRouter();
  return <form className="panel space-y-5" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; if (await mutation.send("/api/teams", "POST", Object.fromEntries(new FormData(form)))) { form.reset(); router.refresh(); } }}><h2 className="text-h3">Create a team</h2><Field label="Team name" name="name" required maxLength={255} /><ThemedSelect id="event_id" name="event_id" label="Event" required options={[{ value: "", label: "Choose an event" }, ...events.map(event => ({ value: event.id, label: event.name }))]} /><p className="text-sm text-ink-secondary">Up to four members. You can join one team per event.</p><FormError error={mutation.error} /><button className="button" type="submit" disabled={mutation.pending || !events.length}>{mutation.pending ? "Saving…" : "Create team"}</button></form>;
}
