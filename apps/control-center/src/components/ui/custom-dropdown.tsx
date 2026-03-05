"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function CustomDropdown({ options, value, onChange, label, className }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-bold text-muted/60 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center justify-between rounded-2xl border border-border bg-card/50 px-4 py-3.5 text-xs font-semibold text-foreground outline-none transition-all group hover:bg-card hover:border-brand-purple/30 shadow-sm",
            isOpen && "border-brand-purple/50 ring-4 ring-brand-purple/5 bg-card shadow-lg"
          )}
        >
          <span className="truncate">{selectedOption?.label || "Select option..."}</span>
          <div className={cn(
            "flex items-center justify-center h-5 w-5 rounded-full bg-foreground/5 transition-all group-hover:bg-brand-purple/10",
            isOpen && "rotate-180 bg-brand-purple/20 text-brand-purple"
          )}>
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-3 w-full overflow-hidden rounded-[2rem] border border-border/80 bg-card/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] outline-none animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300">
            <div className="max-h-60 overflow-y-auto p-2.5 custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold transition-all mb-1 last:mb-0",
                    option.value === value
                      ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
                      : "text-muted hover:bg-brand-purple/10 hover:text-brand-purple"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
              {options.length === 0 && (
                <div className="p-4 text-center text-[10px] text-muted font-medium italic">
                  No options available
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
