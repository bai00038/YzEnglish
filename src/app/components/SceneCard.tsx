import { Link } from "react-router";
import { CATEGORY_BG } from "@/data/scenes";
import { getSceneCategoryLabel } from "@/data/scene-categories";
import type { Scene } from "@/data/types";
import { ImgBox } from "@/app/components/primitives";
import { DurationLabel } from "@/app/components/badges";
import { SceneBadges } from "@/app/components/SceneBadges";

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
        <SceneBadges isNew={scene.isNew} isHot={scene.isHot} className="absolute right-3.5 top-3.5" />
        <span className="absolute bottom-3.5 left-3.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-medium text-white">
          {getSceneCategoryLabel(scene.category)}
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
