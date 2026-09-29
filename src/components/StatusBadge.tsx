type Status = "draft" | "submitted" | "pending" | "in_progress" | "completed";
const styles: Record<Status, string> = {
  draft: "bg-warning-light text-warning",
  submitted: "bg-success-light text-success",
  pending: "bg-warning-light text-warning",
  in_progress: "bg-info-light text-info",
  completed: "bg-success-light text-success",
};
export function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex self-start rounded-sm px-2 py-1 text-xs font-semibold capitalize ${styles[status]}`}>{status.replaceAll("_", " ")}</span>;
}
