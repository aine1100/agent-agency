import { AICommandCenter } from "@/components/dashboard/ai-command-center";

export default function ChatPage() {
    return (
        <div className="flex h-[calc(100vh-120px)] flex-col">
            <div className="flex-1 overflow-hidden">
                <AICommandCenter />
            </div>
        </div>
    );
}
