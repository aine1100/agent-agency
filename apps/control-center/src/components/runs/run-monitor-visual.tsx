"use client";

import type * as schema from "@/lib/db/schema";
import {
  AlertCircle,
  FolderTree,
  LoaderCircle,
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
  Play
} from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type RunDetails = typeof schema.run.$inferSelect & {
  workflow: typeof schema.workflow.$inferSelect;
  steps: (typeof schema.runStep.$inferSelect)[];
  artifacts: (typeof schema.artifact.$inferSelect)[];
};

type RunMonitorVisualProps = {
  runId: string;
  initialRun: RunDetails;
  initialLogs: (typeof schema.runLog.$inferSelect)[];
};

const activeStatuses: (typeof schema.runStatusEnum.enumValues)[number][] = [
  "QUEUED",
  "RUNNING",
];

export function RunMonitorVisual({ runId, initialRun, initialLogs }: RunMonitorVisualProps) {
  const [run, setRun] = useState(initialRun);
  const [logs, setLogs] = useState(initialLogs);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"log" | "preview">("log");
  const [actionLoading, setActionLoading] = useState<"cancel" | "retry" | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const logsCursor = useMemo(() => {
    return logs.length > 0 ? logs[logs.length - 1]?.createdAt : undefined;
  }, [logs]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const runResponse = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
      if (!runResponse.ok) return;
      const runPayload = (await runResponse.json()) as { run: RunDetails };
      setRun(runPayload.run);

      const logsUrl = logsCursor
        ? `/api/runs/${runId}/logs?after=${encodeURIComponent(logsCursor.toISOString())}`
        : `/api/runs/${runId}/logs`;
      const logsResponse = await fetch(logsUrl, { cache: "no-store" });
      if (!logsResponse.ok) return;
      const logPayload = (await logsResponse.json()) as { logs: (typeof schema.runLog.$inferSelect)[] };
      if (logPayload.logs.length > 0) {
        setLogs((current) => {
          const newLogs = logPayload.logs.filter(
            (newLog) => !current.some((existing) => existing.id === newLog.id)
          );
          return [...current, ...newLogs];
        });
      }
    }, activeStatuses.includes(run.status) ? 2000 : 8000);

    return () => clearInterval(interval);
  }, [runId, run.status, logsCursor]);

  useEffect(() => {
    if (activeTab === "log") {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  const previewFile = async (path: string) => {
    setSelectedPath(path);
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const response = await fetch(
        `/api/runs/${runId}/file?path=${encodeURIComponent(path)}`,
      );
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to load file.");
      }
      const payload = (await response.json()) as { content: string };
      setSelectedContent(payload.content);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Unknown error");
      setSelectedContent("");
    } finally {
      setPreviewLoading(false);
    }
  };

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

  return (
    <div className="flex flex-col gap-6">
      {/* Visual Timeline Section */}
      <section className="bg-card rounded-[2rem] border border-border p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Sequence Progress</h3>
            <p className="text-lg font-semibold text-foreground">{run.workflow.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => invokeAction("retry")}
              disabled={actionLoading !== null}
              className="flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-xs font-semibold hover:bg-muted transition-all"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", actionLoading === "retry" && "animate-spin")} />
              Retry
            </button>
            <button
               onClick={() => invokeAction("cancel")}
               disabled={actionLoading !== null || !activeStatuses.includes(run.status)}
               className="flex h-10 items-center gap-2 rounded-xl bg-status-red/10 border border-status-red/20 px-4 text-xs font-semibold text-status-red hover:bg-status-red/20 transition-all disabled:opacity-50"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Terminate
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-between px-4">
          <div className="absolute left-8 right-8 top-1/2 h-[2px] bg-border -translate-y-1/2 z-0" />
          {run.steps.map((step, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                step.status === "PASSED" ? "bg-status-green border-status-green text-white" :
                step.status === "RUNNING" ? "bg-card border-brand-purple text-brand-purple animate-pulse" :
                step.status === "FAILED" ? "bg-status-red border-status-red text-white" :
                "bg-card border-border text-muted"
              )}>
                {step.status === "PASSED" ? <CheckCircle2 className="h-5 w-5" /> : 
                 step.status === "RUNNING" ? <Play className="h-5 w-5 fill-current" /> :
                 step.status === "FAILED" ? <AlertCircle className="h-5 w-5" /> :
                 <Circle className="h-5 w-5" />}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-foreground">{step.title}</p>
                <p className="text-[10px] text-muted font-medium">{step.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[800px]">
        {/* Left Aspect: The Console / Trace */}
        <section className="lg:col-span-4 flex flex-col bg-card rounded-[2rem] border border-border overflow-hidden shadow-sm">
           <header className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TerminalSquare className="h-4 w-4 text-brand-purple" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Kernel Trace</h3>
              </div>
              {activeStatuses.includes(run.status) && (
                <div className="flex items-center gap-1.5 p-1 px-3 rounded-full bg-status-green/10 text-[9px] font-bold text-status-green border border-status-green/20">
                   LIVE
                </div>
              )}
           </header>
           <div className="flex-1 bg-[#09090b] p-6 font-mono text-[11px] overflow-auto custom-scrollbar">
              {logs.length === 0 ? (
                <p className="text-muted/40 italic">// Awaiting system initialization...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-2 last:mb-0 flex gap-4">
                    <span className="text-muted/30 select-none">{formatTime(log.createdAt)}</span>
                    <span className={cn(
                      "break-all leading-relaxed",
                      log.level === "error" ? "text-status-red" : 
                      log.level === "warn" ? "text-status-orange" : "text-zinc-300"
                    )}>{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
           </div>
        </section>

        {/* Center Aspect: Visual Preview */}
        <section className="lg:col-span-5 flex flex-col bg-card rounded-[2rem] border border-border overflow-hidden shadow-sm">
           <header className="p-1 border-b border-border bg-muted/10 flex items-center gap-1">
             <button
               onClick={() => setActiveTab("preview")}
               className={cn(
                 "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-bold transition-all",
                 activeTab === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
               )}
             >
               <Eye className="h-4 w-4" />
               VISUAL PREVIEW
             </button>
             <button
               onClick={() => setActiveTab("log")}
               className={cn(
                 "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-bold transition-all lg:hidden",
                 activeTab === "log" ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
               )}
             >
               <TerminalSquare className="h-4 w-4" />
               CONSOLE
             </button>
           </header>
           <div className="flex-1 relative bg-[#f1f5f9] dark:bg-zinc-950">
              {selectedPath && (selectedPath.endsWith(".html") || selectedPath.endsWith(".htm") || selectedPath.endsWith(".svg")) ? (
                 <iframe
                    src={`/api/runs/${runId}/raw/${selectedPath}`}
                    className="w-full h-full border-none"
                    title="Live Preview"
                    sandbox="allow-scripts allow-forms allow-same-origin"
                 />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-card">
                  <div className="h-20 w-20 rounded-[2rem] bg-brand-purple/5 flex items-center justify-center text-brand-purple mb-6 border border-brand-purple/10">
                    <FileCode className="h-10 w-10" />
                  </div>
                  <h4 className="text-base font-semibold text-foreground mb-2">No active viewport</h4>
                  <p className="text-xs text-muted max-w-[240px] leading-relaxed">Select a renderable artifact from the repository to initiate live visualization.</p>
                </div>
              )}
           </div>
        </section>

        {/* Right Aspect: Artifact Repository */}
        <section className="lg:col-span-3 flex flex-col bg-card rounded-[2rem] border border-border overflow-hidden shadow-sm">
           <header className="p-5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-brand-purple" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Assets</h3>
              </div>
           </header>
           <div className="flex-1 overflow-auto p-4 space-y-2 custom-scrollbar">
              {run.artifacts.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8 text-center border-2 border-dashed border-border rounded-[2rem]">
                  <p className="text-xs text-muted">Awaiting generations...</p>
                </div>
              ) : (
                run.artifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    onClick={() => {
                      previewFile(artifact.path);
                      if (artifact.path.endsWith(".html") || artifact.path.endsWith(".htm") || artifact.path.endsWith(".svg")) {
                        setActiveTab("preview");
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between w-full p-4 rounded-2xl border text-left transition-all group",
                      selectedPath === artifact.path
                        ? "bg-brand-purple border-brand-purple text-white shadow-lg"
                        : "bg-background border-border text-muted hover:border-brand-purple/30 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        selectedPath === artifact.path ? "bg-white" : "bg-muted group-hover:bg-brand-purple"
                      )} />
                      <span className="text-xs font-semibold truncate tracking-tight">{artifact.path.split('/').pop()}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}

              {selectedPath && !selectedPath.endsWith(".html") && !selectedPath.endsWith(".htm") && !selectedPath.endsWith(".svg") && (
                <div className="mt-6 p-5 rounded-[2rem] bg-black border border-border">
                  <p className="text-[10px] font-mono text-muted mb-3 pb-2 border-b border-white/5 truncate">/ {selectedPath}</p>
                  {previewLoading ? (
                    <div className="flex items-center gap-2 text-muted text-[10px]">
                      <LoaderCircle className="h-3 w-3 animate-spin" />
                      Streaming...
                    </div>
                  ) : previewError ? (
                    <p className="text-status-red text-[10px]">{previewError}</p>
                  ) : (
                    <pre className="text-[10px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-auto custom-scrollbar">
                      {selectedContent}
                    </pre>
                  )}
                </div>
              )}
           </div>
        </section>
      </div>

      {/* Metadata / Metadata Footer */}
      <footer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-5 rounded-3xl">
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Infrastructure</p>
          <p className="text-sm font-semibold text-foreground truncate">{run.provider} : {run.model}</p>
        </div>
        <div className="bg-card border border-border p-5 rounded-3xl">
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Started At</p>
          <p className="text-sm font-semibold text-foreground">{run.startedAt ? formatDate(run.startedAt) : "QUEUED"}</p>
        </div>
        <div className="bg-card border border-border p-5 rounded-3xl col-span-2">
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Objective Trace</p>
          <p className="text-sm font-semibold text-foreground line-clamp-1">{run.objective}</p>
        </div>
      </footer>
    </div>
  );
}

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
