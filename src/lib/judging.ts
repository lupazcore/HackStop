import { HttpError } from "./http";

export function assertJudgingOpen(event: { submissions_close: Date; judging_open: Date | null; judging_close: Date | null }): void {
  const now = new Date();
  if (now < (event.judging_open ?? event.submissions_close)) throw new HttpError(409, "Judging has not opened yet.");
  if (event.judging_close && now >= event.judging_close) throw new HttpError(409, "Judging has closed.");
}
