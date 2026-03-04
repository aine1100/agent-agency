import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/api-guards";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { startRun } from "@/lib/run-engine";
import { eq } from "drizzle-orm";

const payloadSchema = z.object({
  workflowId: z.string().min(1),
  provider: z.enum(["openai", "ollama"]).default("openai"),
  model: z.string().min(1).default("gpt-4o-mini"),
  includeMarketing: z.boolean().default(true),
  dryRun: z.boolean().default(false),
});

export async function POST(request: Request) {
  const auth = await requireApiRole(request, "client");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const workflow = await db.query.workflow.findFirst({
    where: eq(schema.workflow.id, parsed.data.workflowId),
  });

  if (!workflow || !workflow.active) {
    return NextResponse.json(
      { error: "Workflow not found or inactive." },
      { status: 404 },
    );
  }

  const provider =
    parsed.data.provider === "openai" ? "OPENAI" : "OLLAMA";

  const run = await startRun({
    workflowId: workflow.id,
    objective: workflow.objectiveTemplate,
    provider,
    model: parsed.data.model,
    includeMarketing: parsed.data.includeMarketing,
    dryRun: parsed.data.dryRun,
    startedById: auth.session.user.id,
    startedByRole: auth.session.user.role as "client" | "admin",
  });

  await db.insert(schema.auditLog).values({
    id: crypto.randomUUID(),
    userId: auth.session.user.id,
    action: "run.started",
    entityType: "run",
    entityId: run.id,
    metadata: {
      workflowId: workflow.id,
      provider,
      model: parsed.data.model,
    },
  });

  return NextResponse.json({ runId: run.id }, { status: 201 });
}
