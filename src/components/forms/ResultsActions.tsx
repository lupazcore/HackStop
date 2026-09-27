"use client";
import { useRouter } from "next/navigation";
import { FormError } from "./Field";
import { useMutation } from "./use-mutation";

export function ResultsActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const mutation = useMutation();
  return <div className="space-y-3"><div className="flex flex-wrap gap-3"><button className="button" disabled={mutation.pending} onClick={async () => { if (await mutation.send(`/api/organizer/results?event_id=${eventId}`, "POST")) router.refresh(); }}>{mutation.pending ? "Calculating..." : "Calculate rankings"}</button><a className="button-secondary" href={`/api/export.csv?event_id=${eventId}`}>Export normalized CSV</a></div><FormError error={mutation.error} /></div>;
}
