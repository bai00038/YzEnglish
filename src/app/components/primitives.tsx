import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function SectionLabel({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-0.5 h-4 rounded-full ${light ? "bg-accent" : "bg-primary"}`} />
      <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${light ? "text-white/50" : "text-muted-foreground"}`}>{children}</span>
    </div>
  );
}

export function ImgBox({ label, className = "", color = "bg-secondary" }: { label: string; className?: string; color?: string }) {
  return (
    <div className={`${color} flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className="text-muted-foreground text-[10px] font-medium text-center px-2 opacity-70">{label}</span>
    </div>
  );
}

export function Collapsible({ label, defaultOpen = false, children }: { label: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-secondary/60 transition-colors">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <ChevronRight size={15} className={`text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-border">{children}</div>}
    </div>
  );
}

export function CategoryPill({ children, active, onClick, darkMode = false }: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  darkMode?: boolean;
}) {
  if (darkMode) {
    return (
      <button onClick={onClick}
        className={`inline-flex items-center text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150 whitespace-nowrap ${
          active
            ? "bg-accent text-accent-foreground border-accent"
            : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:text-white"
        }`}>
        {children}
      </button>
    );
  }
  return (
    <button onClick={onClick}
      className={`inline-flex items-center text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150 whitespace-nowrap ${
        active
          ? "bg-accent text-accent-foreground border-accent"
          : "bg-card border-border text-foreground hover:border-primary hover:text-primary"
      }`}>
      {children}
    </button>
  );
}
