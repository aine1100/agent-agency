import { History, Layers, TerminalSquare, TrendingUp, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export type DashboardStats = {
    label: string;
    value: string | number;
    icon: any;
    color: string;
};

export type RecentRun = {
    id: string;
    workflowName: string;
    status: "COMPLETED" | "FAILED" | "RUNNING" | "QUEUED" | "CANCELED";
    startedAt: Date;
};

export type Workflow = {
    id: string;
    name: string;
    slug: string;
    description: string;
    active: boolean;
    objectiveTemplate: string;
    defaultDomainAgent: string;
    defaultProvider: "OPENAI" | "OLLAMA";
    defaultModel: string;
    includeMarketing: boolean;
    tags: string[] | null;
    createdAt: Date;
    updatedAt: Date;
};

export type Run = {
    id: string;
    workflowName: string;
    status: "COMPLETED" | "FAILED" | "RUNNING" | "QUEUED" | "CANCELED";
    createdAt: Date;
    startedBy: { name: string; email: string } | null;
};

export type RunStep = {
    id: string;
    key: string;
    title: string;
    status: "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "SKIPPED";
    startedAt?: Date;
    completedAt?: Date;
    details?: string;
};

export type RunLog = {
    id: string;
    stepKey: string | null;
    level: "info" | "warn" | "error";
    message: string;
    createdAt: Date;
};

export type Artifact = {
    id: string;
    stepKey: string | null;
    path: string;
    kind: string;
    size: number;
};

export async function getDashboardData(userId: string) {
    const stats: DashboardStats[] = [
        { label: "Active Workflows", value: 12, icon: Layers, color: "text-cyan-400" },
        { label: "Total Runs", value: 148, icon: History, color: "text-blue-400" },
        { label: "Success Rate", value: "94.5%", icon: TrendingUp, color: "text-emerald-400" },
        { label: "Avg. Duration", value: "38s", icon: TerminalSquare, color: "text-amber-400" },
    ];

    const recentRuns = (await getRuns()).slice(0, 5);
    const recentActivity = await getRecentAIActivity(userId);

    return {
        stats,
        recentRuns,
        recentActivity,
    };
}

export async function getRecentAIActivity(userId: string) {
    const activities = await db.query.conversation.findMany({
        where: eq(schema.conversation.userId, userId),
        orderBy: [desc(schema.conversation.updatedAt)],
        limit: 3,
        with: {
            messages: {
                orderBy: [desc(schema.chatMessage.createdAt)],
                limit: 1,
            }
        }
    });

    return activities.map(a => ({
        id: a.id,
        title: a.title,
        lastMessage: a.messages[0]?.content || "No messages yet",
        updatedAt: a.updatedAt,
    }));
}

export async function getWorkflows(): Promise<Workflow[]> {
    const workflows = await db.query.workflow.findMany({
        orderBy: [desc(schema.workflow.createdAt)],
    });
    return workflows as Workflow[];
}

export async function getRuns(): Promise<Run[]> {
    const runs = await db.query.run.findMany({
        orderBy: [desc(schema.run.createdAt)],
        with: {
            workflow: {
                columns: {
                    name: true,
                }
            },
            startedBy: {
                columns: {
                    name: true,
                    email: true,
                }
            }
        }
    });

    return runs.map(r => ({
        id: r.id,
        workflowName: r.workflow?.name || "Unknown Workflow",
        status: r.status as Run["status"],
        createdAt: r.createdAt,
        startedBy: r.startedBy ? { name: r.startedBy.name || "Unknown", email: r.startedBy.email || "" } : null,
    }));
}

export async function getRunDetail(id: string) {
    const run = await db.query.run.findFirst({
        where: eq(schema.run.id, id),
        with: {
            workflow: true,
            steps: {
                orderBy: [asc(schema.runStep.order)],
            },
            logs: {
                orderBy: [asc(schema.runLog.createdAt)],
            },
            artifacts: {
                orderBy: [desc(schema.artifact.createdAt)],
            },
            startedBy: {
                columns: {
                    name: true,
                    email: true,
                }
            }
        }
    });

    if (!run) return null;

    return {
        ...run,
        workflowName: run.workflow?.name || "Unknown Workflow",
        status: run.status as Run["status"],
        startedBy: run.startedBy ? { name: run.startedBy.name || "Unknown", email: run.startedBy.email || "" } : null,
        steps: run.steps.map(s => ({
            ...s,
            status: s.status as RunStep["status"],
            startedAt: s.startedAt || undefined,
            completedAt: s.completedAt || undefined,
            details: s.details || undefined,
        })) as RunStep[],
        logs: run.logs as RunLog[],
        artifacts: run.artifacts as Artifact[],
    };
}

export async function getTeamMembers() {
    return [
        { name: "Admin User", email: "admin@agency.ai", role: "admin", status: "Active" },
        { name: "Standard Client", email: "client@agency.ai", role: "client", status: "Active" },
        { name: "Design Lead", email: "design@agency.ai", role: "client", status: "Active" },
    ];
}

export async function getSettingsSections() {
    return [
        { label: "Profile", description: "Manage your personal information and preferences.", icon: "Settings" },
        { label: "Notifications", description: "Configure how you want to be alerted.", icon: "Bell" },
        { label: "Security", description: "Update your password and 2FA settings.", icon: "Shield" },
        { label: "API Keys", description: "Manage access keys for integration.", icon: "Key" },
        { label: "Database", description: "View connection status and statistics.", icon: "Database" },
        { label: "Engine", description: "Configure global runner parameters.", icon: "Cpu" },
    ];
}
