export function SceneBadges({ isNew, isHot, className = "" }: {
  isNew: boolean;
  isHot?: boolean;
  className?: string;
}) {
  if (!isNew && !isHot) return null;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {isNew && <span className="display-serif rounded-full bg-accent px-3 py-1 text-[12px] font-bold italic tracking-[0.08em] text-accent-foreground">NEW</span>}
      {isHot && <span className="display-serif rounded-full bg-[#FFB35C] px-3 py-1 text-[12px] font-bold italic tracking-[0.08em] text-[#4A2700]">HOT</span>}
    </div>
  );
}
