"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Send, BrainCircuit, TrendingUp, Search, Zap, Layers, Cpu, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomDropdown } from "@/components/ui/custom-dropdown";

const suggestions = [
  { icon: Search, text: "Audit competitor SEO", color: "text-brand-purple" },
  { icon: TrendingUp, text: "Show monthly ROI report", color: "text-status-green" },
  { icon: BrainCircuit, text: "Draft a client proposal", color: "text-status-orange" },
  { icon: Zap, text: "Fire marketing sequence", color: "text-brand-purple" },
];

export function AICommandCenter() {
  const searchParams = useSearchParams();
  const [command, setCommand] = React.useState("");
  const [isThinking, setIsThinking] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(searchParams.get("id"));
  const [messages, setMessages] = React.useState<{ role: string; content: string }[]>([]);
  const [recentTalks, setRecentTalks] = React.useState<any[]>([]);
  const [workflows, setWorkflows] = React.useState<any[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = React.useState<string>("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch recent talks and workflows on mount
  React.useEffect(() => {
    // Fetch Talks
    fetch("/api/chat")
      .then(async res => {
        if (!res.ok) throw new Error(`Talks API failed with status ${res.status}`);
        const text = await res.text();
        if (!text) return [];
        return JSON.parse(text);
      })
      .then(data => {
        if (Array.isArray(data)) {
          setRecentTalks(data);
          if (conversationId) {
            const talk = data.find((t: any) => t.id === conversationId);
            if (talk) setSelectedWorkflowId(talk.workflowId || "");
            loadConversation(conversationId);
          } else if (data.length > 0) {
            setSelectedWorkflowId(data[0].workflowId || "");
            loadConversation(data[0].id);
          }
        }
      })
      .catch(err => console.error("Failed to fetch talks:", err));

    // Fetch Workflows
    fetch("/api/workflows")
      .then(async res => {
        if (!res.ok) throw new Error(`Workflows API failed with status ${res.status}`);
        const text = await res.text();
        if (!text) return { workflows: [] };
        return JSON.parse(text);
      })
      .then(data => {
        if (data.workflows) {
          setWorkflows(data.workflows);
        }
      })
      .catch(err => console.error("Failed to fetch workflows:", err));
  }, []);

  const loadConversation = async (id: string) => {
    setConversationId(id);
    setIsThinking(true);
    setMessages([]); // Clear while loading
    try {
      const res = await fetch(`/api/chat/${id}`);
      if (!res.ok) throw new Error(`Chat details API failed with status ${res.status}`);
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setIsThinking(false);
    }
  };

  const selectConversation = (talk: any) => {
    setConversationId(talk.id);
    setSelectedWorkflowId(talk.workflowId || "");
    loadConversation(talk.id);
  };

  const startNewTalk = () => {
    setConversationId(null);
    setMessages([]);
    setCommand("");
    setSelectedWorkflowId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isThinking) return;

    const userMessage = { role: "user", content: command };
    setMessages(prev => [...prev, userMessage]);
    const currentCommand = command;
    setCommand("");
    setIsThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: currentCommand, 
          conversationId,
          workflowId: selectedWorkflowId || undefined 
        }),
      });

      if (!res.ok) throw new Error(`Chat POST failed with status ${res.status}`);
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);

      if (data.message) {
        setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
        // Refresh list
        const listRes = await fetch("/api/chat");
        if (listRes.ok) {
          const listText = await listRes.text();
          if (listText) {
            const listData = JSON.parse(listText);
            if (Array.isArray(listData)) setRecentTalks(listData);
          }
        }

        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId);
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsThinking(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const selectedWorkflow = React.useMemo(() => 
    workflows.find(w => w.id === selectedWorkflowId),
  [workflows, selectedWorkflowId]);

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-8 h-full min-h-[600px]">
      {/* Recent Talks Sidebar */}
      <div className="flex flex-col rounded-[2rem] border border-border bg-card/40 backdrop-blur-md overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border bg-card/60 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Transmission Hub</h3>
            <p className="text-[9px] font-bold text-brand-purple/60 uppercase tracking-tighter">Recent Chronicles</p>
          </div>
          <button
            onClick={startNewTalk}
            className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-brand-purple/10 text-muted hover:text-brand-purple border border-transparent hover:border-brand-purple/20 transition-all shadow-inner group"
            title="Initiate New Genesis"
          >
            <Zap className="h-4 w-4 transition-transform group-hover:scale-110" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {recentTalks.map((talk) => {
            const lastMsg = talk.messages?.[0]?.content || "";
            const snippet = lastMsg.replace(/\[Nexus-Micro Orchestration Started: #([a-f0-9]{8})\]/g, "").slice(0, 60).trim();

            return (
              <button
                key={talk.id}
                onClick={() => selectConversation(talk)}
                className={cn(
                  "w-full flex flex-col items-start p-4 rounded-2xl transition-all text-left group gap-2 border shadow-sm",
                  conversationId === talk.id 
                    ? "bg-brand-purple/10 border-brand-purple/30 ring-1 ring-brand-purple/20 shadow-brand-purple/5" 
                    : "hover:bg-brand-purple/5 border-transparent hover:border-border/60"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={cn(
                    "text-[11px] font-bold truncate transition-colors",
                    conversationId === talk.id ? "text-brand-purple" : "text-foreground group-hover:text-brand-purple"
                  )}>
                    {talk.title}
                  </span>
                  <span className="text-[9px] font-bold text-muted/60 shrink-0 uppercase">
                    {getRelativeTime(talk.updatedAt)}
                  </span>
                </div>
                {snippet && (
                  <p className="text-[10px] text-muted line-clamp-1 font-medium leading-relaxed opacity-70 italic">
                    {snippet}
                  </p>
                )}
                {talk.workflowId && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-foreground/5 border border-border/40">
                    <Zap className="h-2.5 w-2.5 text-brand-purple fill-current" />
                    <span className="text-[8px] font-bold text-muted uppercase tracking-widest leading-none">Matrix Linked</span>
                  </div>
                )}
              </button>
            );
          })}
          {recentTalks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center opacity-40">
              <Sparkles className="h-8 w-8 text-muted mb-3" />
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Vacuum Detected</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex flex-col rounded-[2.5rem] border border-border bg-card shadow-sm overflow-hidden relative">
        {/* Header - Workflow Selector */}
        <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Orchestration Matrix</h3>
              <p className="text-[9px] font-bold text-muted/60 uppercase tracking-tighter italic">Select your workspace layout</p>
            </div>
          </div>
          <div className="w-[320px]">
            <CustomDropdown
              value={selectedWorkflowId}
              onChange={(val) => setSelectedWorkflowId(val)}
              options={[
                { value: "", label: "Auto-Detect Intelligence" },
                ...workflows.map(w => ({ value: w.id, label: w.name }))
              ]}
              className="!py-0"
            />
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in fade-in duration-700">
              <div className="h-16 w-16 rounded-[2rem] bg-brand-purple/10 flex items-center justify-center text-brand-purple shadow-[0_0_30px_rgba(124,58,237,0.1)] relative">
                {isThinking ? (
                  <BrainCircuit className="h-8 w-8 animate-pulse" />
                ) : (
                  <Sparkles className="h-8 w-8" />
                )}
                <div className="absolute -inset-4 rounded-full border border-brand-purple/20 animate-[ping_3s_linear_infinite] opacity-20" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  Agency Orchestrator
                </h2>
                <p className="text-sm text-muted font-medium max-w-xs mx-auto">
                  {selectedWorkflow 
                    ? `Current Matrix: ${selectedWorkflow.name}. Any orchestration will force deployment of your custom specialist graph.`
                    : "Start a conversation to orchestrate your agency agents and manage complex workflows."
                  }
                </p>
              </div>

              {!selectedWorkflowId && (
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-md pt-4">
                  {suggestions.map((suggestion) => {
                    const Icon = suggestion.icon;
                    return (
                      <button
                        key={suggestion.text}
                        onClick={() => setCommand(suggestion.text)}
                        className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-2.5 text-[10px] font-semibold text-muted hover:border-brand-purple/30 hover:bg-brand-purple/5 hover:text-brand-purple transition-all shadow-sm"
                      >
                        <Icon className={cn("h-3 w-3", suggestion.color)} />
                        {suggestion.text}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => {
                const runMatch = msg.content.match(/\[Nexus-Micro Orchestration Started: #([a-f0-9]{8})\]/);
                const displayContent = runMatch
                  ? msg.content.replace(runMatch[0], "").trim()
                  : msg.content;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col gap-2 max-w-[85%] animate-in slide-in-from-bottom-2 duration-300",
                      msg.role === "user" ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "rounded-2xl px-5 py-4 text-[13px] font-medium leading-relaxed shadow-sm",
                      msg.role === "user"
                        ? "bg-brand-purple text-white shadow-brand-purple/10"
                        : "bg-muted/10 border border-border/60 text-foreground/90 whitespace-pre-wrap backdrop-blur-sm"
                    )}>
                      {displayContent}
                      {runMatch && (
                        <div className="mt-5 pt-4 border-t border-border/40 flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-[9px] text-brand-purple font-black uppercase tracking-[0.2em]">
                            <div className="h-1.5 w-1.5 rounded-full bg-brand-purple animate-pulse" />
                            Active Orchestration Cycle
                          </div>
                          <div className="flex items-center justify-between bg-card border border-border/80 rounded-[1.25rem] p-4 shadow-inner">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-muted font-black uppercase tracking-widest opacity-60">Run Identifier</span>
                              <span className="text-xs font-mono font-bold text-foreground">#{runMatch[1]}</span>
                            </div>
                            <a
                              href={`/dashboard/runs/${runMatch[1]}`}
                              className="px-4 py-2 bg-brand-purple text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-purple/20 flex items-center gap-2"
                            >
                              Details
                              <TrendingUp className="h-3 w-3" />
                            </a>
                          </div>
                          {selectedWorkflow && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-purple/5 border border-brand-purple/10">
                              <Bot className="h-3 w-3 text-brand-purple" />
                              <span className="text-[9px] font-bold text-muted italic">Aligned with custom matrix: {selectedWorkflow.name}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isThinking && (
                <div className="flex items-start gap-4 animate-in fade-in duration-500">
                  <div className="h-10 w-10 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple border border-brand-purple/20 shadow-inner">
                    <BrainCircuit className="h-5 w-5 animate-spin-slow" />
                  </div>
                  <div className="bg-muted/10 border border-border/60 h-12 w-28 rounded-[1.25rem] flex items-center justify-center backdrop-blur-sm">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-brand-purple/50 animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-brand-purple/50 animate-bounce [animation-delay:0.2s]" />
                      <div className="h-2 w-2 rounded-full bg-brand-purple/50 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-8 bg-background/60 backdrop-blur-xl border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
          <form
            onSubmit={handleSubmit}
            className="relative group max-w-4xl mx-auto"
          >
            <div className="absolute -inset-1.5 rounded-[2rem] bg-brand-purple/20 blur-xl opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
            <div className="relative flex items-center bg-card/80 border border-border/80 rounded-[1.5rem] p-3 pl-6 pr-3 shadow-2xl backdrop-blur-md group-focus-within:border-brand-purple/50 transition-all group-focus-within:ring-1 ring-brand-purple/20">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={selectedWorkflow ? `Commanding ${selectedWorkflow.name}...` : "Relay objective to specialists..."}
                disabled={isThinking}
                className="flex-1 bg-transparent border-none outline-none text-sm font-semibold placeholder:text-muted/40 py-3 px-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!command.trim() || isThinking}
                className={cn(
                  "h-12 w-12 flex items-center justify-center rounded-2xl transition-all shadow-lg active:scale-95 group/sendbtn",
                  command.trim() && !isThinking
                    ? "bg-brand-purple text-white shadow-brand-purple/30 hover:opacity-90"
                    : "bg-muted/10 text-muted grayscale"
                )}
              >
                <Send className={cn("h-4 w-4 transition-transform", command.trim() && !isThinking && "group-hover/sendbtn:-translate-y-0.5 group-hover/sendbtn:translate-x-0.5")} />
              </button>
            </div>
            
            {selectedWorkflow && (
              <div className="absolute -bottom-6 left-6 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-500">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-purple animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted">Active Force-Matrix Enabled</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
