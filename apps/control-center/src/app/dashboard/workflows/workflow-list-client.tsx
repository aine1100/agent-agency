"use client";

import { 
  Layers, 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  ArrowRight,
  Loader2,
  Zap
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkflowAction } from "@/lib/actions/workflow-actions";

type Workflow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  nodes?: any;
  edges?: any;
};

export function WorkflowListClient({ initialWorkflows }: { initialWorkflows: Workflow[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const result = await createWorkflowAction({
        name: "New Project Sequence",
        description: "Custom automated agent sequence for complex project generation.",
      });
      if (result.success && result.id) {
        router.push(`/dashboard/workflows/${result.id}`);
      }
    } catch (error) {
      console.error("Creation failed", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflow Library</h1>
          <p className="mt-1 text-xs text-muted">Manage and deploy your automated agent sequences.</p>
        </div>

        <button 
          onClick={handleCreate}
          disabled={isCreating}
          className="flex h-10 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-card hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isCreating ? "Initializing..." : "Create Workflow"}
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
              {initialWorkflows.map((workflow) => (
                <tr key={workflow.id} className="group hover:bg-foreground/[0.01] transition-colors leading-none">
                  <td className="px-6 py-6" title={workflow.id}>
                    <div className="h-4 w-4 rounded border border-border group-hover:border-brand-purple/40 transition-colors" />
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-brand-purple/5 text-brand-purple border border-brand-purple/10 group-hover:bg-brand-purple/10 transition-colors">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="font-semibold text-foreground group-hover:text-brand-purple transition-colors">{workflow.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-muted uppercase tracking-wider">slug: {workflow.slug}</span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          {workflow.nodes && Array.isArray(workflow.nodes) && workflow.nodes.length > 0 ? (
                            <span className="text-[9px] font-bold text-brand-purple uppercase flex items-center gap-1">
                              <Zap className="h-2.5 w-2.5 fill-current" />
                              INTELLIGENCE GRAPH
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-brand-purple/60 uppercase">INTEGRATED</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 max-w-sm">
                    <p className="line-clamp-1 text-xs text-muted leading-relaxed font-medium">{workflow.description}</p>
                  </td>
                  <td className="px-6 py-6">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                      workflow.active ? "bg-status-green/5 text-status-green border-status-green/20" : "bg-muted/5 text-muted border-border"
                    )}>
                      <div className={cn("h-1.5 w-1.5 rounded-full", workflow.active ? "bg-status-green animate-pulse" : "bg-muted")} />
                      {workflow.active ? "Active" : "Paused"}
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/dashboard/workflows/${workflow.id}`}
                        className="flex h-9 items-center gap-2 rounded-xl bg-brand-purple px-4 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-brand-purple/20 hover:opacity-90 transition-all"
                      >
                        Inspect
                        <ArrowRight className="h-3 w-3" />
                      </Link>
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
