import { type ComponentType } from "react";
import { Stethoscope, Backpack, Baby, MessagesSquare, Sun, UtensilsCrossed, ShoppingBag, KeyRound, Plane, Briefcase } from "lucide-react";

type IconComponent = ComponentType<{ size?: number | string; className?: string; strokeWidth?: number | string; fill?: string; fillOpacity?: number | string }>;

function ToothIcon({ size = 24, className, strokeWidth = 1.75, fill = "none", fillOpacity }: { size?: number | string; className?: string; strokeWidth?: number | string; fill?: string; fillOpacity?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="2.7 2.9 17.6 17.6" fill={fill} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth={typeof strokeWidth === "number" ? strokeWidth * 0.73 : strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 5.8C10.9 4.9 9.4 4.4 8 4.7 5.9 5.1 4.8 6.7 5.1 8.7c.2 1.4.9 2.5 1.2 4 .3 1.6.5 3.2.9 4.8.2.8 1.3.9 1.7.1.4-.7.6-2.1 1-3.1.3-.8 1-1.4 2.1-1.4s1.8.6 2.1 1.4c.4 1 .6 2.4 1 3.1.4.8 1.5.7 1.7-.1.4-1.6.6-3.2.9-4.8.3-1.5 1-2.6 1.2-4 .3-2-.8-3.6-2.9-4-1.4-.3-2.9.2-4 1.1Z" />
    </svg>
  );
}

const COLLECTION_ICONS: Record<string, IconComponent> = {
  C1: ToothIcon,
  C2: Stethoscope,
  C4: Backpack,
  C6: Baby,
  C5: MessagesSquare,
  C12: Sun,
  C7: UtensilsCrossed,
  C8: ShoppingBag,
  C9: KeyRound,
  C10: Plane,
  C11: Briefcase,
};

export function CollectionIcon({ id, size = 18, className, strokeWidth = 1.75 }: { id: string; size?: number; className?: string; strokeWidth?: number }) {
  const Icon = COLLECTION_ICONS[id] ?? MessagesSquare;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} fill="url(#yz-icon-fill)" />;
}

export const collectionShortcutClass = "flex shrink-0 items-center gap-2 rounded-full bg-card px-4 py-2 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgba(18,51,37,0.04),0_3px_10px_rgba(18,51,37,0.05)] transition-all hover:text-primary hover:shadow-[0_1px_2px_rgba(18,51,37,0.05),0_6px_16px_rgba(18,51,37,0.08)] lg:gap-1.5 lg:px-3 lg:text-[12px] xl:gap-2 xl:px-4 xl:text-[13px]";

export function CollectionIconDefs() {
  return (<svg aria-hidden="true" className="absolute h-0 w-0">
        <defs>
          <linearGradient id="yz-icon-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1A4A35" stopOpacity="0.34" />
            <stop offset="52%" stopColor="#1A4A35" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1A4A35" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>);
}
