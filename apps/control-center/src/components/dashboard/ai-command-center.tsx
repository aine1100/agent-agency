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

const recentTalks = [
  { id: "1", title: "Enterprise Lead Gen Strategy", time: "2h ago" },
  { id: "2", title: "Social Media ROI Audit", time: "5h ago" },
  { id: "3", title: "Brand Identity Proposal", time: "Yesterday" },
  { id: "4", title: "SEO Campaign Launch", time: "Mar 2" },
];

export function AICommandCenter() {
  const [command, setCommand] = React.useState("");
  const [isThinking, setIsThinking] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      setCommand("");
    }, 2000);
  };

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-8 h-[500px]">
      {/* Recent Talks Sidebar */}
      <div className="flex flex-col rounded-3xl border border-border bg-card/50 overflow-hidden">
        <div className="p-4 border-b border-border bg-card">
          <h3 className="text-[10px] font-semibold text-muted">Recent Talks</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {recentTalks.map((talk) => (
            <button
              key={talk.id}
              className="w-full flex flex-col items-start p-3 rounded-2xl hover:bg-brand-purple/5 transition-all text-left group"
            >
              <span className="text-xs font-semibold text-foreground truncate w-full group-hover:text-brand-purple transition-colors">
                {talk.title}
              </span>
              <span className="text-[10px] font-medium text-muted mt-1">{talk.time}</span>
            </button>
          ))}
        </div>
        <button className="m-3 p-3 rounded-2xl border border-dashed border-border text-[11px] font-semibold text-muted hover:border-brand-purple/50 hover:text-brand-purple transition-all bg-card/50">
          + New Talk
        </button>
      </div>

      {/* Main Chat Interface */}
      <div className="flex flex-col items-center justify-center space-y-12 pb-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-[2rem] bg-brand-purple/10 flex items-center justify-center text-brand-purple shadow-[0_0_30px_rgba(124,58,237,0.1)]">
            {isThinking ? (
              <BrainCircuit className="h-8 w-8 animate-pulse" />
            ) : (
              <Sparkles className="h-8 w-8" />
            )}
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            How can I help you run your agency today?
          </h2>
        </div>

        <div className="w-full max-w-2xl space-y-6">
          <form
            onSubmit={handleSubmit}
            className="relative group"
          >
            <div className="absolute -inset-1 rounded-[2.5rem] bg-brand-purple/10 blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex flex-col bg-card border-2 border-border rounded-[2rem] p-4 pr-6 shadow-2xl group-focus-within:border-brand-purple/40 transition-all">
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Talk to your agency... e.g. 'Optimize my active campaigns'"
                rows={1}
                className="w-full bg-transparent border-none outline-none text-base font-medium placeholder:text-muted/50 py-2 resize-none min-h-[44px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />

              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  <div className="h-2 w-2 rounded-full bg-status-green animate-pulse" />
                  <span className="text-[10px] font-semibold text-muted">AI Ready</span>
                </div>
                <button
                  type="submit"
                  disabled={!command.trim() || isThinking}
                  className={cn(
                    "h-10 px-6 flex items-center gap-2 rounded-xl transition-all font-semibold text-[10px]",
                    command.trim() && !isThinking
                      ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20"
                      : "bg-muted/10 text-muted cursor-not-allowed"
                  )}
                >
                  <Send className="h-3.5 w-3.5" />
                  {isThinking ? "Thinking..." : "Send"}
                </button>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2">
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
      </div>
    </div>
  );
}
