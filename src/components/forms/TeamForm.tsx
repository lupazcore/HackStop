"use client";
import { useRouter } from "next/navigation";
import { Field, FormError, SubmitButton } from "./Field";
import { useMutation } from "./use-mutation";

export function TeamForm({ events }: { events: { id: string; name: string }[] }) {
  const mutation = useMutation();
  const router = useRouter();
  return <form className="panel space-y-5" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; if (await mutation.send("/api/teams", "POST", Object.fromEntries(new FormData(form)))) { form.reset(); router.refresh(); } }}><h2 className="text-h3">Create a team</h2><Field label="Team name" name="name" required maxLength={255} /><div className="field"><label htmlFor="event_id">Event</label><select name="event_id" id="event_id" required><option value="">Choose an event</option>{events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select></div><p className="text-sm text-ink-secondary">Up to four members. You can join one team per event.</p><FormError error={mutation.error} /><SubmitButton pending={mutation.pending || !events.length}>Create team</SubmitButton></form>;
}
