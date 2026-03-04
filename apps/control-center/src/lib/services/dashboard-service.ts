import { History, Layers, TerminalSquare, TrendingUp } from "lucide-react";

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
    level: "info" | "warn" | "error";
    message: string;
    createdAt: Date;
};

export type Artifact = {
    id: string;
    path: string;
    kind: string;
    size: number;
};

export async function getDashboardData() {
    const stats: DashboardStats[] = [
        { label: "Active Workflows", value: 12, icon: Layers, color: "text-cyan-400" },
        { label: "Total Runs", value: 148, icon: History, color: "text-blue-400" },
        { label: "Success Rate", value: "94.5%", icon: TrendingUp, color: "text-emerald-400" },
        { label: "Avg. Duration", value: "38s", icon: TerminalSquare, color: "text-amber-400" },
    ];

    const recentRuns = (await getRuns()).slice(0, 5);

    return {
        stats,
        recentRuns,
    };
}

export async function getWorkflows(): Promise<Workflow[]> {
    const base = {
        slug: "workflow-slug",
        objectiveTemplate: "Task: {{objective}}",
        defaultDomainAgent: "Nexus",
        defaultProvider: "OPENAI" as const,
        defaultModel: "gpt-4o-mini",
        includeMarketing: true,
        tags: ["automation"],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    return [
        { ...base, id: "wf_1", name: "Enterprise Lead Gen", slug: "lead-gen", description: "Automated multi-step agent pipeline for lead qualification", active: true },
        { ...base, id: "wf_2", name: "Customer Support Agent", slug: "support", description: "First-line response agent with RAG capabilities", active: true },
        { ...base, id: "wf_3", name: "Social Media Manager", slug: "social", description: "Content creator and scheduler for multiple platforms", active: false },
        { ...base, id: "wf_4", name: "Market Analysis", slug: "market", description: "Real-time competitor tracking and reporting", active: true },
        { ...base, id: "wf_5", name: "Onboarding Specialist", slug: "onboarding", description: "Customer success automation for new signups", active: true },
    ];
}

export async function getRuns(): Promise<Run[]> {
    return [
        {
            id: "run_12345678",
            workflowName: "Enterprise Lead Gen",
            status: "COMPLETED",
            createdAt: new Date(Date.now() - 1000 * 60 * 30),
            startedBy: { name: "Admin", email: "admin@agency.ai" },
        },
        {
            id: "run_87654321",
            workflowName: "Customer Support Agent",
            status: "RUNNING",
            createdAt: new Date(Date.now() - 1000 * 60 * 5),
            startedBy: { name: "System", email: "system@agency.ai" },
        },
        {
            id: "run_11223344",
            workflowName: "Content Strategy Bot",
            status: "FAILED",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
            startedBy: { name: "Admin", email: "admin@agency.ai" },
        },
        {
            id: "run_44556677",
            workflowName: "Market Analysis",
            status: "COMPLETED",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
            startedBy: { name: "Operator", email: "op@agency.ai" },
        },
    ];
}

export async function getRunDetail(id: string) {
    const workflows = await getWorkflows();
    const run = (await getRuns()).find(r => r.id === id) || (await getRuns())[0];

    return {
        ...run,
        workflow: workflows.find(wf => wf.name === run.workflowName) || workflows[0],
        steps: [
            { id: "s1", key: "orchestrator", title: "Orchestrator", status: "PASSED", startedAt: new Date() },
            { id: "s2", key: "specialist", title: "Specialist", status: "RUNNING", startedAt: new Date() },
            { id: "s3", key: "qa", title: "QA", status: "PENDING" },
        ] as RunStep[],
        logs: [
            { id: "l1", level: "info", message: "Starting pipeline execution...", createdAt: new Date() },
            { id: "l2", level: "info", message: "Orchestrator plan generated.", createdAt: new Date() },
        ] as RunLog[],
        artifacts: [
            { id: "a1", path: "SUMMARY.md", kind: "markdown", size: 1024 },
        ] as Artifact[],
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
