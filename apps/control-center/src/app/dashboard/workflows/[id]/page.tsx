import { getWorkflowDetail, getWorkflows, getRunsByWorkflow } from "@/lib/services/dashboard-service";
import { notFound } from "next/navigation";
import {
    Layers,
    ArrowLeft,
    Settings,
    History,
    Info,
    Tag,
    Cpu,
    Database,
    ArrowRight,
    ShieldCheck,
    Layout
} from "lucide-react";
import Link from "next/link";
import { StartRunPanel } from "@/components/runs/start-run-panel";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { cn } from "@/lib/utils";

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [workflow, allWorkflows, recentRuns] = await Promise.all([
        getWorkflowDetail(id),
        getWorkflows(),
        getRunsByWorkflow(id)
    ]);

    if (!workflow) {
        notFound();
    }

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Navigation & Header */}
            <div className="flex flex-col gap-6">
                <Link
                    href="/dashboard/workflows"
                    className="group flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-brand-purple transition-colors"
                >
                    <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                    Back to Library
                </Link>

                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-brand-purple/10 text-brand-purple border border-brand-purple/20 shadow-sm">
                            <Layers className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-semibold tracking-tight">{workflow.name}</h1>
                                <div className={cn(
                                    "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tighter",
                                    workflow.active ? "bg-status-green/10 text-status-green border border-status-green/20" : "bg-muted/10 text-muted border border-border"
                                )}>
                                    {workflow.active ? "Enabled" : "Paused"}
                                </div>
                            </div>
                            <p className="mt-1 text-sm text-muted">ID: {workflow.id}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href={`/dashboard/workflows/${workflow.id}/playground`}
                            className="flex h-12 items-center gap-2 rounded-2xl border border-brand-purple/20 bg-brand-purple/5 px-6 text-xs font-semibold text-brand-purple hover:bg-brand-purple/10 transition-colors"
                        >
                            <Layout className="h-4 w-4" />
                            Open Playground
                        </Link>
                        <button className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-card px-6 text-xs font-semibold hover:bg-muted transition-colors">
                            <Settings className="h-4 w-4" />
                            Configure
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Wing: Logic Details */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Detailed Description */}
                    <section className="rounded-[2.5rem] border border-border bg-card overflow-hidden shadow-sm">
                        <header className="px-8 py-5 border-b border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Info className="h-4 w-4 text-brand-purple" />
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Workflow Intelligence</h3>
                            </div>
                        </header>
                        <div className="p-8 space-y-6">
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest">Description</h4>
                                <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                                    {workflow.description}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest">Objective Template</h4>
                                <div className="rounded-2xl bg-muted/10 border border-border p-5 text-xs font-mono text-zinc-400 italic leading-relaxed">
                                    "{workflow.objectiveTemplate}"
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase">
                                        <Tag className="h-3.5 w-3.5" />
                                        Classification
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {workflow.tags?.map(tag => (
                                            <span key={tag} className="px-2 py-1 rounded-lg bg-foreground/5 border border-border text-[9px] font-bold uppercase">{tag}</span>
                                        )) || <span className="text-[10px] italic text-muted">No tags</span>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase">
                                        <Cpu className="h-3.5 w-3.5" />
                                        Agent Class
                                    </div>
                                    <p className="text-xs font-semibold uppercase">{workflow.defaultDomainAgent}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase">
                                        <Database className="h-3.5 w-3.5" />
                                        Provider
                                    </div>
                                    <p className="text-xs font-semibold uppercase">{workflow.defaultProvider} {workflow.defaultModel}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        QA Layer
                                    </div>
                                    <p className="text-xs font-semibold uppercase text-status-green">{workflow.includeMarketing ? "Active" : "Disabled"}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Run History for this workflow */}
                    <section className="rounded-[2.5rem] border border-border bg-card overflow-hidden shadow-sm">
                        <header className="px-8 py-5 border-b border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <History className="h-4 w-4 text-brand-purple" />
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Execution History</h3>
                            </div>
                            <Link href="/dashboard/runs" className="text-[9px] font-bold text-brand-purple hover:underline">VIEW ALL</Link>
                        </header>
                        <div className="overflow-x-auto">
                            {recentRuns.length === 0 ? (
                                <div className="p-12 text-center opacity-30 italic text-xs uppercase tracking-widest">
                                    No execution cycles recorded for this logic.
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/10 text-[9px] font-bold text-muted uppercase tracking-widest">
                                        <tr>
                                            <th className="px-8 py-4">Run ID</th>
                                            <th className="px-8 py-4">Status</th>
                                            <th className="px-8 py-4">Initiated</th>
                                            <th className="px-8 py-4 text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {recentRuns.map((run) => (
                                            <tr key={run.id} className="group hover:bg-foreground/[0.01] transition-colors leading-none">
                                                <td className="px-8 py-5">
                                                    <span className="font-mono text-zinc-400">#{run.id.slice(0, 8)}</span>
                                                </td>
                        <td className="px-8 py-5">
                          <RunStatusBadge value={run.status} />
                        </td>
                                                <td className="px-8 py-5 text-muted font-medium">
                                                    {new Date(run.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <Link
                                                        href={`/dashboard/runs/${run.id}`}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-brand-purple hover:text-brand-purple transition-all"
                                                    >
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Wing: Integration Panel */}
                <div className="lg:col-span-4">
                    <StartRunPanel workflows={allWorkflows as any} initialWorkflowId={workflow.id} />
                </div>
            </div>
        </div>
    );
}
