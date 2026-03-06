import { spawn } from "node:child_process";
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

async function ingestArtifacts(runId: string, artifactRoot: string, fallbackStepKey?: string) {
  const files = await collectFiles(artifactRoot);
  const values: (typeof schema.artifact.$inferInsert)[] = [];

  for (const filePath of files) {
    const fileStats = await stat(filePath);
    const relativePath = path.relative(artifactRoot, filePath).replace(/\\/g, "/");
    const extension = path.extname(filePath).toLowerCase();
    
    // Determine the most appropriate step for this artifact
    let stepKey = fallbackStepKey;
    if (relativePath.includes("marketing/")) {
      stepKey = "marketing";
    } else if (relativePath.includes("app/") || [".html", ".js", ".jsx", ".tsx", ".css"].includes(extension)) {
      stepKey = "specialist";
    } else if (relativePath.includes("SUMMARY") || relativePath.includes("final")) {
      stepKey = "reality_checker";
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

  for (const step of getSteps(includeMarketing)) {
    await setRunStepState(runId, step.key, "RUNNING");
    await appendLog(runId, `Starting ${step.title}...`, "info", step.key);
    await sleep(1200);
    await setRunStepState(runId, step.key, "PASSED");
    await appendLog(runId, `${step.title} completed.`, "info", step.key);
  }

  const artifactRoot = await writeMockArtifacts(runId, objective, includeMarketing);
  await ingestArtifacts(runId, artifactRoot, "specialist");
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

function getAgentFileForRole(role: string, customPath?: string) {
  if (customPath) {
    return customPath.startsWith("./") ? customPath : `./${customPath}`;
  }
  const map: Record<string, string> = {
    "Orchestrator": "./specialized/agents-orchestrator.md",
    "Specialist": "./engineering/engineering-frontend-developer.md",
    "QA": "./testing/testing-evidence-collector.md",
    "Reality Checker": "./testing/testing-reality-checker.md",
    "Marketing": "./marketing/marketing-content-creator.md",
  };
  return map[role] || map["Specialist"];
}

async function runAgentStep(
  runId: string,
  stepKey: string,
  agentFile: string,
  task: string,
  provider: string,
  model: string,
  outputRoot: string
) {
  const scriptPath = path.resolve(process.cwd(), "tools/run-agent.ps1");
  const args = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
    "-AgentFile",
    agentFile,
    "-Task",
    task,
    "-Provider",
    provider,
    "-Model",
    model,
  ];

  await appendLog(runId, `Executing Agent: ${agentFile}`, "info", stepKey);

  return new Promise<string>((resolve, reject) => {
    const child = spawn("powershell.exe", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      // Also log chunks for visibility
      void appendLog(runId, chunk.trim(), "info", stepKey);
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      void appendLog(runId, chunk.trim(), "error", stepKey);
    });

    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`Agent failed with exit code ${code}: ${stderr}`));
    });
  });
}

async function runDynamicPipeline(
  runId: string,
  objective: string,
  provider: (typeof schema.providerTypeEnum.enumValues)[number],
  model: string,
  nodes: any[],
  edges: any[]
) {
  await db
    .update(schema.run)
    .set({ status: "RUNNING", startedAt: new Date() })
    .where(eq(schema.run.id, runId));

  const outputRoot = path.resolve(process.cwd(), env.RUN_OUTPUT_ROOT, `dashboard-run-${runId}`);
  await mkdir(outputRoot, { recursive: true });

  // Determine execution order by following edges from triggers
  const triggers = nodes.filter(n => n.type === 'trigger');
  const executionOrder: any[] = [];
  const visited = new Set<string>();
  const queue = [...triggers.map(t => t.id)];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentNode = nodes.find(n => n.id === currentId);
    if (currentNode && currentNode.type === 'agent') {
      executionOrder.push(currentNode);
    }

    // Follow edges
    const childrenIds = edges
      .filter(e => e.source === currentId)
      .map(e => e.target);
    
    queue.push(...childrenIds);
  }

  // Fallback: if no connections/triggers, run all agents in array order
  const agentsToRun = executionOrder.length > 0 ? executionOrder : nodes.filter(n => n.type === 'agent');

  let context = objective;

  for (const node of agentsToRun) {
    const stepKey = node.id;
    await setRunStepState(runId, stepKey, "RUNNING");
    
    try {
      const agentFile = getAgentFileForRole(node.data?.role || "Specialist", node.data?.filePath);
      const output = await runAgentStep(
        runId,
        stepKey,
        agentFile,
        `Objective: ${objective}\n\nContext from previous steps:\n${context.slice(0, 5000)}`,
        toProviderName(provider),
        model,
        outputRoot
      );

      // Simple context chaining
      context = output;
      
      await setRunStepState(runId, stepKey, "PASSED");
    } catch (error) {
      await setRunStepState(runId, stepKey, "FAILED", String(error));
      throw error;
    }
  }

  // Finalize
  await db
    .update(schema.run)
    .set({
      status: "COMPLETED",
      verdict: "READY",
      completedAt: new Date(),
    })
    .where(eq(schema.run.id, runId));
}

