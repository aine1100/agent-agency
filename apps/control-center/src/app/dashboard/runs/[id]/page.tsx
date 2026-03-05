import { notFound } from "next/navigation";
import { getRunDetail } from "@/lib/services/dashboard-service";
import { RunMonitorStepMode } from "@/components/runs/run-monitor-step-mode";
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
    <div className="space-y-8 pb-20">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            <Activity className="h-3 w-3 text-brand-purple" />
            Execution Monitor
            <ChevronRight className="h-3 w-3" />
            Active Protocol Trace
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Monitor <span className="text-muted font-mono">#{runData.id.slice(0, 8)}</span>
          </h1>
        </div>
      </header>

      <RunMonitorStepMode
        runId={id}
        initialRun={runData as any}
      />
    </div>
  );
}
