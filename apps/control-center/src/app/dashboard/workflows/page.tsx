import { getWorkflows } from "@/lib/services/dashboard-service";
import {
  Layers,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  ExternalLink,
  Power,
  Settings
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function WorkflowsPage() {
  const workflows = await getWorkflows();

  return (
    <div className="space-y-6 pb-12">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflow Library</h1>
          <p className="mt-1 text-xs text-muted">Manage and deploy your automated agent sequences.</p>
        </div>

        <button className="flex h-10 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-card hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" />
          Create Workflow
        </button>
      </div>

      {/* Workflows Container */}
      <section className="rounded-3xl border border-border bg-card overflow-hidden">
        {/* Search & Filters */}
        <div className="flex items-center gap-2 border-b border-border p-4 bg-background/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              placeholder="Filter workflows..."
              className="h-10 w-full rounded-xl border border-border bg-background/50 pl-9 pr-4 text-xs outline-none focus:ring-1 focus:ring-foreground/10"
            />
          </div>
          <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background/50 px-4 text-xs font-semibold text-muted hover:text-foreground">
            <Filter className="h-3.5 w-3.5" />
            Category
          </button>
        </div>

        {/* Workflows Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/30 text-[10px] font-semibold text-muted">
              <tr>
                <th className="w-12 px-6 py-4">
                  <div className="h-4 w-4 rounded border border-border" />
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    Workflow Name <ChevronDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workflows.map((workflow) => (
                <tr key={workflow.id} className="group hover:bg-foreground/[0.01] transition-colors leading-none">
                  <td className="px-6 py-5">
                    <div className="h-4 w-4 rounded border border-border group-hover:border-muted transition-colors" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/5 text-foreground border border-border">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-foreground">{workflow.name}</span>
                        <span className="text-[10px] font-mono text-muted">slug: {workflow.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 max-w-xs">
                    <p className="truncate text-xs text-muted leading-relaxed">{workflow.description}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold",
                      workflow.active ? "bg-status-green/10 text-status-green" : "bg-muted/10 text-muted"
                    )}>
                      <Power className={cn("h-3 w-3", workflow.active ? "animate-pulse" : "")} />
                      {workflow.active ? "Active" : "Paused"}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/workflows/${workflow.id}`}
                        className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-foreground hover:text-card"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-foreground hover:text-card">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
