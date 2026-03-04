import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireApiRole } from "@/lib/api-guards";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(8).optional(),
  objectiveTemplate: z.string().min(16).optional(),
  defaultDomainAgent: z.string().min(3).optional(),
  defaultProvider: z.enum(["OPENAI", "OLLAMA"]).optional(),
  defaultModel: z.string().min(2).optional(),
  includeMarketing: z.boolean().optional(),
  active: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireApiRole(request, "admin");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  await db
    .update(schema.workflow)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(schema.workflow.id, id));

  const workflow = await db.query.workflow.findFirst({
    where: eq(schema.workflow.id, id),
  });

  return NextResponse.json({ workflow });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireApiRole(request, "admin");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await db.delete(schema.workflow).where(eq(schema.workflow.id, id));

  return new NextResponse(null, { status: 204 });
}
