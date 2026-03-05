import { getDashboardData } from "@/lib/services/dashboard-service";
import { getServerSession } from "@/lib/auth";
import { 
  Layers, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  MessageSquare,
  History as HistoryIcon,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getServerSession();
  const { stats, recentRuns, recentActivity } = await getDashboardData(session?.user?.id || "");

  return (
    <div className="space-y-8 pb-12">
      {/* Stats Grid - VitaHealth style */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = index % 2 === 0; // Alternating for mock look

          return (
            <div key={stat.label} className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all hover:border-brand-purple/20 shadow-sm hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-brand-purple/10 p-2.5 text-brand-purple transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-semibold",
                  isPositive ? "text-status-green" : "text-status-red"
                )}>
                  {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {isPositive ? "+12.5%" : "-2.3%"}
                </div>
              </div>
              
              <p className="text-[10px] font-semibold text-muted leading-none">{stat.label}</p>
              <div className="mt-3 flex items-baseline gap-2">
                <h3 className="text-3xl font-semibold tracking-tight text-foreground leading-none">{stat.value}</h3>
              </div>
              
              <div className="mt-4 h-1 w-full bg-foreground/5 rounded-full overflow-hidden">
                <div className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  isPositive ? "bg-status-green w-[65%]" : "bg-status-red w-[45%]"
                )} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent AI Activity Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-purple" />
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Recent AI Activity</h2>
          </div>
          <Link 
            href="/dashboard/chat" 
            className="text-[10px] font-bold text-brand-purple uppercase tracking-wider hover:opacity-80 transition-all flex items-center gap-1"
          >
            Launch Orchestrator <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          {recentActivity.map((activity) => (
            <Link 
              key={activity.id}
              href={`/dashboard/chat?id=${activity.id}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-4 transition-all hover:border-brand-purple/20 shadow-sm"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground truncate max-w-[150px] group-hover:text-brand-purple transition-colors">
                    {activity.title}
                  </span>
                  <span className="text-[10px] font-medium text-muted">
                    {formatDate(activity.updatedAt)}
                  </span>
                </div>
                <p className="text-[10px] text-muted line-clamp-2 font-medium leading-relaxed opacity-70">
                  {activity.lastMessage.replace(/\[Nexus-Micro Orchestration Started: #([a-f0-9]{8})\]/g, "").trim()}
                </p>
                <div className="pt-2 flex items-center gap-1 text-[9px] font-bold text-brand-purple/60 uppercase tracking-tighter">
                  <MessageSquare className="h-2.5 w-2.5" />
                  Continue Session
                </div>
              </div>
            </Link>
          ))}
          {recentActivity.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center bg-card/20">
              <p className="text-sm text-muted font-medium italic">No recent AI sessions found.</p>
              <Link href="/dashboard/chat" className="mt-2 inline-block text-xs font-bold text-brand-purple">Start one now</Link>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Section */}
      <section className="rounded-[2.5rem] border border-border bg-card overflow-hidden shadow-sm">
        {/* Table Header / Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-8 bg-background/20">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Active Agent Pipeline</h2>
            <p className="text-[10px] font-medium text-muted">Comprehensive summary of execution logic and operational states.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted group-focus-within:text-brand-purple transition-colors" />
              <input
                placeholder="Filter pipeline..."
                className="h-10 w-56 rounded-xl border border-border bg-background/50 pl-10 pr-4 text-xs font-medium outline-none focus:ring-1 focus:ring-brand-purple/30 group-hover:border-muted/50 transition-all"
              />
            </div>
            <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-muted hover:text-foreground hover:border-muted transition-all">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
            <button className="flex h-10 items-center gap-2 rounded-xl bg-brand-purple px-5 text-xs font-semibold text-white hover:opacity-90 shadow-[0_0_15px_rgba(124,58,237,0.2)] transition-all">
              <Download className="h-3.5 w-3.5" />
              Export Logs
            </button>
          </div>
        </div>

        {/* VitaHealth Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/40 text-[10px] font-semibold text-muted">
              <tr>
                <th className="w-12 px-8 py-4">
                  <div className="h-4 w-4 rounded border border-border" />
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    Logic ID <ChevronDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-4">Phase</th>
                <th className="px-6 py-4">Execution Log</th>
                <th className="px-6 py-4">Initiator</th>
                <th className="px-6 py-4 text-right">
                  <MoreHorizontal className="h-4 w-4 ml-auto" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentRuns.map((run) => (
                <tr key={run.id} className="group hover:bg-foreground/[0.01] transition-colors leading-none">
                  <td className="px-8 py-5">
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
                      <span className="text-[10px] text-muted font-medium">Latency: 124ms</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 leading-none">
                     <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-brand-purple/10 flex items-center justify-center text-[10px] font-semibold text-brand-purple">
                          {run.startedBy?.name?.charAt(0) || "S"}
                        </div>
                        <span className="text-xs font-semibold text-muted">
                          {run.startedBy?.name || "System"}
                        </span>
                     </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Link
                      href={`/dashboard/runs/${run.id}`}
                      className="inline-flex h-8 items-center rounded-lg border border-brand-purple/20 bg-brand-purple/5 px-4 text-[10px] font-semibold text-brand-purple transition-all hover:bg-brand-purple hover:text-white shadow-sm"
                    >
                      Inspect Trace
                    </Link>
                  </td>
                </tr>
              ))}
              {recentRuns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    No run logs found in this workspace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
