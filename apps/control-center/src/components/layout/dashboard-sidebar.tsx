"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Layers,
  Settings,
  Users,
  Home,
  Settings2,
  HelpCircle,
  LogOut,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  {
    title: "MAIN MENU",
    items: [
      { href: "/dashboard/chat", label: "AI Chat", icon: Sparkles },
      { href: "/dashboard", label: "Overview", icon: Home },
      { href: "/dashboard/workflows", label: "Workflows", icon: Layers },
      { href: "/dashboard/runs", label: "Run History", icon: History },
    ]
  },
  {
    title: "ADMINISTRATIVE",
    items: [
      { href: "/dashboard/team", label: "Team Members", icon: Users },
      { href: "/dashboard/settings", label: "System Config", icon: Settings },
    ]
  }
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-card">
      {/* Logo Area */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]">
            <Settings2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Agency</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-4 text-[10px] font-semibold text-muted">
              {section.title}
            </p>
            <nav className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all outline-none",
                      isActive
                        ? "bg-brand-purple/5 text-brand-purple"
                        : "text-muted hover:bg-brand-purple/[0.03] hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-brand-purple" />
                    )}
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors shadow-sm",
                      isActive ? "bg-brand-purple text-white" : "bg-card border border-border text-muted group-hover:text-foreground group-hover:border-muted"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={cn(
                      "transition-colors",
                      isActive ? "font-semibold" : "font-medium"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border p-3 space-y-1">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-white/5 hover:text-foreground transition-all">
          <HelpCircle className="h-4 w-4" />
          Support Help
        </button>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-white/5 hover:text-status-red transition-all">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
