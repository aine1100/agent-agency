import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireApiSession } from "@/lib/api-guards";
import { eq, asc, like } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const isShortHash = id.length === 8 && /^[a-f0-9]+$/i.test(id);
  const run = await db.query.run.findFirst({
    where: isShortHash 
      ? like(schema.run.id, `${id}%`)
      : eq(schema.run.id, id),
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
      artifacts: {
        orderBy: [asc(schema.artifact.createdAt)],
      },
      logs: {
        orderBy: [asc(schema.runLog.createdAt)],
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({ run });
}
