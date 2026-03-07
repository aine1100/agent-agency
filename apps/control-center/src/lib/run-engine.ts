import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { env, isMockMode } from "@/lib/env";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";

type StartRunInput = {
  workflowId: string;
  objective: string;
  provider: (typeof schema.providerTypeEnum.enumValues)[number];
  model: string;
  includeMarketing: boolean;
  dryRun: boolean;
  startedById: string;
  startedByRole: (typeof schema.roleEnum.enumValues)[number];
};

type StepDefinition = {
  key: string;
  title: string;
  order: number;
};

const pipelineSteps: StepDefinition[] = [
  { key: "orchestrator", title: "Orchestrator", order: 1 },
  { key: "specialist", title: "Specialist", order: 2 },
  { key: "qa", title: "QA", order: 3 },
  { key: "reality_checker", title: "Reality Checker", order: 4 },
  { key: "marketing", title: "Marketing", order: 5 },
];

function getSteps(includeMarketing: boolean) {
  return includeMarketing
    ? pipelineSteps
    : pipelineSteps.filter((step) => step.key !== "marketing");
}

async function appendLog(runId: string, message: string, level = "info", stepKey?: string) {
  await db.insert(schema.runLog).values({
    id: crypto.randomUUID(),
    runId,
    stepKey,
    message,
    level,
  });
}

async function setRunStepState(
  runId: string,
  key: string,
  status: (typeof schema.stepStatusEnum.enumValues)[number],
  details?: string,
) {
  await db
    .update(schema.runStep)
    .set({
      status,
      details,
      startedAt: status === "RUNNING" ? new Date() : undefined,
      completedAt:
        status === "PASSED" ||
          status === "FAILED" ||
          status === "SKIPPED"
          ? new Date()
          : undefined,
    })
    .where(and(eq(schema.runStep.runId, runId), eq(schema.runStep.key, key)));
}

