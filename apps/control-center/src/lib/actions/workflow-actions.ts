"use server"
import { createWorkflow, getAvailableAgents, saveWorkflowDefinition } from "@/lib/services/dashboard-service";
import { revalidatePath } from "next/cache";

export async function createWorkflowAction(data: any) {
    try {
        const id = await createWorkflow(data);
        revalidatePath("/dashboard/workflows");
        return { success: true, id };
    } catch (error) {
        console.error("Failed to create workflow:", error);
        return { success: false, error: String(error) };
    }
}

export async function getAvailableAgentsAction() {
    try {
        const agents = await getAvailableAgents();
        return { success: true, agents };
    } catch (error) {
        console.error("Failed to get agents:", error);
        return { success: false, error: String(error) };
    }
}

export async function saveWorkflowDefinitionAction(id: string, nodes: any, edges: any) {
    try {
        await saveWorkflowDefinition(id, nodes, edges);
        revalidatePath(`/dashboard/workflows/${id}`);
        revalidatePath(`/dashboard/workflows/${id}/playground`);
        return { success: true };
    } catch (error) {
        console.error("Failed to save workflow definition:", error);
        return { success: false, error: String(error) };
    }
}
