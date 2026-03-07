import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-guards";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { startRun } from "@/lib/run-engine";
import { eq, like } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiRole(request, "client");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const isShortHash = id.length === 8 && /^[a-f0-9]+$/i.test(id);
  const previousRun = await db.query.run.findFirst({
    where: isShortHash 
      ? like(schema.run.id, `${id}%`)
      : eq(schema.run.id, id),
  });

  if (!previousRun) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const run = await startRun({
    workflowId: previousRun.workflowId,
    objective: previousRun.objective,
    provider: previousRun.provider,
    model: previousRun.model,
    includeMarketing: previousRun.includeMarketing,
    dryRun: previousRun.dryRun,
    startedById: auth.session.user.id,
    startedByRole: auth.session.user.role as "admin" | "client",
  });

  await db.insert(schema.auditLog).values({
    id: crypto.randomUUID(),
    userId: auth.session.user.id,
    action: "run.retried",
    entityType: "run",
    entityId: run.id,
    metadata: {
      sourceRunId: previousRun.id,
    },
  });

  return NextResponse.json({ runId: run.id }, { status: 201 });
}
