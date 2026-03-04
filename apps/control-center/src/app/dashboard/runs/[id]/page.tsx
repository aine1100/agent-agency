import { notFound } from "next/navigation";
import { getRunDetail } from "@/lib/services/dashboard-service";
import { RunMonitor } from "@/components/runs/run-monitor";
import { ChevronRight, Activity } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RunDetailPage({ params }: Props) {
  const { id } = await params;
  const runData = await getRunDetail(id);

  if (!runData) {
    notFound();
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Precision Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-muted">
            <Activity className="h-3 w-3" />
            Execution Monitor
            <ChevronRight className="h-3 w-3" />
            Live Trace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Run Inspection
          </h1>
          <p className="text-xs text-muted flex items-center gap-2">
            System ID: <span className="font-mono text-foreground bg-foreground/5 px-1.5 py-0.5 rounded border border-border">#{runData.id}</span>
          </p>
        </div>
      </header>

      <RunMonitor
        runId={id}
        initialRun={runData as any}
        initialLogs={runData.logs as any}
      />
    </div>
  );
}
