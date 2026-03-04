import type * as schema from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";

export async function requireDashboardSession() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/sign-in");
  }
  return session;
}

export async function requireDashboardRole(requiredRole: (typeof schema.roleEnum.enumValues)[number]) {
  const session = await requireDashboardSession();
  const userRole = session.user.role as (typeof schema.roleEnum.enumValues)[number];

  if (!hasRole(userRole, requiredRole)) {
    redirect("/dashboard");
  }

  return session;
}
