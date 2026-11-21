import type { ReactNode } from "react";
import { Clock, Globe, BarChart2, MessageSquareText } from "lucide-react";

export function LevelBadge({ level, variant = "detail", className = "" }: { level: string; variant?: "cover" | "detail" | "meta"; className?: string }) {
  const value = level?.trim().replace(/([A-C][12])\s*[-–—]\s*([A-C][12])/gi, "$1–$2");
  if (!value) return null;
  const labels: Record<string, string> = { beginner: "初级 · Beginner", "beginner+": "初级进阶 · Beginner+", intermediate: "中级 · Intermediate" };
  const label = labels[value.toLowerCase()] ?? value;
  return (
    <span aria-label={`内容难度：${label}`} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-sans font-medium ${variant === "meta" ? "text-xs text-muted-foreground" : variant === "cover" ? "bg-primary/80 px-2.5 py-1 text-[10px] text-white backdrop-blur-sm" : "border border-primary/15 bg-primary/5 px-3 py-1 text-[12px] text-primary"} ${className}`}>
      {variant !== "cover" && <BarChart2 size={12} aria-hidden="true" />}{label}
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

export function SentenceCountLabel({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <MessageSquareText size={10} />{count} 句
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