async function collectFiles(rootPath: string) {
  const files: string[] = [];

  async function walk(currentPath: string) {
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  await walk(rootPath);
  return files;
}

async function ingestArtifacts(
  runId: string,
  artifactRoot: string,
  fallbackStepKey?: string,
  roleToStepKey?: Record<string, string>,
) {
  const files = await collectFiles(artifactRoot);
  const values: (typeof schema.artifact.$inferInsert)[] = [];

  for (const filePath of files) {
    const fileStats = await stat(filePath);
    const relativePath = path.relative(artifactRoot, filePath).replace(/\\/g, "/");
    const extension = path.extname(filePath).toLowerCase();
    
    // Determine the most appropriate step for this artifact
    let stepKey = fallbackStepKey;
    if (relativePath.includes("marketing/")) {
      stepKey = roleToStepKey?.marketing || "marketing";
    } else if (relativePath.includes("app/") || [".html", ".js", ".jsx", ".tsx", ".css"].includes(extension)) {
      stepKey = roleToStepKey?.specialist || "specialist";
    } else if (relativePath.includes("SUMMARY") || relativePath.includes("final")) {
      stepKey = roleToStepKey?.reality_checker || "reality_checker";
    }

    const kind =
      extension === ".md"
        ? "markdown"
        : extension === ".txt"
          ? "text"
          : extension === ".json"
            ? "json"
            : extension === ".html" || extension === ".css" || extension === ".js" || extension === ".jsx" || extension === ".tsx"
              ? "code"
              : "file";

    values.push({
      id: crypto.randomUUID(),
      runId,
      stepKey,
      path: relativePath,
      kind,
      size: fileStats.size,
    });
  }

  await db.delete(schema.artifact).where(eq(schema.artifact.runId, runId));
  if (values.length > 0) {
    await db.insert(schema.artifact).values(values);
  }
}

function toProviderName(provider: (typeof schema.providerTypeEnum.enumValues)[number]) {
  return provider === "OPENAI" ? "openai" : "ollama";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeMockArtifacts(runId: string, objective: string, includeMarketing: boolean) {
  const outputRoot = path.resolve(process.cwd(), env.RUN_OUTPUT_ROOT);
  const runRoot = path.join(outputRoot, `dashboard-run-${runId}`);
  const appRoot = path.join(runRoot, "app");
  const srcRoot = path.join(appRoot, "src");
  const componentsRoot = path.join(srcRoot, "components");
  const distRoot = path.join(appRoot, "dist");
  const marketingRoot = path.join(runRoot, "marketing");

  await mkdir(componentsRoot, { recursive: true });
  await mkdir(distRoot, { recursive: true });
  await mkdir(marketingRoot, { recursive: true });

  const summary = `# Complex React Project Summary\n\n- Run: ${runId}\n- Objective: ${objective}\n- Verdict: READY\n`;

  const headerJsx = `import React from 'react';\n\nexport const Header = () => (\n  <header className="p-4 border-b border-white/10">\n    <h1 className="text-xl font-bold">Protocol Task Manager</h1>\n  </header>\n);`;
  
  const todoListJsx = `import React, { useState } from 'react';\n\nexport const TodoList = () => {\n  const [todos, setTodos] = useState([]);\n  return (\n    <div className="p-6">\n      <ul className="space-y-2">\n        {todos.map((t, i) => <li key={i}>{t}</li>)}\n      </ul>\n    </div>\n  );\n};`;

  const mainJs = `import React from 'react';\nimport ReactDOM from 'react-dom';\nimport { Header } from './components/Header';\nimport { TodoList } from './components/TodoList';\n\nconst App = () => (\n  <div className="min-h-screen bg-zinc-950 text-white font-sans">\n    <Header />\n    <TodoList />\n  </div>\n);\n\nReactDOM.render(<App />, document.getElementById('root'));`;

  const indexHtml = `<!DOCTYPE html>\n<html>\n<head><title>React Preview</title></head>\n<body><div id="root"></div><script src="./main.js"></script></body>\n</html>`;

  await writeFile(path.join(runRoot, "SUMMARY.md"), summary, "utf8");
  await writeFile(path.join(componentsRoot, "Header.jsx"), headerJsx, "utf8");
  await writeFile(path.join(componentsRoot, "TodoList.jsx"), todoListJsx, "utf8");
  await writeFile(path.join(srcRoot, "main.js"), mainJs, "utf8");
  await writeFile(path.join(distRoot, "index.html"), indexHtml, "utf8");
  await writeFile(path.join(appRoot, "package.json"), JSON.stringify({ name: "react-app", dependencies: { "react": "^18.0.0" } }, null, 2), "utf8");

  if (includeMarketing) {
    await writeFile(
      path.join(marketingRoot, "campaign-strategy.md"),
      `# Campaign Strategy\n\n- Focus: Developer productivity\n`,
      "utf8",
    );
  }

  return runRoot;
}

async function runMockPipeline(runId: string, objective: string, includeMarketing: boolean) {
  await db
    .update(schema.run)
    .set({
      status: "RUNNING",
      startedAt: new Date(),
    })
    .where(eq(schema.run.id, runId));

  const runSteps = await db.query.runStep.findMany({
    where: eq(schema.runStep.runId, runId),
    orderBy: [asc(schema.runStep.order)],
  });

  for (const step of runSteps) {
    await setRunStepState(runId, step.key, "RUNNING");
    await appendLog(runId, `Starting ${step.title}...`, "info", step.key);
    await sleep(1200);
    await setRunStepState(runId, step.key, "PASSED");
    await appendLog(runId, `${step.title} completed.`, "info", step.key);
  }

  const artifactRoot = await writeMockArtifacts(runId, objective, includeMarketing);
  await ingestArtifacts(runId, artifactRoot, runSteps[1]?.key || "specialist");
  await appendLog(runId, "Artifacts generated.", "info", "specialist");

  await db
    .update(schema.run)
    .set({
      status: "COMPLETED",
      verdict: "READY",
      outputRoot: artifactRoot,
      completedAt: new Date(),
    })
    .where(eq(schema.run.id, runId));
}

function parseStepFromLine(line: string) {
  const normalized = line.toLowerCase();
  if (normalized.includes("1) orchestrator")) return "orchestrator";
  if (normalized.includes("2) specialist")) return "specialist";
  if (normalized.includes("3) qa")) return "qa";
  if (normalized.includes("4) reality checker")) return "reality_checker";
  if (normalized.includes("5) marketing")) return "marketing";
  return null;
}

async function findLatestRunFolder(outputRoot: string) {
  try {
    const entries = await readdir(outputRoot, { withFileTypes: true });
    const candidates = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(outputRoot, entry.name));

    if (candidates.length === 0) return null;

    let latestFolder = candidates[0];
    let latestTime = (await stat(latestFolder)).mtimeMs;

    for (const candidate of candidates.slice(1)) {
      const candidateTime = (await stat(candidate)).mtimeMs;
      if (candidateTime > latestTime) {
        latestTime = candidateTime;
        latestFolder = candidate;
      }
    }

    return latestFolder;
  } catch (error) {
    console.warn(`Could not read output root ${outputRoot}:`, error);
    return null;
  }
}

async function resolveArtifactRunFolder(outputRoot: string, runId: string) {
  const runIdShort = runId.split("-")[0];
  const preferred = path.resolve(outputRoot, runIdShort);
  if (existsSync(preferred)) {
    return preferred;
  }

  const latest = await findLatestRunFolder(outputRoot);
  return latest;
}

// REMOVED runAgentStep as we use run-nexus-micro collectively

// REMOVED runDynamicPipeline as the user prefers using the main nexus-micro script

async function runRealPipeline(
  runId: string,
  objective: string,
  provider: (typeof schema.providerTypeEnum.enumValues)[number],
  model: string,
  includeMarketing: boolean,
  dryRun: boolean,
) {
  console.log(`[runRealPipeline] Starting run ${runId}`);
  await appendLog(runId, `Initializing orchestration for objective: ${objective}`, "info", "orchestrator");

  const runData = await db.query.run.findFirst({
    where: eq(schema.run.id, runId),
    with: { workflow: true }
  });

  if (!runData) {
    const err = "Run data not found in database";
    console.error(`[runRealPipeline] ${err}`);
    await appendLog(runId, err, "error", "orchestrator");
    throw new Error(err);
  }

  // Extract and map workflow agents if present
  let orchestratorAgent: string | null = null;
  let domainAgent: string | null = null;
  let qaAgent: string | null = null;
  let finalAgent: string | null = null;
  let marketingAgent: string | null = null;

  let orchestratorConfig: { provider?: string; model?: string } = {};
  let domainConfig: { provider?: string; model?: string } = {};
  let qaConfig: { provider?: string; model?: string } = {};
  let finalConfig: { provider?: string; model?: string } = {};
  let marketingConfig: { provider?: string; model?: string } = {};

  if (runData?.workflow?.nodes && Array.isArray(runData.workflow.nodes)) {
     const nodes = runData.workflow.nodes as any[];
     const agents = nodes.filter(n => n.type === 'agent');
     
     // Map by role if available, otherwise by index
     const findAgent = (role: string) => agents.find(n => n.data?.role === role || n.data?.label?.includes(role));
     
     const orchNode = findAgent("Orchestrator") || agents[0];
     const specNode = findAgent("Specialist") || findAgent("Specialized") || agents[1];
     const qaNode = findAgent("QA") || agents[2];
     const finalNode = findAgent("Reality") || findAgent("Final") || agents[3];
     const markNode = findAgent("Marketing") || agents[4];

     const resolveAgentPath = (p: string | null) => p ? path.resolve(process.cwd(), "../../", p) : null;

     orchestratorAgent = resolveAgentPath(orchNode?.data?.filePath || null);
     domainAgent = resolveAgentPath(specNode?.data?.filePath || null);
     qaAgent = resolveAgentPath(qaNode?.data?.filePath || null);
     finalAgent = resolveAgentPath(finalNode?.data?.filePath || null);
     marketingAgent = resolveAgentPath(markNode?.data?.filePath || null);

     if (orchNode?.data) orchestratorConfig = { provider: orchNode.data.provider, model: orchNode.data.model };
     if (specNode?.data) domainConfig = { provider: specNode.data.provider, model: specNode.data.model };
     if (qaNode?.data) qaConfig = { provider: qaNode.data.provider, model: qaNode.data.model };
     if (finalNode?.data) finalConfig = { provider: finalNode.data.provider, model: finalNode.data.model };
     if (markNode?.data) marketingConfig = { provider: markNode.data.provider, model: markNode.data.model };
  }

  // FALLBACK TO LEGACY SEQUENTIAL RUNNER
  await db
    .update(schema.run)
    .set({
      status: "RUNNING",
      startedAt: new Date(),
    })
    .where(eq(schema.run.id, runId));

  const outputRoot = path.resolve(process.cwd(), env.RUN_OUTPUT_ROOT, `dashboard-run-${runId}`);
  await mkdir(outputRoot, { recursive: true });

  const scriptPath = path.resolve(process.cwd(), env.RUNNER_SCRIPT_PATH);
  const args = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
    "-Task",
    objective,
    "-Provider",
    toProviderName(provider),
    "-Model",
    model,
    "-OutputRoot",
    outputRoot,
    "-RunId",
    runId.split("-")[0],
  ];

  // Map Force-Matrix agents to script parameters
  if (orchestratorAgent) args.push("-OrchestratorAgentFile", orchestratorAgent);
  if (domainAgent) args.push("-DomainAgentFile", domainAgent);
  if (qaAgent) args.push("-QaAgentFile", qaAgent);
  if (finalAgent) args.push("-FinalAgentFile", finalAgent);
  if (marketingAgent) args.push("-MarketingAgentFile", marketingAgent);

  // Propagate per-agent brain configs
  if (orchestratorConfig.provider) args.push("-OrchestratorProvider", orchestratorConfig.provider.toLowerCase());
  if (orchestratorConfig.model) args.push("-OrchestratorModel", orchestratorConfig.model);
  
  if (domainConfig.provider) args.push("-DomainProvider", domainConfig.provider.toLowerCase());
  if (domainConfig.model) args.push("-DomainModel", domainConfig.model);

  if (qaConfig.provider) args.push("-QaProvider", qaConfig.provider.toLowerCase());
  if (qaConfig.model) args.push("-QaModel", qaConfig.model);

  if (finalConfig.provider) args.push("-FinalProvider", finalConfig.provider.toLowerCase());
  if (finalConfig.model) args.push("-FinalModel", finalConfig.model);

  if (marketingConfig.provider) args.push("-MarketingProvider", marketingConfig.provider.toLowerCase());
  if (marketingConfig.model) args.push("-MarketingModel", marketingConfig.model);

  console.log(`[runRealPipeline] Command arguments prepared: ${args.join(" ")}`);

  // Mapping for real-time tracking
  const roleToStepKey: Record<string, string> = {
    orchestrator: "orchestrator",
    specialist: "specialist",
    qa: "qa",
    reality_checker: "reality_checker",
    marketing: "marketing",
  };

  if (runData?.workflow?.nodes && Array.isArray(runData.workflow.nodes)) {
    const nodes = runData.workflow.nodes as any[];
    const agents = nodes.filter((n) => n.type === "agent");

    const findAgentId = (role: string) =>
      agents.find((n) => n.data?.role === role || n.data?.label?.includes(role))?.id;

    const orchId = findAgentId("Orchestrator") || agents[0]?.id;
    const specId =
      findAgentId("Specialist") || findAgentId("Specialized") || agents[1]?.id;
    const qaId = findAgentId("QA") || agents[2]?.id;
    const realId = findAgentId("Reality") || findAgentId("Final") || agents[3]?.id;
    const markId = findAgentId("Marketing") || agents[4]?.id;

    if (orchId) roleToStepKey.orchestrator = orchId;
    if (specId) roleToStepKey.specialist = specId;
    if (qaId) roleToStepKey.qa = qaId;
    if (realId) roleToStepKey.reality_checker = realId;
    if (markId) roleToStepKey.marketing = markId;
  }

  if (!includeMarketing) {
    args.push("-SkipMarketing");
  }
  if (dryRun) {
    args.push("-DryRun");
  }

  await appendLog(runId, `Deploying Orchestration Matrix for: ${objective}`, "info", "orchestrator");

  const child = spawn("powershell.exe", args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let currentStep: string | null = null;
  let stdoutBuffer = "";
  let stderrBuffer = "";
  let currentDbStepKey: string | null = null;

  const handleLine = async (line: string) => {
    if (!line.trim()) return;
    
    const roleKey = parseStepFromLine(line);
    if (roleKey && roleKey !== currentStep) {
      const dbStepKey = roleToStepKey[roleKey] || roleKey;
        if (currentStep) {
          const prevDbKey = roleToStepKey[currentStep] || currentStep;
          await setRunStepState(runId, prevDbKey, "PASSED");

          // Trigger intermediate artifact ingestion when transitioning
          if (roleKey === "specialist" || roleKey === "qa" || roleKey === "reality_checker") {
            try {
              await sleep(1000);
              const runFolder = await resolveArtifactRunFolder(outputRoot, runId);
            
              if (runFolder && existsSync(runFolder)) {
                await ingestArtifacts(runId, runFolder, dbStepKey, roleToStepKey);
              }
            } catch (e) {
            console.error("Intermediate ingestion failed", e);
          }
        }
      }
      currentStep = roleKey;
      currentDbStepKey = dbStepKey;
      await setRunStepState(runId, dbStepKey, "RUNNING");
    }

    // Always log with the latest resolved DB key, fallback to orchestrator for early logs
    const activeStepKey = currentDbStepKey || roleToStepKey.orchestrator || "orchestrator";
    await appendLog(runId, line.trim(), "info", activeStepKey);
  };

  child.stdout.on("data", (chunk: Buffer) => {
    stdoutBuffer += chunk.toString("utf8");
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) {
      void handleLine(line).catch(err => {
        console.error(`[runRealPipeline] Error handling line: ${err}`);
        void appendLog(runId, `Internal handler error: ${err}`, "error", currentDbStepKey || undefined);
      });
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderrBuffer += chunk.toString("utf8");
    const lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop() ?? "";
    for (const line of lines) {
      const activeStepKey = currentDbStepKey || roleToStepKey.orchestrator || "orchestrator";
      void appendLog(runId, line.trim(), "error", activeStepKey);
    }
  });

  child.on("error", (err) => {
    console.error(`[runRealPipeline] Process spawn error: ${err}`);
    void appendLog(runId, `Failed to start runner: ${err.message}`, "error", "orchestrator");
  });

  await new Promise<void>((resolve) => {
    child.on("close", async (code) => {
      const activeStepKey = currentDbStepKey || roleToStepKey.orchestrator || "orchestrator";
      if (stdoutBuffer.trim()) {
        await handleLine(stdoutBuffer);
      }
      if (stderrBuffer.trim()) {
        await appendLog(runId, stderrBuffer.trim(), "error", activeStepKey);
      }

      try {
        const runFolder = await resolveArtifactRunFolder(outputRoot, runId);
        
        if (runFolder && existsSync(runFolder)) {
          const finalDbKey = roleToStepKey[currentStep || "specialist"] || (currentStep || "specialist");
          await ingestArtifacts(runId, runFolder, finalDbKey, roleToStepKey);
          await db
            .update(schema.run)
            .set({ outputRoot: runFolder })
            .where(eq(schema.run.id, runId));

          const summaryPath = path.join(runFolder, "SUMMARY.md");
          try {
            const summaryContent = await readFile(summaryPath, "utf8");
            const verdict =
              summaryContent.toUpperCase().includes("NEEDS WORK")
                ? "NEEDS_WORK"
                : "READY";
            await db
              .update(schema.run)
              .set({ verdict })
              .where(eq(schema.run.id, runId));
          } catch {
            // Ignore summary parsing errors.
          }
        }

        if (currentDbStepKey) {
          await setRunStepState(
            runId,
            currentDbStepKey,
            code === 0 ? "PASSED" : "FAILED",
          );
        }

        await db
          .update(schema.run)
          .set({
            status: code === 0 ? "COMPLETED" : "FAILED",
            completedAt: new Date(),
            errorMessage:
              code === 0 ? null : "Runner process exited with a non-zero code.",
          })
          .where(eq(schema.run.id, runId));
      } finally {
        resolve();
      }
    });
  });
}

export async function startRun(input: StartRunInput) {
  const workflow = await db.query.workflow.findFirst({
    where: eq(schema.workflow.id, input.workflowId),
  });

  if (!workflow) throw new Error("Workflow not found");

  const runId = crypto.randomUUID();
  let steps: StepDefinition[] = [];

  const workflowNodes = workflow.nodes as any[];
  if (workflowNodes && Array.isArray(workflowNodes)) {
    const agents = workflowNodes.filter((n) => n.type === "agent");
    if (agents.length > 0) {
      steps = agents.map((n, idx) => ({
        key: n.id,
        title: n.data?.label || `Agent ${idx + 1}`,
        order: idx + 1,
      }));
    }
  }

  if (steps.length === 0) {
    steps = getSteps(input.includeMarketing);
  }

  await db.transaction(async (tx) => {
    await tx.insert(schema.run).values({
      id: runId,
      workflowId: input.workflowId,
      objective: input.objective,
      provider: input.provider,
      model: input.model,
      includeMarketing: input.includeMarketing,
      dryRun: input.dryRun,
      startedById: input.startedById,
      status: "QUEUED",
      updatedAt: new Date(),
    });

    for (const step of steps) {
      await tx.insert(schema.runStep).values({
        id: crypto.randomUUID(),
        runId,
        key: step.key,
        title: step.title,
        order: step.order,
        status: "PENDING",
      });
    }
  });

  const runWithRelations = await db.query.run.findFirst({
    where: eq(schema.run.id, runId),
    with: {
      workflow: true,
      steps: {
        orderBy: [asc(schema.runStep.order)],
      },
    },
  });

  if (!runWithRelations) throw new Error("Run not found after creation");

  await appendLog(
    runId,
    `Run queued by ${input.startedByRole} using ${input.provider}:${input.model}`,
    "info",
    "orchestrator"
  );

  if (isMockMode) {
    void runMockPipeline(runId, input.objective, input.includeMarketing).catch(
      async (error: unknown) => {
        await db
          .update(schema.run)
          .set({
            status: "FAILED",
            verdict: "NEEDS_WORK",
            errorMessage: String(error),
            completedAt: new Date(),
          })
          .where(eq(schema.run.id, runId));
        await appendLog(runId, String(error), "error");
      },
    );
  } else {
    void runRealPipeline(
      runId,
      input.objective,
      input.provider,
      input.model,
      input.includeMarketing,
      input.dryRun,
    ).catch(async (error: unknown) => {
      await db
        .update(schema.run)
        .set({
          status: "FAILED",
          verdict: "NEEDS_WORK",
          errorMessage: String(error),
          completedAt: new Date(),
        })
        .where(eq(schema.run.id, runId));
      await appendLog(runId, String(error), "error");
    });
  }

  return runWithRelations;
}
