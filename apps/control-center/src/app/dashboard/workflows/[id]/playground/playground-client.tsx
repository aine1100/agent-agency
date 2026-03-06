"use client";

import React, { useState } from 'react';
import {
    ArrowLeft,
    Layout,
    HelpCircle,
    Rocket,
    Info,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { WorkflowEditor } from '@/components/workflows/workflow-editor';
import { saveWorkflowDefinitionAction } from '@/lib/actions/workflow-actions';
import { cn } from '@/lib/utils';
// import { toast } from 'sonner'; 

type PlaygroundClientProps = {
    workflow: any;
    availableAgents: any[];
};

export function PlaygroundClient({ workflow, availableAgents }: PlaygroundClientProps) {
    const [saving, setSaving] = useState(false);

    const initialNodes = workflow.nodes || [
        {
            id: 'trigger_1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Manual Launch' },
        }
    ];

    const initialEdges = workflow.edges || [];

    const handleSave = async (nodes: any[], edges: any[]) => {
        setSaving(true);
        try {
            const result = await saveWorkflowDefinitionAction(workflow.id, nodes, edges);
            if (result.success) {
                // toast.success("Workflow graph optimized and saved to core.");
            } else {
                // toast.error("Failed to persist graph: " + result.error);
            }
        } catch (err) {
            // toast.error("Critical transmission failure.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header with Breadcrumbs */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                        <Link href="/dashboard/workflows" className="hover:text-brand-purple transition-colors">Library</Link>
                        <ChevronRight className="h-3 w-3" />
                        <Link href={`/dashboard/workflows/${workflow.id}`} className="hover:text-brand-purple transition-colors">{workflow.name}</Link>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-brand-purple">Playground</span>
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">Intelligence Canvas</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-4 py-2 text-[10px] font-bold text-muted border border-border">
                        <span className={cn("h-1.5 w-1.5 rounded-full", saving ? "bg-amber-500 animate-pulse" : "bg-status-green")} />
                        {saving ? "SYNCING..." : "CONNECTED"}
                    </div>
                    <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold hover:bg-muted transition-colors">
                        <HelpCircle className="h-4 w-4" />
                        Guide
                    </button>
                    <Link
                        href={`/dashboard/workflows/${workflow.id}`}
                        className="flex h-10 items-center gap-2 rounded-xl bg-foreground px-5 text-xs font-bold text-card hover:opacity-90 transition-opacity"
                    >
                        <Rocket className="h-4 w-4" />
                        Deploy Sequence
                    </Link>
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 relative">
                <WorkflowEditor
                    initialNodes={initialNodes}
                    initialEdges={initialEdges}
                    onSave={handleSave}
                    availableAgents={availableAgents}
                />

                {/* Floating Help Tip */}
                <div className="absolute right-8 bottom-8 z-10 hidden xl:flex gap-4 p-5 rounded-3xl bg-brand-purple/5 border border-brand-purple/10 backdrop-blur-md max-w-xs shadow-2xl">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-purple/10 text-brand-purple">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-purple">Pro Tip</h4>
                        <p className="text-[11px] font-medium text-muted leading-relaxed">
                            Define branching paths to allow your agent to verify its own work through different specialized models.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
