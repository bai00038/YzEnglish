import { Link } from "react-router";
import { CATEGORY_BG } from "@/data/scenes";
import type { Scene } from "@/data/types";
import { ImgBox } from "@/app/components/primitives";
import { DurationLabel } from "@/app/components/badges";

const THEME_LABELS: Record<string, string> = {
  "Shopping & Beauty": "购物英语",
  "Shopping & Returns": "购物英语",
  "Healthcare": "医疗英语",
  "School & Family": "家校沟通",
  "Banking & Services": "新移民必备",
  "Housing": "新移民必备",
  "Transportation": "新移民必备",
  "Work": "新移民必备",
  "Emergencies": "新移民必备",
  "Food & Restaurants": "日常生活",
  "Social Life": "日常生活",
  "Travel": "日常生活",
};

export function SceneCard({ scene }: { scene: Scene }) {
  const catColor = CATEGORY_BG[scene.category] ?? "bg-secondary";
  return (
    <Link to={`/scenes/${scene.slug}`} className="group flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-border bg-card text-left transition-all duration-200 hover:-translate-y-[5px] hover:shadow-[0_22px_44px_rgba(18,36,28,0.13)]">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden">
        {scene.photo ? (
          <img src={scene.photo} alt={scene.titleEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : scene.video_url ? (
          <video src={`${scene.video_url}#t=0.001`} aria-label={scene.titleEn} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" muted playsInline preload="metadata" />
        ) : (
          <ImgBox label={scene.category} className={`w-full h-full ${catColor}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        {scene.isNew && (
          <span className="display-serif absolute right-3.5 top-3.5 rounded-full bg-accent px-3 py-1 text-[12px] font-bold italic tracking-[0.08em] text-accent-foreground">NEW</span>
        )}
        <span className="absolute bottom-3.5 left-3.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-medium text-white">
          {THEME_LABELS[scene.category] ?? scene.category}
          <span className="ml-1 text-[10.5px] uppercase tracking-[0.14em] opacity-75">{scene.category}</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col px-[22px] pb-[18px] pt-5">
        <p className="display-serif text-[20.5px] font-semibold leading-[1.25] text-foreground transition-colors group-hover:text-primary">{scene.titleEn}</p>
        <p className="mb-3.5 mt-1 font-['Noto_Serif_SC'] text-[15px] text-muted-foreground">{scene.titleZh}</p>
        <div className="mt-auto flex items-center border-t border-border pt-3.5">
          <span className="ml-auto"><DurationLabel duration={scene.duration} /></span>
        </div>
      </div>
    </Link>
  );
}
