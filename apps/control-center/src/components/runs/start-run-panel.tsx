"use client"
import type * as schema from "@/lib/db/schema";
import { Rocket, Sparkles, ChevronDown, Cpu, Zap, Info, AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { CustomDropdown } from "@/components/ui/custom-dropdown";

type Workflow = typeof schema.workflow.$inferSelect;
type ProviderType = (typeof schema.providerTypeEnum.enumValues)[number];

type StartRunPanelProps = {
  workflows: Workflow[];
  initialWorkflowId?: string;
};

type ProviderChoice = "openai" | "ollama";

function providerToChoice(provider: ProviderType): ProviderChoice {
  return provider === "OPENAI" ? "openai" : "ollama";
}

export function StartRunPanel({ workflows, initialWorkflowId }: StartRunPanelProps) {
  const router = useRouter();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(
    initialWorkflowId ?? workflows[0]?.id ?? "",
  );
  const [provider, setProvider] = useState<ProviderChoice>(
    workflows[0] ? providerToChoice(workflows[0].defaultProvider) : "openai",
  );
  const [model, setModel] = useState(workflows[0]?.defaultModel ?? "gpt-4o-mini");
  const [includeMarketing, setIncludeMarketing] = useState(
    workflows[0]?.includeMarketing ?? true,
  );
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId),
    [workflows, selectedWorkflowId],
  );

  const onWorkflowChange = (workflowId: string) => {
    const workflow = workflows.find((item) => item.id === workflowId);
    setSelectedWorkflowId(workflowId);
    if (!workflow) return;
    setProvider(providerToChoice(workflow.defaultProvider));
    setModel(workflow.defaultModel);
    setIncludeMarketing(workflow.includeMarketing);
  };

  const startRun = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/runs/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId: selectedWorkflowId,
          provider,
          model,
          includeMarketing,
          dryRun,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to start run.");
      }

      const payload = (await response.json()) as { runId: string };
      router.push(`/dashboard/runs/${payload.runId}`);
      router.refresh();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-muted">
            <Zap className="h-3 w-3 fill-brand-purple text-brand-purple" />
            Execution Controller
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Trigger Pipeline
          </h2>
        </div>
        <div className="rounded-2xl bg-brand-purple/10 p-3 text-brand-purple border border-brand-purple/20 shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <div className="grid gap-4">
          <CustomDropdown
            label="Select Logic Architecture"
            value={selectedWorkflowId}
            onChange={(val) => onWorkflowChange(val)}
            options={workflows.map((w) => ({ value: w.id, label: w.name }))}
          />

          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted ml-1">
              Compute Model ID
            </label>
            <div className="relative group">
              <Cpu className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted group-focus-within:text-brand-purple transition-colors" />
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-xs font-mono font-medium text-foreground outline-none ring-brand-purple/20 transition focus:ring-1 focus:border-brand-purple/50 group-hover:border-muted/50"
                placeholder="e.g. gpt-4o-mini"
              />
            </div>
          </div>

          <CustomDropdown
            label="Infrastructure Provider"
            value={provider}
            onChange={(val) => setProvider(val as ProviderChoice)}
            options={[
              { value: "openai", label: "OpenAI Global" },
              { value: "ollama", label: "Ollama Local" },
            ]}
          />

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center h-4 w-4 rounded border border-border bg-background group-hover:border-brand-purple/50 overflow-hidden">
                <input
                  type="checkbox"
                  checked={includeMarketing}
                  onChange={(event) => setIncludeMarketing(event.target.checked)}
                  className="peer opacity-0 absolute inset-0 cursor-pointer"
                />
                <div className="h-full w-full bg-brand-purple scale-0 peer-checked:scale-100 transition-transform duration-200" />
              </div>
              <span className="text-[10px] font-semibold text-muted group-hover:text-foreground transition-colors">Include Marketing Layer</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center h-4 w-4 rounded border border-border bg-background group-hover:border-brand-purple/50 overflow-hidden">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(event) => setDryRun(event.target.checked)}
                  className="peer opacity-0 absolute inset-0 cursor-pointer"
                />
                <div className="h-full w-full bg-brand-purple scale-0 peer-checked:scale-100 transition-transform duration-200" />
              </div>
              <span className="text-[10px] font-semibold text-muted group-hover:text-foreground transition-colors">Sandbox Dry Run</span>
            </label>
          </div>
        </div>

        {selectedWorkflow && (
          <div className="flex gap-3 rounded-2xl bg-brand-purple/5 p-4 border border-brand-purple/10">
            <Info className="h-4 w-4 text-brand-purple shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">
              {selectedWorkflow.description}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-status-red/20 bg-status-red/5 p-4 flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-status-red" />
            <p className="text-xs font-semibold text-status-red">{error}</p>
          </div>
        )}

        <button
          type="button"
          disabled={submitting || !selectedWorkflowId}
          onClick={startRun}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-purple px-6 py-4 text-xs font-semibold text-white transition hover:opacity-90 shadow-[0_0_20px_rgba(124,58,237,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Rocket className="h-4 w-4 fill-current" />
          {submitting ? "Initiating Protocol..." : "Execute Sequence"}
        </button>
      </div>
    </section>
  );
}
