export function SceneBadges({ isNew, isHot, className = "" }: {
  isNew: boolean;
  isHot?: boolean;
  className?: string;
}) {
  if (!isNew && !isHot) return null;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {isNew && <span className="display-serif rounded-full bg-accent px-3 py-1 text-[12px] font-bold italic tracking-[0.08em] text-accent-foreground">NEW</span>}
      {isHot && <span className="display-serif rounded-full bg-[#0F3527] px-3 py-1 text-[12px] font-bold italic tracking-[0.08em] text-[#BEF45B] shadow-[0_4px_14px_rgba(15,53,39,.35)]">HOT</span>}
    </div>
  );
}
