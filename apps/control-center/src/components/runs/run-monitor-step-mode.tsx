"use client";

import type * as schema from "@/lib/db/schema";
import {
  AlertCircle,
  FolderTree as FolderTreeIcon,
  RefreshCw,
  Square,
  TerminalSquare,
  ChevronRight,
  Database,
  Cpu,
  Clock,
  Target,
  Eye,
  FileCode,
  CheckCircle2,
  Circle,
  Play,
  ArrowLeft,
  Search,
  ExternalLink,
  ChevronDown,
  File,
  FolderOpen
} from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type RunDetails = typeof schema.run.$inferSelect & {
  workflow: typeof schema.workflow.$inferSelect;
  steps: (typeof schema.runStep.$inferSelect)[];
  logs: (typeof schema.runLog.$inferSelect)[];
  artifacts: (typeof schema.artifact.$inferSelect)[];
};

type RunMonitorStepModeProps = {
  runId: string;
  initialRun: RunDetails;
};

const activeStatuses: (typeof schema.runStatusEnum.enumValues)[number][] = [
  "QUEUED",
  "RUNNING",
];

function SourcePreview({ runId, path }: { runId: string, path: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/runs/${runId}/raw/${path}`);
        if (res.ok) {
          const text = await res.text();
          if (active) setContent(text);
        }
      } catch (err) {
        console.error("Failed to fetch source:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [runId, path]);

  if (loading) return (
    <div className="p-12 flex flex-col items-center justify-center gap-4 animate-pulse">
      <Cpu className="h-6 w-6 text-brand-purple" />
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Decoding Binary...</span>
    </div>
  );

  return (
    <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre leading-relaxed p-6 overflow-auto">
      {content || "No source content available."}
    </pre>
  );
}

function FolderTree({ 
  items, 
  onSelect, 
  selectedPath, 
  level = 0 
}: { 
  items: (typeof schema.artifact.$inferSelect)[], 
  onSelect: (path: string) => void, 
  selectedPath: string | null,
  level?: number
}) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ "app": true, "src": true, "marketing": true });

  const tree = useMemo(() => {
    const root: any = { _files: [] };
    items.forEach(item => {
      const parts = item.path.split('/');
      let current = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) current[part] = { _files: [] };
        current = current[part];
      }
      current._files.push(item);
    });
    return root;
  }, [items]);

  const renderNode = (node: any, name: string, pathPrefix: string = "") => {
    const fullPath = pathPrefix ? `${pathPrefix}/${name}` : name;
    const isExpanded = expandedFolders[fullPath];
    const subfolders = Object.keys(node).filter(k => k !== "_files");
    const files = node._files as (typeof schema.artifact.$inferSelect)[];

    return (
      <div key={fullPath} className="space-y-1">
        {name !== "" && (
          <button 
            onClick={() => setExpandedFolders(prev => ({ ...prev, [fullPath]: !prev[fullPath] }))}
            className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded-xl transition-colors text-left group"
            style={{ paddingLeft: `${level * 12 + 8}px` }}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3 text-muted" /> : <ChevronRight className="h-3 w-3 text-muted" />}
            <FolderOpen className="h-3.5 w-3.5 text-brand-purple/60 group-hover:text-brand-purple" />
            <span className="text-[11px] font-bold text-muted group-hover:text-foreground">{name}</span>
          </button>
        )}
        
        {(isExpanded || name === "") && (
          <div className="space-y-1">
            {subfolders.map(sf => renderNode(node[sf], sf, fullPath))}
            {files.map(file => (
              <button
                key={file.id}
                onClick={() => onSelect(file.path)}
                className={cn(
                  "flex items-center gap-3 w-full p-2 rounded-xl transition-all text-left group",
                  selectedPath === file.path 
                    ? "bg-brand-purple/10 text-brand-purple" 
                    : "hover:bg-muted/30 text-muted hover:text-foreground"
                )}
                style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
              >
                <File className={cn(
                  "h-3.5 w-3.5",
                  selectedPath === file.path ? "text-brand-purple" : "text-muted group-hover:text-brand-purple/50"
                )} />
                <span className="text-[11px] font-medium truncate">{file.path.split('/').pop()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return <div className="space-y-1">{renderNode(tree, "")}</div>;
}

export function RunMonitorStepMode({ runId, initialRun }: RunMonitorStepModeProps) {
  const [run, setRun] = useState(initialRun);
  const [selectedStepKey, setSelectedStepKey] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"cancel" | "retry" | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const logsCursor = useMemo(() => {
    return run.logs.length > 0 ? run.logs[run.logs.length - 1]?.createdAt : undefined;
  }, [run.logs]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const runResponse = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
      if (!runResponse.ok) return;
      const runPayload = (await runResponse.json()) as { run: RunDetails };

      setRun(current => {
        const runUpdate = runPayload.run;
        // Deduplicate logs during update with safety checks
        const currentLogs = current.logs || [];
        const nextLogs = runUpdate.logs || [];

        const newLogs = nextLogs.filter(
          (nl) => !currentLogs.some((cl) => cl.id === nl.id)
        );

        return {
          ...runUpdate,
          logs: [...currentLogs, ...newLogs],
          artifacts: runUpdate.artifacts || []
        };
      });
    }, activeStatuses.includes(run.status) ? 2000 : 8000);

    return () => clearInterval(interval);
  }, [runId, run.status, logsCursor]);

  useEffect(() => {
    if (selectedStepKey) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [run.logs, selectedStepKey]);

  const invokeAction = async (action: "cancel" | "retry") => {
    setActionLoading(action);
    try {
      const response = await fetch(`/api/runs/${runId}/${action}`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? `Failed to ${action} run.`);
      }
      if (action === "retry") {
        const payload = (await response.json()) as { runId: string };
        window.location.href = `/dashboard/runs/${payload.runId}`;
        return;
      }
      const latest = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
      if (latest.ok) {
        const payload = (await latest.json()) as { run: RunDetails };
        setRun(payload.run);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setActionLoading(null);
    }
  };

  const logs = run.logs || [];
  const artifacts = run.artifacts || [];
  const steps = run.steps || [];

  const currentStep = steps.find(s => s.key === selectedStepKey);
  const stepLogs = logs.filter(l => l.stepKey === selectedStepKey);
  const stepArtifacts = artifacts.filter(a => a.stepKey === selectedStepKey);

  return (
    <div className="flex flex-col gap-6">
      {/* Dynamic Header & Timeline */}
      <section className="bg-card rounded-[2.5rem] border border-border p-8 shadow-sm overflow-hidden relative">
        <div className="flex items-start justify-between mb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-brand-purple/10 text-brand-purple">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Sequence Protocol</h3>
                <p className="text-xl font-semibold text-foreground">{run.workflow.name}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => invokeAction("retry")}
              disabled={actionLoading !== null}
              className="h-11 px-5 flex items-center gap-2 rounded-2xl border border-border bg-background hover:bg-muted transition-all text-xs font-bold"
            >
              <RefreshCw className={cn("h-4 w-4", actionLoading === "retry" && "animate-spin")} />
              RETRY SEQUENCE
            </button>
            <button
              onClick={() => invokeAction("cancel")}
              disabled={actionLoading !== null || !activeStatuses.includes(run.status)}
              className="h-11 px-5 flex items-center gap-2 rounded-2xl bg-status-red/10 border border-status-red/20 text-status-red hover:bg-status-red/20 transition-all disabled:opacity-50 text-xs font-bold"
            >
              <Square className="h-4 w-4 fill-current" />
              TERMINATE
            </button>
          </div>
        </div>

        {/* The Protocol Timeline */}
        <div className="relative flex items-center justify-between px-6">
          <div className="absolute left-12 right-12 top-6 h-[2px] bg-border z-0" />
          {run.steps.map((step, idx) => {
            const isClickable = step.status !== "PENDING";
            const isActive = selectedStepKey === step.key;

            return (
              <div key={idx} className="relative z-10 flex flex-col items-center gap-4">
                <button
                  onClick={() => isClickable && setSelectedStepKey(step.key)}
                  disabled={!isClickable}
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-sm",
                    step.status === "PASSED" ? "bg-status-green border-status-green text-white" :
                      step.status === "RUNNING" ? "bg-card border-brand-purple text-brand-purple animate-pulse" :
                        step.status === "FAILED" ? "bg-status-red border-status-red text-white" :
                          "bg-card border-border text-muted cursor-not-allowed grayscale",
                    isActive && "ring-4 ring-brand-purple/20 scale-110"
                  )}
                >
                  {step.status === "PASSED" ? <CheckCircle2 className="h-6 w-6" /> :
                    step.status === "RUNNING" ? <Play className="h-6 w-6 fill-current" /> :
                      step.status === "FAILED" ? <AlertCircle className="h-6 w-6" /> :
                        <Circle className="h-6 w-6" />}
                </button>
                <div className="text-center group">
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-wider transition-colors",
                    isActive ? "text-brand-purple" : "text-foreground"
                  )}>{step.title}</p>
                  <p className="text-[9px] text-muted font-bold opacity-60 uppercase">{step.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {!selectedStepKey ? (
        /* --- RUN OVERVIEW VIEW --- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-card rounded-[2.5rem] border border-border p-8 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted mb-6">Mission Objective</h3>
                <p className="text-2xl font-semibold leading-tight text-foreground">{run.objective}</p>
              </div>
              <div className="pt-8 flex items-center justify-between border-t border-border/50">
                <div className="flex gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted uppercase">Infrastructure</p>
                    <p className="text-xs font-semibold text-foreground">{run.provider}:{run.model}</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted uppercase">Initiated</p>
                    <p className="text-xs font-semibold text-foreground">{formatDate(run.createdAt)}</p>
                  </div>
                </div>
                <RunStatusBadge value={run.status} />
              </div>
            </section>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 gap-6">
            <section className="bg-card rounded-[2.5rem] border border-border p-8">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted mb-6">Protocol Steps</h3>
              <div className="space-y-4">
                {run.steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => step.status !== "PENDING" && setSelectedStepKey(step.key)}
                    disabled={step.status === "PENDING"}
                    className="w-full flex items-center justify-between p-4 rounded-3xl bg-background border border-border hover:border-brand-purple/40 hover:bg-muted/30 transition-all group disabled:opacity-40"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-2xl  bg-brand-purple/10 transition-colors">
                        <span className="text-xs font-bold text-muted group-hover:text-brand-purple">0{step.order}</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-foreground">{step.title}</p>
                        <p className="text-[10px] text-muted font-medium">{step.status}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        /* --- STEP DETAILS VIEW --- */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSelectedStepKey(null)}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-card border border-border hover:bg-muted transition-all text-xs font-bold text-muted hover:text-foreground group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              RETURN TO OVERVIEW
            </button>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <h2 className="text-xl font-semibold text-foreground">{currentStep?.title}</h2>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">PHASE DETAILS</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                <TerminalSquare className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[700px]">
            {/* Log Terminal for Step */}
            <div className="lg:col-span-8 flex flex-col bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm">
              <header className="px-8 py-5 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-brand-purple animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Active Phase Trace</h3>
                </div>
                <div className="text-[10px] font-bold text-muted uppercase">{stepLogs.length} LOGS GENERATED</div>
              </header>
              <div className="flex-1 bg-[#09090b] p-8 font-mono text-[11px] overflow-auto custom-scrollbar">
                {stepLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                    <Search className="h-8 w-8" />
                    <p className="italic uppercase tracking-widest text-[9px]">Awaiting Phase Telemetry...</p>
                  </div>
                ) : (
                  stepLogs.map((log, i) => (
                    <div key={i} className="mb-3 last:mb-0 flex gap-6 group">
                      <span className="text-muted/20 select-none font-bold group-hover:text-muted/40 transition-colors">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className={cn(
                        "break-all leading-relaxed",
                        log.level === "error" ? "text-status-red" :
                          log.level === "warn" ? "text-status-orange" : "text-zinc-400 group-hover:text-zinc-200 transition-colors"
                      )}>{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Artifacts & Preview for Step */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <section className="flex-1 bg-card rounded-[2.5rem] border border-border overflow-hidden flex flex-col pb-6">
                <header className="px-8 py-5 border-b border-border bg-muted/30">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Phase Assets</h3>
                </header>
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                  {stepArtifacts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2rem] opacity-30 p-8 text-center gap-4">
                      <FolderTreeIcon className="h-8 w-8" />
                      <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">No artifacts surfaced in this protocol phase.</p>
                    </div>
                  ) : (
                    <FolderTree 
                      items={stepArtifacts} 
                      onSelect={(path) => setSelectedPath(selectedPath === path ? null : path)}
                      selectedPath={selectedPath}
                    />
                  )}
                </div>
                {selectedPath && (
                  <div className="p-4 border-t border-border bg-muted/20">
                    <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-2xl">
                      {selectedPath.endsWith(".html") || selectedPath.endsWith(".htm") || selectedPath.endsWith(".svg") ? (
                        <div className="h-80 relative">
                          <iframe
                            src={`/api/runs/${runId}/raw/${selectedPath}`}
                            className="w-full h-full border-none"
                            title="Step Preview"
                            sandbox="allow-scripts allow-forms allow-same-origin"
                          />
                          <div className="absolute top-2 right-2">
                            <a
                              href={`/api/runs/${runId}/raw/${selectedPath}`}
                              target="_blank"
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/60 text-white hover:bg-black transition-colors backdrop-blur-md"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#09090b] max-h-80 overflow-auto custom-scrollbar">
                          <header className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#09090b] z-10">
                            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">/ {selectedPath}</p>
                            <FileCode className="h-3 w-3 text-zinc-600" />
                          </header>
                          <SourcePreview runId={runId} path={selectedPath} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
