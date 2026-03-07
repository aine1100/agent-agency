import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-guards";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getChatResponse, Message } from "@/lib/ai";
import { eq, desc } from "drizzle-orm";
import { startRun } from "@/lib/run-engine";

export async function POST(request: Request) {
    const auth = await requireApiSession(request);
    if (!auth.ok) return auth.response;

    const { content, conversationId, workflowId } = await request.json();

    if (!content) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    let currentConversationId = conversationId;

    // Create a new conversation if none exists
    if (!currentConversationId) {
        currentConversationId = crypto.randomUUID();
        await db.insert(schema.conversation).values({
            id: currentConversationId,
            userId: auth.session.user.id,
            title: content.slice(0, 40) + (content.length > 40 ? "..." : ""),
            workflowId: workflowId || null,
            updatedAt: new Date(),
        });
    } else if (workflowId) {
        // Update workflow if switched mid-conversation
        await db.update(schema.conversation)
            .set({ workflowId })
            .where(eq(schema.conversation.id, currentConversationId));
    }

    // Save user message
    const userMessageId = crypto.randomUUID();
    await db.insert(schema.chatMessage).values({
        id: userMessageId,
        conversationId: currentConversationId,
        role: "user",
        content,
    });

    // Get previous messages for context
    const previousMessages = await db.query.chatMessage.findMany({
        where: eq(schema.chatMessage.conversationId, currentConversationId),
        orderBy: [desc(schema.chatMessage.createdAt)],
        limit: 10,
    });

    const context: Message[] = previousMessages.reverse().map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
    }));

    // Get AI response (now with potential triggerRun and forced workflow)
    const aiResponse = await getChatResponse(context, workflowId);
    let finalAiContent = aiResponse.content;

    // Execute run if triggered
    let triggeredRunId: string | null = null;
    if (aiResponse.triggerRun) {
        try {
            // Fetch workflow to get its default model/provider
            const workflow = await db.query.workflow.findFirst({
                where: eq(schema.workflow.id, aiResponse.triggerRun.workflowId)
            });

            const run = await startRun({
                objective: aiResponse.triggerRun.objective,
                workflowId: aiResponse.triggerRun.workflowId,
                provider: workflow?.defaultProvider || "OPENAI",
                model: workflow?.defaultModel || "gpt-4o-mini",
                includeMarketing: workflow?.includeMarketing ?? true,
                dryRun: false,
                startedById: auth.session.user.id,
                startedByRole: auth.session.user.role as any,
            });
            triggeredRunId = run.id;
            finalAiContent += `\n\n[Nexus-Micro Orchestration Started: #${run.id.slice(0, 8)}]`;
        } catch (err) {
            console.error("Failed to trigger run from chat:", err);
            finalAiContent += "\n\n(Error: Failed to initiate the background orchestration run.)";
        }
    }

    // Save AI message
    const aiMessageId = crypto.randomUUID();
    await db.insert(schema.chatMessage).values({
        id: aiMessageId,
        conversationId: currentConversationId,
        role: "assistant",
        content: finalAiContent,
    });

    // Update conversation timestamp
    await db.update(schema.conversation)
        .set({ updatedAt: new Date() })
        .where(eq(schema.conversation.id, currentConversationId));

    return NextResponse.json({
        conversationId: currentConversationId,
        message: finalAiContent,
        runId: triggeredRunId,
    });
}

export async function GET(request: Request) {
    const auth = await requireApiSession(request);
    if (!auth.ok) return auth.response;

    const conversations = await db.query.conversation.findMany({
        where: eq(schema.conversation.userId, auth.session.user.id),
        orderBy: [desc(schema.conversation.updatedAt)],
        limit: 20,
        with: {
            messages: {
                orderBy: [desc(schema.chatMessage.createdAt)],
                limit: 1,
            }
        }
    });

    return NextResponse.json(conversations);
}
