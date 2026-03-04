import { getSettingsSections } from "@/lib/services/dashboard-service";
import { 
  Settings, 
  Bell, 
  Shield, 
  Key, 
  Database, 
  Cpu, 
  ChevronRight,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, any> = {
  Settings,
  Bell,
  Shield,
  Key,
  Database,
  Cpu,
};

export default async function SettingsPage() {
  const sections = await getSettingsSections();

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Configuration</h1>
          <p className="mt-1 text-xs text-muted">Adjust system parameters and user preferences.</p>
        </div>
        
        <div className="flex items-center gap-2 rounded-xl bg-status-orange/5 border border-status-orange/10 px-4 py-2">
          <Info className="h-4 w-4 text-status-orange" />
          <span className="text-[10px] font-semibold text-status-orange">Dev Mode Active</span>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = ICON_MAP[section.icon] || Settings;
          return (
            <button 
              key={section.label} 
              className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-muted/30 hover:bg-foreground/[0.01]"
            >
              <div className="flex w-full items-center justify-between">
                <div className="rounded-xl bg-foreground/5 p-3 text-foreground transition-colors group-hover:bg-foreground group-hover:text-card">
                  <Icon className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted group-hover:text-foreground transition-all" />
              </div>
              
              <div className="mt-2">
                <h3 className="text-lg font-semibold text-foreground leading-none">{section.label}</h3>
                <p className="mt-3 text-xs leading-relaxed text-muted line-clamp-2">{section.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
