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

async function appendLog(runId: string, message: string, level = "info") {
  await db.insert(schema.runLog).values({
    id: crypto.randomUUID(),
    runId,
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

async function ingestArtifacts(runId: string, artifactRoot: string) {
  const files = await collectFiles(artifactRoot);
  const values: (typeof schema.artifact.$inferInsert)[] = [];

  for (const filePath of files) {
    const fileStats = await stat(filePath);
    const relativePath = path.relative(artifactRoot, filePath).replace(/\\/g, "/");
    const extension = path.extname(filePath).toLowerCase();
    const kind =
      extension === ".md"
        ? "markdown"
        : extension === ".txt"
          ? "text"
          : extension === ".json"
            ? "json"
            : extension === ".html" || extension === ".css" || extension === ".js"
              ? "code"
              : "file";

    values.push({
      id: crypto.randomUUID(),
      runId,
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
  const marketingRoot = path.join(runRoot, "marketing");

  await mkdir(appRoot, { recursive: true });
  await mkdir(marketingRoot, { recursive: true });

  const summary = `# Mock Run Summary

- Run: ${runId}
- Objective: ${objective}
- Verdict: READY
`;

  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Todo App</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <main class="shell">
      <h1>Todo App</h1>
      <div class="row">
        <input id="taskInput" placeholder="Add a task..." />
        <button id="addBtn">Add</button>
      </div>
      <ul id="taskList"></ul>
    </main>
    <script src="./app.js"></script>
  </body>
</html>
`;

  const styleCss = `:root{color-scheme:light dark}body{font-family:system-ui;background:#10131f;color:#f1f3f5;margin:0}.shell{max-width:640px;margin:56px auto;padding:24px;border-radius:16px;background:#1a2033}.row{display:flex;gap:8px}input{flex:1;padding:12px;border-radius:10px;border:1px solid #3a4466;background:#12182b;color:#fff}button{padding:12px 16px;border-radius:10px;border:0;background:#5eead4;color:#0b1020;font-weight:700}li{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #2a3352}.done{text-decoration:line-through;opacity:.6}`;

  const appJs = `const input=document.getElementById("taskInput");const addBtn=document.getElementById("addBtn");const list=document.getElementById("taskList");const key="todo_items";let tasks=JSON.parse(localStorage.getItem(key)||"[]");const save=()=>localStorage.setItem(key,JSON.stringify(tasks));const render=()=>{list.innerHTML="";tasks.forEach((t,i)=>{const li=document.createElement("li");const a=document.createElement("button");a.textContent=t.done?"Undo":"Done";a.onclick=()=>{tasks[i].done=!tasks[i].done;save();render();};const d=document.createElement("button");d.textContent="Delete";d.onclick=()=>{tasks.splice(i,1);save();render();};const s=document.createElement("span");s.textContent=t.text;s.className=t.done?"done":"";const c=document.createElement("div");c.append(a,d);li.append(s,c);list.append(li);});};addBtn.onclick=()=>{const text=input.value.trim();if(!text)return;tasks.push({text,done:false});input.value="";save();render();};render();`;

  await writeFile(path.join(runRoot, "SUMMARY.md"), summary, "utf8");
  await writeFile(path.join(appRoot, "index.html"), indexHtml, "utf8");
  await writeFile(path.join(appRoot, "style.css"), styleCss, "utf8");
  await writeFile(path.join(appRoot, "app.js"), appJs, "utf8");
  await writeFile(
    path.join(appRoot, "README.md"),
    `# Generated Todo App\n\nObjective: ${objective}\n`,
    "utf8",
  );

  if (includeMarketing) {
    await writeFile(
      path.join(marketingRoot, "marketing-plan.md"),
      `# Marketing Plan\n\n- Target: productivity users\n- Positioning: fast local-first todo app\n`,
      "utf8",
    );
    await writeFile(
      path.join(marketingRoot, "social-posts.md"),
      `# Social Posts\n\n1. Meet your fast local-first todo app.\n2. Add, complete, and organize tasks in seconds.\n`,
      "utf8",
    );
    await writeFile(
      path.join(marketingRoot, "landing-page-copy.md"),
      `# Landing Copy\n\n## Headline\nShip your day with confidence.\n`,
      "utf8",
    );
    await writeFile(
      path.join(marketingRoot, "value-proposition.md"),
      `# Value Proposition\n\nA clean todo experience with no setup overhead.\n`,
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
    await appendLog(runId, `Starting ${step.title}...`);
    await sleep(1200);
    await setRunStepState(runId, step.key, "PASSED");
    await appendLog(runId, `${step.title} completed.`);
  }

  const artifactRoot = await writeMockArtifacts(runId, objective, includeMarketing);
  await ingestArtifacts(runId, artifactRoot);
  await appendLog(runId, "Artifacts generated.");

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
}

async function runRealPipeline(
  runId: string,
  objective: string,
  provider: (typeof schema.providerTypeEnum.enumValues)[number],
  model: string,
  includeMarketing: boolean,
  dryRun: boolean,
) {
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

  await appendLog(runId, `Starting real run via ${scriptPath}`);

  const child = spawn("powershell.exe", args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let currentStep: string | null = null;
  let stdoutBuffer = "";
  let stderrBuffer = "";

  const handleLine = async (line: string) => {
    if (!line.trim()) return;
    await appendLog(runId, line.trim());
    const stepKey = parseStepFromLine(line);
    if (stepKey && stepKey !== currentStep) {
      if (currentStep) {
        await setRunStepState(runId, currentStep, "PASSED");
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
      void appendLog(runId, line.trim(), "error");
    }
  });

  await new Promise<void>((resolve) => {
    child.on("close", async (code) => {
      if (stdoutBuffer.trim()) {
        await handleLine(stdoutBuffer);
      }
      if (stderrBuffer.trim()) {
        await appendLog(runId, stderrBuffer.trim(), "error");
      }

      try {
        const runFolder = await findLatestRunFolder(outputRoot);
        if (runFolder) {
          await ingestArtifacts(runId, runFolder);
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
  const steps = getSteps(input.includeMarketing);
  const runId = crypto.randomUUID();

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
