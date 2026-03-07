import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-guards";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, inArray, and, like } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiRole(request, "client");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const isShortHash = id.length === 8 && /^[a-f0-9]+$/i.test(id);
  const run = await db.query.run.findFirst({
    where: isShortHash 
      ? like(schema.run.id, `${id}%`)
      : eq(schema.run.id, id),
    with: { steps: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (run.status === "COMPLETED" || run.status === "FAILED") {
    return NextResponse.json({ error: "Run has already finished." }, { status: 409 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.run)
      .set({
        status: "CANCELED",
        completedAt: new Date(),
        errorMessage: "Canceled by user.",
      })
      .where(eq(schema.run.id, run.id)); // Use actual run.id

    await tx
      .update(schema.runStep)
      .set({
        status: "SKIPPED",
        completedAt: new Date(),
        details: "Canceled by user.",
      })
      .where(
        and(
          eq(schema.runStep.runId, run.id), // Use actual run.id
          inArray(schema.runStep.status, ["PENDING", "RUNNING"]),
        ),
      );

    await tx.insert(schema.runLog).values({
      id: crypto.randomUUID(),
      runId: run.id, // Use actual run.id
      level: "warn",
      message: `Run canceled by ${auth.session.user.email}`,
    });
  });

  return NextResponse.json({ canceled: true });
}
