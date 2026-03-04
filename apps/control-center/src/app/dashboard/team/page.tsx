import { getTeamMembers } from "@/lib/services/dashboard-service";
import {
  Users,
  UserPlus,
  Mail,
  ShieldCheck,
  MoreHorizontal,
  Search,
  Filter,
  ShieldAlert,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

export default async function TeamPage() {
  const members = await getTeamMembers();

  return (
    <div className="space-y-6 pb-12">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Directory</h1>
          <p className="mt-1 text-xs text-muted">Manage access control and collaboration within your workspace.</p>
        </div>

        <button className="flex h-10 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-card hover:opacity-90 transition-opacity">
          <UserPlus className="h-4 w-4" />
          Invite Colleague
        </button>
      </div>

      {/* Team Container */}
      <section className="rounded-3xl border border-border bg-card overflow-hidden">
        {/* Search & Filters */}
        <div className="flex items-center gap-2 border-b border-border p-4 bg-background/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              placeholder="Search by name or email..."
              className="h-10 w-full rounded-xl border border-border bg-background/50 pl-9 pr-4 text-xs outline-none focus:ring-1 focus:ring-foreground/10"
            />
          </div>
          <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background/50 px-4 text-xs font-semibold text-muted hover:text-foreground">
            <Filter className="h-3.5 w-3.5" />
            Role
          </button>
        </div>

        {/* Team Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/30 text-[10px] font-semibold text-muted">
              <tr>
                <th className="w-12 px-6 py-4">
                  <div className="h-4 w-4 rounded border border-border" />
                </th>
                <th className="px-6 py-4">Member Name</th>
                <th className="px-6 py-4 text-center">Security Role</th>
                <th className="px-6 py-4">Account Status</th>
                <th className="px-6 py-4 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => (
                <tr key={member.email} className="group hover:bg-foreground/[0.01] transition-colors leading-none">
                  <td className="px-6 py-5">
                    <div className="h-4 w-4 rounded border border-border group-hover:border-muted transition-colors" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5 text-foreground border border-border text-xs font-semibold">
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-foreground">{member.name}</span>
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold border",
                        member.role === "admin" ? "bg-status-red/5 text-status-red border-status-red/10" : "bg-foreground/5 text-muted border-foreground/10"
                      )}>
                        {member.role === "admin" ? <ShieldAlert className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                        {member.role}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-status-green animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-xs font-semibold text-foreground">{member.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-foreground hover:text-card">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Stats / Info */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-6 space-y-2 card-gradient">
          <Users className="h-5 w-5 text-foreground" />
          <h3 className="font-semibold text-foreground">Team Capacity</h3>
          <p className="text-sm text-muted">3 of 10 seats used in this workspace.</p>
        </div>
      </div>
    </div>
  );
}
