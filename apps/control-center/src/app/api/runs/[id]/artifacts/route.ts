import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireApiSession } from "@/lib/api-guards";
import { eq, asc } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const artifacts = await db.query.artifact.findMany({
    where: eq(schema.artifact.runId, id),
    orderBy: [asc(schema.artifact.createdAt)],
  });

  return NextResponse.json({ artifacts });
}
