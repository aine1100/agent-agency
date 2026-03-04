"use client";

import * as React from "react";
import { Sparkles, Send, BrainCircuit, TrendingUp, Search, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const suggestions = [
  { icon: Search, text: "Audit competitor SEO", color: "text-brand-purple" },
  { icon: TrendingUp, text: "Show monthly ROI report", color: "text-status-green" },
  { icon: BrainCircuit, text: "Draft a client proposal", color: "text-status-orange" },
  { icon: Zap, text: "Fire marketing sequence", color: "text-brand-purple" },
];

export function AICommandCenter() {
  const [command, setCommand] = React.useState("");
  const [isThinking, setIsThinking] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<{ role: string; content: string }[]>([]);
  const [recentTalks, setRecentTalks] = React.useState<{ id: string; title: string; createdAt: string; updatedAt: string; messages: { content: string }[] }[]>([]);

  // Fetch recent talks on mount
  React.useEffect(() => {
    fetch("/api/chat")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecentTalks(data);
          // Auto-load most recent if available
          if (data.length > 0 && !conversationId) {
            selectConversation(data[0].id);
          }
        }
      })
      .catch(err => console.error("Failed to fetch talks:", err));
  }, []);

  const selectConversation = async (id: string) => {
    setConversationId(id);
    setIsThinking(true);
    setMessages([]); // Clear while loading
    try {
      const res = await fetch(`/api/chat/${id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setIsThinking(false);
    }
  };

  const startNewTalk = () => {
    setConversationId(null);
    setMessages([]);
    setCommand("");
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
        body: JSON.stringify({ content: currentCommand, conversationId }),
      });
      
      const data = await res.json();
      
      if (data.message) {
        setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
        // Refresh list
        const listRes = await fetch("/api/chat");
        const listData = await listRes.json();
        if (Array.isArray(listData)) setRecentTalks(listData);
        
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

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-8 h-[600px]">
      {/* Recent Talks Sidebar */}
      <div className="flex flex-col rounded-3xl border border-border bg-card/50 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wider">Recent Talks</h3>
          <button 
            onClick={startNewTalk}
            className="p-1 rounded-lg hover:bg-muted text-muted hover:text-brand-purple transition-all"
            title="New Talk"
          >
            <Zap className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {recentTalks.map((talk) => {
            const lastMsg = talk.messages?.[0]?.content || "";
            const snippet = lastMsg.replace(/\[Nexus-Micro Orchestration Started: #([a-f0-9]{8})\]/g, "").slice(0, 60).trim();

            return (
              <button
                key={talk.id}
                onClick={() => selectConversation(talk.id)}
                className={cn(
                  "w-full flex flex-col items-start p-3 rounded-2xl transition-all text-left group gap-1",
                  conversationId === talk.id ? "bg-brand-purple/10 border border-brand-purple/20 shadow-sm" : "hover:bg-brand-purple/5 border border-transparent"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={cn(
                    "text-xs font-bold truncate transition-colors",
                    conversationId === talk.id ? "text-brand-purple" : "text-foreground group-hover:text-brand-purple"
                  )}>
                    {talk.title}
                  </span>
                  <span className="text-[10px] font-medium text-muted shrink-0">
                    {getRelativeTime(talk.updatedAt)}
                  </span>
                </div>
                {snippet && (
                  <p className="text-[10px] text-muted line-clamp-1 font-medium leading-relaxed opacity-70">
                    {snippet}
                  </p>
                )}
              </button>
            );
          })}
          {recentTalks.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-[10px] text-muted font-medium italic">No recent talks</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex flex-col rounded-[2.5rem] border border-border bg-card shadow-sm overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in fade-in duration-700">
              <div className="h-16 w-16 rounded-[2rem] bg-brand-purple/10 flex items-center justify-center text-brand-purple shadow-[0_0_30px_rgba(124,58,237,0.1)]">
                {isThinking ? (
                  <BrainCircuit className="h-8 w-8 animate-pulse" />
                ) : (
                  <Sparkles className="h-8 w-8" />
                )}
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  Agency Orchestrator
                </h2>
                <p className="text-sm text-muted font-medium max-w-xs mx-auto">
                  Start a conversation to orchestrate your agency agents and manage complex workflows.
                </p>
              </div>

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
                      "rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed",
                      msg.role === "user" 
                        ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/10" 
                        : "bg-muted/5 border border-border text-foreground text-foreground/90 whitespace-pre-wrap"
                    )}>
                      {displayContent}
                      {runMatch && (
                        <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-[10px] text-brand-purple font-semibold uppercase tracking-wider">
                            <Zap className="h-3 w-3" />
                            Active Orchestration
                          </div>
                          <div className="flex items-center justify-between bg-brand-purple/5 border border-brand-purple/10 rounded-xl p-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted font-medium">Run ID</span>
                              <span className="text-xs font-semibold text-foreground">#{runMatch[1]}</span>
                            </div>
                            <a 
                              href="/dashboard/runs" 
                              className="px-3 py-1.5 bg-brand-purple text-white text-[10px] font-semibold rounded-lg hover:bg-brand-purple/90 transition-colors shadow-sm"
                            >
                              Monitor
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isThinking && (
                <div className="flex items-start gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                    <BrainCircuit className="h-4 w-4" />
                  </div>
                  <div className="bg-muted/5 border border-border h-10 w-24 rounded-2xl flex items-center justify-center">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-purple/40 animate-bounce" />
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-purple/40 animate-bounce [animation-delay:0.2s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-purple/40 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-6 bg-background/50 border-t border-border">
          <form
            onSubmit={handleSubmit}
            className="relative group max-w-3xl mx-auto"
          >
            <div className="absolute -inset-1 rounded-2xl bg-brand-purple/10 blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
            <div className="relative flex items-center bg-card border border-border rounded-xl p-2 pl-4 pr-3 shadow-sm group-focus-within:border-brand-purple/40 transition-all">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Talk to your agency..."
                disabled={isThinking}
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-muted/50 py-2 px-1"
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
                  "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                  command.trim() && !isThinking
                    ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
                    : "bg-muted/10 text-muted"
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
