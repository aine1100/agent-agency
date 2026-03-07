import { env, isMockMode } from "./env";

export type Message = {
    role: "user" | "assistant" | "system";
    content: string;
};

export type AIResponse = {
    content: string;
    triggerRun?: {
        objective: string;
        workflowId: string;
    };
};

export async function getChatResponse(messages: Message[], forcedWorkflowId?: string): Promise<AIResponse> {
    const lastMessage = messages[messages.length - 1].content.toLowerCase();
    
    // Broaden run intent detection: if it looks like a task, run it.
    const taskKeywords = ["make", "build", "create", "todo", "app", "audit", "run", "start", "optimize", "sequence", "campaign", "generate"];
    const isRunIntent = taskKeywords.some(kw => lastMessage.includes(kw)) && lastMessage.length > 5;

    if (isRunIntent) {
        // Use forced workflow if provided, otherwise detect
        let workflowId = forcedWorkflowId || "wf_4"; 
        
        if (!forcedWorkflowId) {
            if (lastMessage.includes("lead") || lastMessage.includes("gen")) {
                workflowId = "wf_1";
            } else if (lastMessage.includes("seo") || lastMessage.includes("audit")) {
                workflowId = "wf_4";
            }
        }

        return {
            content: `Understood. I'm activating the **Nexus-Micro Orchestrator** to handle your request: "${messages[messages.length - 1].content}". This will initiate a multi-agent sequence (Orchestrator -> Specialist -> QA -> Marketing).`,
            triggerRun: {
                objective: messages[messages.length - 1].content,
                workflowId: workflowId
            }
        };
    }

    if (isMockMode) {
        return { content: await getMockResponse(messages) };
    }

    return { content: await getMockResponse(messages) };
}

async function getMockResponse(messages: Message[]) {
    await new Promise(r => setTimeout(r, 1000));
    
    const lastMessage = messages[messages.length - 1].content.toLowerCase();
    
    if (lastMessage.includes("hi") || lastMessage.includes("hello")) {
        return "Hello! I am your Agency Orchestrator. I'm connected to the **Nexus-Micro** engine. Tell me what you want to build or audit, and I'll start a specialized run for you.";
    }

    return "I'm ready. I can trigger **Nexus-Micro** runs for website audits, app creation (e.g., 'make me a todo app'), or marketing campaigns. What's our next objective?";
}
