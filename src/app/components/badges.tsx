import type { ReactNode } from "react";
import { Clock, Globe, BarChart2 } from "lucide-react";

function getLevelStyle(level: string) {
  if (level === "A1–A2") return "bg-emerald-100 text-emerald-800";
  if (level === "A2–B1") return "bg-amber-100 text-amber-800";
  if (level === "B1–B2") return "bg-orange-100 text-orange-800";
  return "bg-secondary text-muted-foreground";
}

export function LevelBadge({ level }: { level: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${getLevelStyle(level)}`}>
      <BarChart2 size={9} />{level}
    </span>
  );
}

export function DurationLabel({ duration }: { duration: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock size={10} />{duration}
    </span>
  );
}

export function RegionTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium border border-border rounded-full px-2.5 py-0.5 bg-card text-muted-foreground">
      <Globe size={9} />{children}
    </span>
  );
}
