import { Link } from "react-router";
import { LockKeyhole } from "lucide-react";
import { CATEGORY_BG } from "@/data/scenes";
import { getSceneCardCategoryLabel } from "@/data/scene-categories";
import type { Scene } from "@/data/types";
import { ImgBox } from "@/app/components/primitives";
import { DurationLabel, SentenceCountLabel } from "@/app/components/badges";
import { SceneBadges } from "@/app/components/SceneBadges";
import { getSceneProgressId, useLearningProgress } from "@/data/learning-progress";
import { useMembershipAccess } from "@/data/membership";
import { responsiveImageProps } from "@/data/responsive-image";

export function SceneCard({ scene, collectionLabels = [], compact = false, resume = false, showProgress = true }: { scene: Scene; collectionLabels?: string[]; compact?: boolean; resume?: boolean; showProgress?: boolean }) {
  const catColor = CATEGORY_BG[scene.category] ?? "bg-secondary";
  const progress = useLearningProgress(getSceneProgressId(scene));
  const { isUnlocked } = useMembershipAccess();
  const hasProgress = showProgress && progress.percent > 0;
  const isMemberOnly = !scene.isFreeExperience && !isUnlocked;
  const sceneHref = `/scenes/${scene.slug}${resume ? "?resume=1" : ""}`;
  if (compact) {
    return (
      <Link to={sceneHref} className="group flex h-full w-full flex-col overflow-hidden rounded-[16px] border border-border bg-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(18,36,28,0.09)]">
        <div className="relative aspect-video shrink-0 overflow-hidden bg-[#E9E4DA]">
          {scene.photo ? (
            <img {...responsiveImageProps(scene.photo, "(max-width: 767px) 78vw, (max-width: 1023px) 50vw, 25vw")} alt={scene.titleEn} className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${isMemberOnly ? "saturate-[.72]" : ""}`} loading="lazy" decoding="async" />
          ) : (
            <ImgBox label={scene.category} className={`h-full w-full ${catColor}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          {(scene.isFreeExperience || isMemberOnly) && <span className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${scene.isFreeExperience ? "bg-accent text-primary" : "bg-primary/90 text-white"}`}>
            {isMemberOnly && <LockKeyhole size={10} />}{scene.isFreeExperience ? "免费体验" : "会员专属"}
          </span>}
          <SceneBadges isNew={scene.isNew} isHot={scene.isHot} className="absolute right-2.5 top-2.5" />
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-medium text-white">{getSceneCardCategoryLabel(scene.collectionId, scene.category)}</span>
          {hasProgress && (
            <span role="progressbar" aria-label={`${scene.titleZh}学习进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} className="absolute inset-x-0 bottom-0 h-1 bg-white/35">
              <span className="block h-full bg-accent" style={{ width: `${progress.percent}%` }} />
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          <div className="h-[60px]">
            <p className="line-clamp-1 font-sans text-[17px] font-bold leading-tight text-primary md:text-[18px]">{scene.titleZh}</p>
            <p className="mt-0.5 line-clamp-2 font-sans text-[12px] italic leading-[1.25] text-muted-foreground md:text-[13px]">{scene.titleEn}</p>
          </div>
          <div className="mt-auto flex items-center justify-between pt-1.5">
            <span>{scene.sentenceCount ? <SentenceCountLabel count={scene.sentenceCount} /> : null}</span>
            <DurationLabel duration={scene.duration} />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={sceneHref} className="group flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-border bg-card text-left transition-all duration-200 hover:-translate-y-[5px] hover:shadow-[0_22px_44px_rgba(18,36,28,0.13)]">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-[#E9E4DA]">
        {scene.photo ? (
          <img {...responsiveImageProps(scene.photo, "(max-width: 767px) 88vw, (max-width: 1023px) 50vw, 33vw")} alt={scene.titleEn} className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${isMemberOnly ? "saturate-[.72]" : ""}`} loading="lazy" decoding="async" />
        ) : (
          <ImgBox label={scene.category} className={`w-full h-full ${catColor}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        {(scene.isFreeExperience || isMemberOnly) && <span className={`absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${scene.isFreeExperience ? "bg-accent text-primary" : "bg-primary/90 text-white"}`}>
          {isMemberOnly && <LockKeyhole size={12} />}{scene.isFreeExperience ? "免费体验" : "会员专属"}
        </span>}
        <SceneBadges isNew={scene.isNew} isHot={scene.isHot} className="absolute right-3.5 top-3.5" />
        <span className="absolute bottom-3.5 left-3.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-medium text-white">
          {getSceneCardCategoryLabel(scene.collectionId, scene.category)}
        </span>
        {hasProgress && (
          <span role="progressbar" aria-label={`${scene.titleZh}学习进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} className="absolute inset-x-0 bottom-0 h-1 bg-white/35">
            <span className="block h-full bg-accent" style={{ width: `${progress.percent}%` }} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-[22px] pb-[18px] pt-5">
        <div className="mb-2 h-[60px]">
          <p className="line-clamp-1 font-sans text-[18px] font-bold leading-tight text-primary md:text-[19px]">{scene.titleZh}</p>
          <p className="mt-0.5 line-clamp-2 font-sans text-[12px] italic leading-[1.25] text-muted-foreground md:text-[13px]">{scene.titleEn}</p>
        </div>
        {collectionLabels.length > 0 && <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">收录于：{collectionLabels.join("、")}</p>}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-2.5">
          <span>{scene.sentenceCount ? <SentenceCountLabel count={scene.sentenceCount} /> : null}</span>
          <DurationLabel duration={scene.duration} />
        </div>
      </div>
    </Link>
  );
}
