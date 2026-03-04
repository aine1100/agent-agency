"use client";

import { Search, Bell, Clock, LayoutGrid, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { AuthSession } from "@/lib/auth";

export function DashboardNavbar({ session }: { session: AuthSession }) {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    return (
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
            <div className="flex items-center gap-4">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm">
                    {segments.map((segment, index) => {
                        const href = `/${segments.slice(0, index + 1).join("/")}`;
                        const isLast = index === segments.length - 1;
                        const label = segment.charAt(0).toUpperCase() + segment.slice(1);

                        return (
                            <div key={href} className="flex items-center gap-2">
                                {index > 0 && <ChevronRight className="h-3 w-3 text-muted" />}
                                <Link
                                    href={href}
                                    className={cn(
                                        "transition-colors",
                                        isLast ? "font-semibold text-brand-purple" : "text-muted hover:text-foreground"
                                    )}
                                >
                                    {label}
                                </Link>
                            </div>
                        );
                    })}
                </nav>
            </div>

            <div className="flex items-center gap-3">
                {/* Search Bar - VitaHealth style */}
                <div className="relative hidden md:block group">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted group-focus-within:text-brand-purple transition-colors" />
                    <input
                        type="text"
                        placeholder="Search system logs..."
                        className="h-9 w-64 rounded-xl border border-border bg-card pl-10 pr-4 text-xs outline-none focus:ring-1 focus:ring-brand-purple/20 focus:border-brand-purple/50 transition-all font-medium"
                    />
                </div>

                {/* Action Icons */}
                <div className="flex items-center gap-1 border-x border-border px-3">
                    <button className="rounded-lg p-2 text-muted hover:bg-brand-purple/5 hover:text-brand-purple transition-colors">
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button className="rounded-lg p-2 text-muted hover:bg-brand-purple/5 hover:text-brand-purple transition-colors">
                        <Clock className="h-4 w-4" />
                    </button>
                    <button className="relative rounded-lg p-2 text-muted hover:bg-brand-purple/5 hover:text-brand-purple transition-colors">
                        <Bell className="h-4 w-4" />
                        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-purple shadow-[0_0_8px_var(--brand-purple)]" />
                    </button>
                </div>

                {/* Profile / System */}
                <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-purple text-xs font-semibold text-white shadow-sm transition hover:opacity-90">
                    {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U"}
                </button>
            </div>
        </header>
    );
}
