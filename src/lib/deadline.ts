import { HttpError } from "./http";

export function requireOpen(event: { submissions_open: Date | null; submissions_close: Date }, now = new Date()): void {
  if (now >= event.submissions_close) throw new HttpError(403, "Submissions are closed for this event.");
  if (event.submissions_open && now < event.submissions_open) throw new HttpError(403, "Submissions have not opened for this event.");
}
