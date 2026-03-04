import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireApiSession } from "@/lib/api-guards";
import { desc, asc } from "drizzle-orm";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100);

  const runs = await db.query.run.findMany({
    limit: Number.isFinite(limit) ? limit : 30,
    orderBy: [desc(schema.run.createdAt)],
    with: {
      workflow: true,
      steps: {
        orderBy: [asc(schema.runStep.order)],
      },
      startedBy: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({ runs });
}
