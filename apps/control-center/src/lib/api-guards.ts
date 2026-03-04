import type * as schema from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";

export async function requireApiSession(request: Request) {
  const session = await getRequestSession(request);
  if (!session?.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    ok: true as const,
    session,
  };
}

export async function requireApiRole(request: Request, required: (typeof schema.roleEnum.enumValues)[number]) {
  const sessionResult = await requireApiSession(request);
  if (!sessionResult.ok) {
    return sessionResult;
  }

  const userRole = sessionResult.session.user.role as (typeof schema.roleEnum.enumValues)[number];
  if (!hasRole(userRole, required)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return sessionResult;
}
