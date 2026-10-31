import { ArrowRight, Clock3, Play } from "lucide-react";
import { Link } from "react-router";
import type { Scene } from "@/data/types";

export function FreeExperienceCard({ scene, collectionLabel }: { scene: Scene; collectionLabel: string }) {
  const isLive = scene.status === "live";
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
