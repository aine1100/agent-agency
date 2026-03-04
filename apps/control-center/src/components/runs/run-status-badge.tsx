import { cn } from "@/lib/utils";

type BadgeProps = {
  value: string;
  className?: string;
};

const styleMap: Record<string, string> = {
  COMPLETED: "bg-status-green/10 text-status-green border-status-green/20",
  PASSED: "bg-status-green/10 text-status-green border-status-green/20",
  READY: "bg-status-green/10 text-status-green border-status-green/20",
  RUNNING: "bg-status-orange/10 text-status-orange border-status-orange/20",
  PENDING: "bg-status-orange/10 text-status-orange border-status-orange/20",
  QUEUED: "bg-muted/10 text-muted border-muted/20",
  FAILED: "bg-status-red/10 text-status-red border-status-red/20",
  CANCELED: "bg-status-red/10 text-status-red border-status-red/20",
  NEEDS_WORK: "bg-status-orange/10 text-status-orange border-status-orange/20",
  UNKNOWN: "bg-muted/10 text-muted border-muted/20",
};

export function RunStatusBadge({ value, className }: BadgeProps) {
  const status = value.toUpperCase();
  const styles = styleMap[status] || styleMap.UNKNOWN;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold",
      styles,
      className
    )}>
      <div className={cn(
        "h-1.5 w-1.5 rounded-full",
        status === "RUNNING" && "animate-pulse shadow-[0_0_8px_currentColor]",
        (status === "COMPLETED" || status === "PASSED" || status === "READY") && "bg-status-green",
        (status === "RUNNING" || status === "PENDING" || status === "NEEDS_WORK") && "bg-status-orange",
        (status === "FAILED" || status === "CANCELED") && "bg-status-red",
        (status === "QUEUED" || status === "UNKNOWN") && "bg-muted"
      )} />
      {status.replace("_", " ")}
    </div>
  );
}
