import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireApiSession } from "@/lib/api-guards";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string; path: string[] }> };

const MIME_TYPES: Record<string, string> = {
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
};

export async function GET(request: Request, { params }: RouteParams) {
    const auth = await requireApiSession(request);
    if (!auth.ok) return auth.response;

    const { id, path: pathSegments } = await params;
    const relativePath = pathSegments.join("/");

    const run = await db.query.run.findFirst({
        where: eq(schema.run.id, id),
        columns: { outputRoot: true },
    });

    if (!run?.outputRoot) {
        return new Response("Run output not found.", { status: 404 });
    }

    const normalized = relativePath.replace(/\\/g, "/");
    if (normalized.includes("..")) {
        return new Response("Invalid path.", { status: 400 });
    }

    const absoluteRoot = path.resolve(run.outputRoot);
    const absolutePath = path.resolve(path.join(absoluteRoot, normalized));

    if (!absolutePath.startsWith(absoluteRoot)) {
        return new Response("Invalid path.", { status: 400 });
    }

    try {
        const fileStats = await stat(absolutePath);
        if (!fileStats.isFile()) {
            return new Response("Not a file.", { status: 400 });
        }

        const buffer = await readFile(absolutePath);
        const ext = path.extname(absolutePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        return new Response(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' *; img-src * data:; style-src 'self' 'unsafe-inline' *; font-src * data:;",
            },
        });
    } catch (error) {
        console.error("Error serving raw file:", error);
        return new Response("File not found.", { status: 404 });
    }
}
