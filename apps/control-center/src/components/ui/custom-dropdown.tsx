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
    <div className={cn("space-y-2", className)} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-semibold text-muted ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-xs font-medium text-foreground outline-none transition-all focus:ring-1 focus:ring-brand-purple/20 focus:border-brand-purple/50",
            isOpen && "border-brand-purple/50 ring-1 ring-brand-purple/20 shadow-sm"
          )}
        >
          <span className="truncate">{selectedOption?.label || "Select option..."}</span>
          <ChevronDown className={cn("h-4 w-4 text-muted transition-transform duration-200", isOpen && "rotate-180 text-brand-purple")} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[0_10px_40px_rgba(0,0,0,0.1)] outline-none animate-in fade-in zoom-in-95 duration-200">
            <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all",
                    option.value === value
                      ? "bg-brand-purple text-white font-semibold"
                      : "text-muted hover:bg-brand-purple/10 hover:text-brand-purple"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
