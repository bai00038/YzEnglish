import { Link } from "react-router";
import { CATEGORY_BG } from "@/data/scenes";
import { getSceneCategoryLabel } from "@/data/scene-categories";
import type { Scene } from "@/data/types";
import { ImgBox } from "@/app/components/primitives";
import { DurationLabel } from "@/app/components/badges";
import { SceneBadges } from "@/app/components/SceneBadges";

export function SceneCard({ scene, collectionLabels = [], compact = false }: { scene: Scene; collectionLabels?: string[]; compact?: boolean }) {
  const catColor = CATEGORY_BG[scene.category] ?? "bg-secondary";
  if (compact) {
    return (
      <Link to={`/scenes/${scene.slug}`} className="group flex h-full w-full flex-col overflow-hidden rounded-[16px] border border-border bg-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(18,36,28,0.09)]">
        <div className="relative aspect-video shrink-0 overflow-hidden">
          {scene.photo ? (
            <img src={scene.photo} alt={scene.titleEn} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          ) : scene.video_url ? (
            <video src={`${scene.video_url}#t=0.001`} aria-label={scene.titleEn} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" muted playsInline preload="metadata" />
          ) : (
            <ImgBox label={scene.category} className={`h-full w-full ${catColor}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <SceneBadges isNew={scene.isNew} isHot={scene.isHot} className="absolute right-2.5 top-2.5" />
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-medium text-white">{getSceneCategoryLabel(scene.category)}</span>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <p className="display-serif line-clamp-2 text-[16px] font-semibold leading-[1.2] text-foreground group-hover:text-primary">{scene.titleEn}</p>
          <p className="mt-1 truncate font-['Noto_Serif_SC'] text-[12px] text-muted-foreground">{scene.titleZh}</p>
          <div className="mt-auto flex items-center pt-2.5"><span className="ml-auto"><DurationLabel duration={scene.duration} /></span></div>
        </div>
      </Link>
    );
  }

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
        <SceneBadges isNew={scene.isNew} isHot={scene.isHot} className="absolute right-3.5 top-3.5" />
        <span className="absolute bottom-3.5 left-3.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-medium text-white">
          {getSceneCategoryLabel(scene.category)}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-[22px] pb-[18px] pt-5">
        {scene.isFreeExperience && <span className="mb-3 w-fit rounded-full bg-accent/45 px-3 py-1 text-[11px] font-bold text-primary">免费体验</span>}
        <p className="display-serif text-[20.5px] font-semibold leading-[1.25] text-foreground transition-colors group-hover:text-primary">{scene.titleEn}</p>
        <p className="mb-3.5 mt-1 font-['Noto_Serif_SC'] text-[15px] text-muted-foreground">{scene.titleZh}</p>
        {collectionLabels.length > 0 && <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">收录于：{collectionLabels.join("、")}</p>}
        <div className="mt-auto flex items-center border-t border-border pt-3.5">
          <span className="ml-auto"><DurationLabel duration={scene.duration} /></span>
        </div>
      </div>
    </Link>
  );
}
