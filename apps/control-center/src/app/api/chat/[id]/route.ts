import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-guards";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const auth = await requireApiSession(request);
    if (!auth.ok) return auth.response;

    const conversation = await db.query.conversation.findFirst({
        where: eq(schema.conversation.id, params.id),
    });

    if (!conversation || conversation.userId !== auth.session.user.id) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const messages = await db.query.chatMessage.findMany({
        where: eq(schema.chatMessage.conversationId, params.id),
        orderBy: [asc(schema.chatMessage.createdAt)],
    });

    return NextResponse.json({
        ...conversation,
        messages,
    });
}
