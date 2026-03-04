import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireApiRole, requireApiSession } from "@/lib/api-guards";
import { desc } from "drizzle-orm";

const createSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(8),
  objectiveTemplate: z.string().min(16),
  defaultDomainAgent: z.string().min(3),
  defaultProvider: z.enum(["OPENAI", "OLLAMA"]).default("OPENAI"),
  defaultModel: z.string().min(2),
  includeMarketing: z.boolean().default(true),
  active: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

export async function GET(request: Request) {
  const auth = await requireApiSession(request);
  if (!auth.ok) return auth.response;

  const workflows = await db.query.workflow.findMany({
    orderBy: [desc(schema.workflow.createdAt)],
  });
  return NextResponse.json({ workflows });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(request, "admin");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const workflowId = crypto.randomUUID();
  await db.insert(schema.workflow).values({
    id: workflowId,
    ...parsed.data,
    updatedAt: new Date(),
  });

  const workflow = await db.query.workflow.findFirst({
    where: (table, { eq }) => eq(table.id, workflowId),
  });

  return NextResponse.json({ workflow }, { status: 201 });
}
