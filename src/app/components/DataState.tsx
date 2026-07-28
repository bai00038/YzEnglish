import { Loader2, AlertTriangle } from "lucide-react";

// Shared loading/error/empty presentation for async data sections. Styled to
// match the "No scenes found" / "Scene not found" placeholder pattern already
// used across the app (dashed border card, centered, muted text).
// `col-span-full` is a no-op outside a grid, so this drops into grid and
// non-grid containers alike.

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="col-span-full text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
      <Loader2 size={24} className="mx-auto mb-3 opacity-40 animate-spin" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="col-span-full text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
      <AlertTriangle size={24} className="mx-auto mb-3 opacity-40" />
      <p className="text-sm font-semibold text-foreground">Something went wrong.</p>
      <p className="text-xs mt-1">{message}</p>
    </div>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="col-span-full text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
      <p className="text-sm font-semibold">{title}</p>
      {subtitle && <p className="text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
