"use client";

import type * as schema from "@/lib/db/schema";
import {
  AlertCircle,
  FolderTree,
  LoaderCircle,
  PlayCircle,
  RefreshCw,
  Square,
  TerminalSquare,
  ChevronRight,
  Database,
  Cpu,
  Clock,
  Target,
  Eye,
  FileCode
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type RunDetails = typeof schema.run.$inferSelect & {
  workflow: typeof schema.workflow.$inferSelect;
  steps: (typeof schema.runStep.$inferSelect)[];
  artifacts: (typeof schema.artifact.$inferSelect)[];
};

type RunMonitorProps = {
  runId: string;
  initialRun: RunDetails;
  initialLogs: (typeof schema.runLog.$inferSelect)[];
};

const activeStatuses: (typeof schema.runStatusEnum.enumValues)[number][] = [
  "QUEUED",
  "RUNNING",
];

export function RunMonitor({ runId, initialRun, initialLogs }: RunMonitorProps) {
  const [run, setRun] = useState(initialRun);
  const [logs, setLogs] = useState(initialLogs);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"log" | "preview">("log");
  const [actionLoading, setActionLoading] = useState<"cancel" | "retry" | null>(
    null,
  );

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
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      {/* Left Column: Core Data & Steps */}
      <div className="space-y-6">
        {/* Run Metadata Grid */}
        <section className="grid grid-cols-2 gap-px rounded-3xl border border-border bg-border overflow-hidden">
          <InfoCard
            icon={Target}
            label="Current Objective"
            value={run.objective || "No objective defined"}
            className="col-span-2 bg-card p-6"
          />
          <InfoCard
            icon={Cpu}
            label="Infrastructure"
            value={`${run.provider}:${run.model}`}
            className="bg-card p-6"
          />
          <InfoCard
            icon={Clock}
            label="Timeline"
            value={run.startedAt ? formatDate(run.startedAt) : "Awaiting resource..."}
            className="bg-card p-6"
          />
          <div className="col-span-2 bg-card p-6 flex items-center justify-between border-t border-border/50">
            <div className="flex gap-4">
              <RunStatusBadge value={run.status} />
              <RunStatusBadge value={(run.verdict ?? "UNKNOWN") as any} />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => invokeAction("retry")}
                disabled={actionLoading !== null}
                className="flex h-9 items-center gap-2 rounded-xl border border-brand-purple/20 bg-brand-purple/5 px-4 text-[10px] font-semibold text-brand-purple hover:bg-brand-purple hover:text-white transition-all shadow-sm"
              >
                <RefreshCw className={cn("h-3 w-3", actionLoading === "retry" && "animate-spin")} />
                {actionLoading === "retry" ? "Processing..." : "Retry Sequence"}
              </button>
              <button
                type="button"
                onClick={() => invokeAction("cancel")}
                disabled={actionLoading !== null || !activeStatuses.includes(run.status)}
                className="flex h-9 items-center gap-2 rounded-xl bg-status-red/10 border border-status-red/20 px-4 text-[10px] font-semibold text-status-red hover:bg-status-red/20 transition-all disabled:opacity-50"
              >
                <Square className="h-3 w-3 fill-current" />
                Terminate
              </button>
            </div>
          </div>
        </section>

        {/* Pipeline Execution Steps */}
        <section className="rounded-3xl border border-border bg-card overflow-hidden">
          <header className="border-b border-border bg-background/20 p-4">
            <h3 className="text-[10px] font-semibold text-muted flex items-center gap-2">
              <Database className="h-3 w-3" />
              Pipeline Execution Trace
            </h3>
          </header>
          <div className="divide-y divide-border">
            {run.steps.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-4 group hover:bg-foreground/[0.01] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10 text-[10px] font-semibold border border-brand-purple/20 text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-all">
                    {step.order < 10 ? `0${step.order}` : step.order}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                    <p className="text-[10px] text-muted">trace_id: {step.id.slice(0, 8)}</p>
                  </div>
                </div>
                <RunStatusBadge value={step.status} />
              </div>
            ))}
          </div>
        </section>

        {run.errorMessage && (
          <section className="rounded-2xl border border-status-red/20 bg-status-red/5 p-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-status-red shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-status-red">Critical System Failure</p>
              <p className="text-xs text-status-red/80 font-mono leading-relaxed">{run.errorMessage}</p>
            </div>
          </section>
        )}
      </div>

      {/* Right Column: Real-time Output & Visualization */}
      <div className="space-y-6">
        {/* Output & Preview Tabs */}
        <section className="flex flex-col rounded-3xl border border-border bg-background overflow-hidden h-[500px]">
          <header className="border-b border-border bg-card p-1.5 flex items-center justify-between">
            <div className="flex p-1 bg-background/50 rounded-2xl gap-1">
              <button
                onClick={() => setActiveTab("log")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold transition-all",
                  activeTab === "log"
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted hover:text-foreground"
                )}
              >
                <TerminalSquare className="h-3 w-3" />
                SYSTEM TRACE
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold transition-all",
                  activeTab === "preview"
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted hover:text-foreground"
                )}
              >
                <Eye className="h-3 w-3" />
                LIVE PREVIEW
              </button>
            </div>
            {activeStatuses.includes(run.status) && activeTab === "log" && (
              <div className="flex items-center gap-1.5 px-4 text-[9px] font-semibold text-status-green">
                <div className="h-1.5 w-1.5 rounded-full bg-status-green animate-ping" />
                ACTIVE STREAM
              </div>
            )}
          </header>

          <div className="flex-1 relative overflow-hidden bg-black/20">
            {activeTab === "log" ? (
              <div className="absolute inset-0 overflow-auto bg-black p-4 font-mono text-[10px] space-y-2 selection:bg-foreground selection:text-card">
                {logs.length === 0 ? (
                  <p className="text-muted">// Initialization sequence pending...</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-3 group">
                      <span className="text-muted/40 shrink-0 group-hover:text-muted transition-colors">
                        [{new Date(log.createdAt).toLocaleTimeString([], { hour12: false })}]
                      </span>
                      <span className="text-zinc-300 group-hover:text-white transition-colors">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="absolute inset-0 bg-white">
                {selectedPath && (selectedPath.endsWith(".html") || selectedPath.endsWith(".htm") || selectedPath.endsWith(".svg")) ? (
                  <iframe
                    src={`/api/runs/${runId}/raw/${selectedPath}`}
                    className="w-full h-full border-none"
                    title="Live Preview"
                    sandbox="allow-scripts allow-forms allow-same-origin"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-card gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                      <FileCode className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">No Entry Point Selected</p>
                      <p className="text-[10px] text-muted max-w-[200px]">Select an HTML or SVG artifact from the repository below to initiate the live visualization viewport.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Artifacts Repository */}
        <section className="rounded-3xl border border-border bg-card overflow-hidden">
          <header className="border-b border-border bg-background/20 p-4">
            <h3 className="text-[10px] font-semibold text-muted flex items-center gap-2">
              <FolderTree className="h-3 w-3" />
              Generated Artifacts
            </h3>
          </header>
          <div className="p-4 space-y-4">
            <div className="grid gap-2">
              {run.artifacts.length === 0 ? (
                <p className="p-8 text-center text-xs text-muted border border-dashed border-border rounded-2xl">No artifacts generated in this session.</p>
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
                      "flex items-center justify-between w-full p-3 rounded-xl border text-left transition-all group",
                      selectedPath === artifact.path
                        ? "bg-brand-purple border-brand-purple text-white shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                        : "bg-background/50 border-border text-muted hover:border-brand-purple/30 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        selectedPath === artifact.path ? "bg-card" : "bg-muted group-hover:bg-foreground"
                      )} />
                      <span className="text-xs font-semibold truncate">{artifact.path}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  </button>
                ))
              )}
            </div>

            {selectedPath && (
              <div className="rounded-2xl bg-black border border-border p-4 h-48 overflow-auto">
                <header className="mb-3 flex items-center justify-between border-b border-white/5 pb-2">
                  <p className="text-[9px] font-mono text-muted">Previewing: {selectedPath}</p>
                </header>
                {previewLoading ? (
                  <div className="flex items-center gap-2 text-muted text-[10px] font-mono">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    Hydrating artifact buffer...
                  </div>
                ) : previewError ? (
                  <p className="text-status-red text-[10px] font-mono">{previewError}</p>
                ) : (
                  <pre className="text-[10px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed selection:bg-white selection:text-black">
                    {selectedContent}
                  </pre>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon: Icon, className }: { label: string; value: string; icon: any; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2 text-[10px] font-semibold text-muted">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-sm font-semibold text-foreground leading-tight">
        {value}
      </p>
    </div>
  );
}

export function EmptyRunState() {
  return (
    <div className="rounded-[2.5rem] border border-border bg-card p-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-purple/10 text-brand-purple mb-6 shadow-[0_0_20px_rgba(124,58,237,0.1)]">
        <PlayCircle className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground leading-none">
        Null Vector Detected
      </h2>
      <p className="mt-2 text-xs text-muted max-w-[240px] mx-auto leading-relaxed">
        Please select a valid execution sequence from the history panel to initiate live monitoring.
      </p>
    </div>
  );
}
