import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireApiSession } from "@/lib/api-guards";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const filePath = new URL(request.url).searchParams.get("path");
  if (!filePath) {
    return NextResponse.json(
      { error: "Missing required query parameter: path" },
      { status: 400 },
    );
  }

  const run = await db.query.run.findFirst({
    where: eq(schema.run.id, id),
    columns: { outputRoot: true },
  });

  if (!run?.outputRoot) {
    return NextResponse.json({ error: "Run output not found." }, { status: 404 });
  }

  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("..")) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const absoluteRoot = path.resolve(run.outputRoot);
  const absolutePath = path.resolve(path.join(absoluteRoot, normalized));

  if (!absolutePath.startsWith(absoluteRoot)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  try {
    const fileStats = await stat(absolutePath);
    if (!fileStats.isFile()) {
      return NextResponse.json({ error: "Not a file." }, { status: 400 });
    }
    const content = await readFile(absolutePath, "utf8");
    return NextResponse.json({ path: normalized, content, size: fileStats.size });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