async function runRealPipeline(
  runId: string,
  objective: string,
  provider: (typeof schema.providerTypeEnum.enumValues)[number],
  model: string,
  includeMarketing: boolean,
  dryRun: boolean,
) {
  // Check for dynamic graph definition
  const runData = await db.query.run.findFirst({
    where: eq(schema.run.id, runId),
    with: { workflow: true }
  });

  if (runData?.workflow?.nodes && Array.isArray(runData.workflow.nodes) && (runData.workflow.nodes as any[]).length > 0) {
    return runDynamicPipeline(runId, objective, provider, model, runData.workflow.nodes as any[], runData.workflow.edges as any[]);
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
  ];

  if (!includeMarketing) {
    args.push("-SkipMarketing");
  }
  if (dryRun) {
    args.push("-DryRun");
  }

  await appendLog(runId, `Starting real run via ${scriptPath}`, "info", "orchestrator");

  const child = spawn("powershell.exe", args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let currentStep: string | null = null;
  let stdoutBuffer = "";
  let stderrBuffer = "";

  const handleLine = async (line: string) => {
    if (!line.trim()) return;
    await appendLog(runId, line.trim(), "info", currentStep || undefined);
    const stepKey = parseStepFromLine(line);
    if (stepKey && stepKey !== currentStep) {
      if (currentStep) {
        await setRunStepState(runId, currentStep, "PASSED");
        
        // Trigger intermediate artifact ingestion when transitioning from specialist
        if (currentStep === "specialist" || currentStep === "orchestrator") {
           try {
             // We use a slight delay to ensure file handles are released by the powershell script
             await sleep(1000);
             const runFolder = await findLatestRunFolder(outputRoot);
             if (runFolder) {
               await ingestArtifacts(runId, runFolder, currentStep);
             }
           } catch (e) {
             console.error("Intermediate ingestion failed", e);
           }
        }
      }
      currentStep = stepKey;
      await setRunStepState(runId, currentStep, "RUNNING");
    }
  };

  child.stdout.on("data", (chunk: Buffer) => {
    stdoutBuffer += chunk.toString("utf8");
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) {
      void handleLine(line);
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderrBuffer += chunk.toString("utf8");
    const lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop() ?? "";
    for (const line of lines) {
      void appendLog(runId, line.trim(), "error", currentStep || undefined);
    }
  });

  await new Promise<void>((resolve) => {
    child.on("close", async (code) => {
      if (stdoutBuffer.trim()) {
        await handleLine(stdoutBuffer);
      }
      if (stderrBuffer.trim()) {
        await appendLog(runId, stderrBuffer.trim(), "error", currentStep || undefined);
      }

      try {
        const runFolder = await findLatestRunFolder(outputRoot);
        if (runFolder) {
          await ingestArtifacts(runId, runFolder, currentStep || "specialist");
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

        if (currentStep) {
          await setRunStepState(
            runId,
            currentStep,
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

  // Check if we have a dynamic graph defined
  if (workflow.nodes && Array.isArray(workflow.nodes) && (workflow.nodes as any[]).length > 0) {
    const nodes = workflow.nodes as any[];
    const edges = (workflow.edges as any[]) || [];
    
    // Determine execution order by following edges from triggers
    const triggers = nodes.filter(n => n.type === 'trigger');
    const traversalOrder: any[] = [];
    const visited = new Set<string>();
    const queue = [...triggers.map(t => t.id)];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentNode = nodes.find(n => n.id === currentId);
      if (currentNode && currentNode.type === 'agent') {
        traversalOrder.push(currentNode);
      }

      const childrenIds = edges
        .filter(e => e.source === currentId)
        .map(e => e.target);
      
      queue.push(...childrenIds);
    }

    const agentsToRegister = traversalOrder.length > 0 ? traversalOrder : nodes.filter(n => n.type === 'agent');

    steps = agentsToRegister.map((n, idx) => ({
      key: n.id,
      title: n.data?.label || `Agent ${idx + 1}`,
      order: idx + 1
    }));
  } else {
    // Fallback to hardcoded pipeline
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
