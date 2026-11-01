import { ArrowRight, Clock3, Play } from "lucide-react";
import { Link } from "react-router";
import type { Scene } from "@/data/types";

export function FreeExperienceCard({ scene, collectionLabel, compact = false }: { scene: Scene; collectionLabel: string; compact?: boolean }) {
  const isLive = scene.status === "live";
  if (compact) {
    const compactContent = (
      <>
        <div className="relative h-full w-[116px] flex-none overflow-hidden bg-primary/90 sm:w-[128px]">
          {scene.photo ? <img src={scene.photo} alt="" className={`h-full w-full object-cover ${isLive ? "" : "grayscale opacity-45"}`} /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_25%,rgba(200,241,105,.35),transparent_28%),linear-gradient(145deg,#315848,#0f3527)]" />}
          <span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-primary">{isLive ? <Play size={11} fill="currentColor" /> : <Clock3 size={13} />}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <p className="truncate text-[9px] font-bold uppercase tracking-[.11em] text-muted-foreground">收录于 {collectionLabel}</p>
          <h3 className="display-serif mt-1.5 line-clamp-2 text-[15px] font-semibold leading-tight text-primary">{scene.titleEn}</h3>
          <p className="mt-1 truncate font-['Noto_Serif_SC'] text-[12px] text-muted-foreground">{scene.titleZh}</p>
          <div className="mt-auto flex items-center text-[11px] font-bold text-primary">{isLive ? "开始学习" : "即将上线"}{isLive && <ArrowRight className="ml-auto" size={13} />}</div>
        </div>
      </>
    );
    const className = "group flex h-[146px] min-w-[292px] snap-start overflow-hidden rounded-[15px] border border-primary/15 bg-card md:min-w-0 md:flex-1";
    return isLive
      ? <Link to={`/scenes/${scene.slug}`} className={`${className} transition-transform hover:-translate-y-0.5`}>{compactContent}</Link>
      : <div className={`${className} opacity-80`} aria-disabled="true">{compactContent}</div>;
  }

  const content = (
    <>
      <div className="relative aspect-[16/9] overflow-hidden bg-primary/90">
        {scene.photo ? <img src={scene.photo} alt="" className={`h-full w-full object-cover ${isLive ? "" : "grayscale opacity-45"}`} /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_25%,rgba(200,241,105,.35),transparent_28%),linear-gradient(145deg,#315848,#0f3527)]" />}
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary">{isLive ? <Play size={14} fill="currentColor" /> : <Clock3 size={16} />}</span>
      </div>
      <div className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">免费体验 · 收录于 {collectionLabel}</p>
        <h3 className="display-serif mt-2 text-xl font-semibold leading-tight text-primary">{scene.titleEn}</h3>
        <p className="mt-1 font-['Noto_Serif_SC'] text-sm text-muted-foreground">{scene.titleZh}</p>
        <div className="mt-4 flex items-center text-sm font-semibold text-primary">
          {isLive ? "开始学习" : "即将上线"}{isLive && <ArrowRight className="ml-auto" size={16} />}
        </div>
      </div>
    </>
  );

  return isLive
    ? <Link to={`/scenes/${scene.slug}`} className="group overflow-hidden rounded-[20px] border border-primary/15 bg-card transition-transform hover:-translate-y-1">{content}</Link>
    : <div className="overflow-hidden rounded-[20px] border border-primary/10 bg-card/70 opacity-80" aria-disabled="true">{content}</div>;
}
