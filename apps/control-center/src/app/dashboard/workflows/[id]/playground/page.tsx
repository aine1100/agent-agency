import { getWorkflowDetail, getAvailableAgents } from "@/lib/services/dashboard-service";
import { notFound } from "next/navigation";
import { PlaygroundClient } from "./playground-client";

export default async function WorkflowPlaygroundPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [workflow, agents] = await Promise.all([
        getWorkflowDetail(id),
        getAvailableAgents()
    ]);

    if (!workflow) {
        notFound();
    }

    return <PlaygroundClient workflow={workflow} availableAgents={agents} />;
}
