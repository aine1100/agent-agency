import { getWorkflows, getRuns } from "@/lib/services/dashboard-service";
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  ChevronDown,
  PlayCircle,
  Clock,
  User,
  Activity
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { StartRunPanel } from "@/components/runs/start-run-panel";

export default async function RunsPage() {
    const workflows = await getWorkflows();
    const runs = await getRuns();

    return (
        <div className="space-y-6 pb-12">
            {/* Header / Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-muted">
                        <Activity className="h-3 w-3" />
                        Infrastructure
                        <ChevronRight className="h-3 w-3" />
                        Execution History
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Operational Logs</h1>
                    <p className="text-xs text-muted">A detailed trace of all automated agent operations and their outcomes.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-muted hover:text-foreground transition-all">
                        <Download className="h-4 w-4" />
                        Export Log
                    </button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Runs Table Section */}
                <section className="lg:col-span-2 rounded-3xl border border-border bg-card overflow-hidden h-fit">
                    {/* Search & Bulk Actions */}
                    <div className="flex items-center gap-4 border-b border-border p-4 bg-background/20">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                            <input
                                placeholder="Filter execution logs..."
                                className="h-10 w-full rounded-xl border border-border bg-background/50 pl-10 pr-4 text-xs outline-none focus:ring-1 focus:ring-foreground/10"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background/50 px-4 text-xs font-semibold text-muted hover:text-foreground">
                                <Filter className="h-4 w-4" />
                                Filter
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-background/40 text-[10px] font-semibold text-muted">
                                <tr>
                                    <th className="w-12 px-6 py-4">
                                        <div className="h-4 w-4 rounded border border-border" />
                                    </th>
                                    <th className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            Workflow <ChevronDown className="h-3 w-3" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Initiated</th>
                                    <th className="px-6 py-4">Operator</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {runs.map((run) => (
                                    <tr key={run.id} className="group hover:bg-foreground/[0.01] transition-colors leading-none">
                                        <td className="px-6 py-5">
                                            <div className="h-4 w-4 rounded border border-border group-hover:border-muted transition-colors" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="font-semibold text-foreground">{run.workflowName}</span>
                                                <span className="text-[10px] font-mono text-muted">#{run.id.slice(0, 8)}</span>
                                            </div>
                                        </td>
                                         <td className="px-6 py-5">
                                            <div className={cn(
                                                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-semibold border",
                                                run.status === "COMPLETED" && "bg-status-green/5 text-status-green border-status-green/10",
                                                run.status === "RUNNING" && "bg-status-orange/5 text-status-orange border-status-orange/10",
                                                run.status === "FAILED" && "bg-status-red/5 text-status-red border-status-red/10",
                                                run.status === "QUEUED" && "bg-muted/5 text-muted border-muted/20"
                                            )}>
                                                <div className={cn(
                                                    "h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                                                    run.status === "COMPLETED" && "bg-status-green",
                                                    run.status === "RUNNING" && "bg-status-orange animate-pulse",
                                                    run.status === "FAILED" && "bg-status-red"
                                                )} />
                                                {run.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-foreground">{formatDate(run.createdAt)}</span>
                                                <span className="text-[10px] text-muted">Last update 2m ago</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-5 w-5 rounded-full bg-foreground/10 p-1">
                                                    <User className="h-full w-full text-muted" />
                                                </div>
                                                <span className="text-xs font-medium text-muted">
                                                    {run.startedBy?.name || "System"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <Link
                                                href={`/dashboard/runs/${run.id}`}
                                                className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-[10px] font-semibold transition-all hover:bg-foreground hover:text-card"
                                            >
                                              Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Right Column: Quick Start */}
                <aside>
                    <StartRunPanel workflows={workflows} />
                </aside>
            </div>
        </div>
    );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
