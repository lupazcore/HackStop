"use client";
import { useRouter } from "next/navigation";
import { Field, TextField, FormError, SubmitButton } from "./Field";
import { useMutation } from "./use-mutation";

export function EventForm() {
  const mutation = useMutation();
  const router = useRouter();
  return <form className="panel space-y-5" onSubmit={async event => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const lines = (name: string) => String(values.get(name) || "").split("\n").map(line => line.trim()).filter(Boolean);
    const dates = Object.fromEntries(["submissions_open", "submissions_close", "judging_open", "judging_close"].map(key => [key, values.get(key) ? new Date(String(values.get(key))).toISOString() : null]));
    const result = await mutation.send("/api/events", "POST", { name: values.get("name"), ...dates, tracks: lines("tracks"), prizes: lines("prizes"), custom_questions: lines("questions").map((label, index) => ({ id: `q${index + 1}`, label, required: true })) });
    if (result) { router.push(`/organizer/events/${result.id}`); router.refresh(); }
  }}>
    <h2 className="text-h3">Create an event</h2><Field label="Event name" name="name" required maxLength={255} />
    <p className="text-sm text-ink-secondary">Enter dates in your local timezone. They are stored in UTC.</p>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Submissions open (optional)" name="submissions_open" type="datetime-local" /><Field label="Submission deadline" name="submissions_close" type="datetime-local" required /><Field label="Judging opens (optional)" name="judging_open" type="datetime-local" /><Field label="Judging closes (optional)" name="judging_close" type="datetime-local" /></div>
    <TextField label="Tracks (one per line)" name="tracks" required maxLength={7500} /><TextField label="Prizes (one per line, optional)" name="prizes" maxLength={15000} /><TextField label="Custom questions (one required question per line, optional)" name="questions" maxLength={10000} />
    <p className="text-sm text-ink-secondary">Custom answers are published with the submitted project. Ask only for information intended for the public gallery.</p>
    <FormError error={mutation.error} /><SubmitButton pending={mutation.pending}>Create event</SubmitButton>
  </form>;
}
