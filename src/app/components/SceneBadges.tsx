import { isPreviewEnabled } from "@/data/preview";

export function SceneBadges({ isNew, isHot, isComing, className = "" }: {
  isNew: boolean;
  isHot?: boolean;
  isComing?: boolean;
  className?: string;
}) {
  const showPreviewBadge = Boolean(isComing) && isPreviewEnabled();
  if (!isNew && !showPreviewBadge) return null;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showPreviewBadge && <span className="rounded-full bg-primary px-3 py-1 text-[12px] font-bold tracking-[0.08em] text-white">测试中</span>}
      {isNew && <span className="display-serif rounded-full bg-accent px-3 py-1 text-[12px] font-bold italic tracking-[0.08em] text-accent-foreground">NEW</span>}
    </div>
  );
}
