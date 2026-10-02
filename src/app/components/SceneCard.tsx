import { Link } from "react-router";
import { CATEGORY_BG } from "@/data/scenes";
import type { Scene } from "@/data/types";
import { ImgBox } from "@/app/components/primitives";
import { LevelBadge, DurationLabel } from "@/app/components/badges";

export function SceneCard({ scene }: { scene: Scene }) {
  const catColor = CATEGORY_BG[scene.category] ?? "bg-secondary";
  return (
    <Link to={`/scenes/${scene.slug}`} className="flex flex-col h-full w-full text-left border border-border rounded-[20px] overflow-hidden bg-card shadow-[0_10px_35px_rgba(15,53,39,0.06)] hover:shadow-[0_18px_44px_rgba(15,53,39,0.12)] hover:-translate-y-1 hover:border-primary/25 transition-all duration-300 group">
      <div className="relative aspect-[4/3] overflow-hidden shrink-0">
        {scene.photo ? (
          <img src={scene.photo} alt={scene.titleEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <ImgBox label={scene.category} className={`w-full h-full ${catColor}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        {scene.isNew && (
          <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide shadow-sm">NEW</span>
        )}
        <span className="absolute bottom-3 left-3 text-[9px] font-bold uppercase tracking-[0.12em] text-white/90 bg-[#0F3527]/75 backdrop-blur-sm px-2.5 py-1 rounded-full">
          {scene.category}
        </span>
      </div>
      <div className="flex flex-col flex-1 p-5">
        <p className="display-serif text-[21px] font-semibold leading-[1.12] text-foreground group-hover:text-primary transition-colors">{scene.titleEn}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5 mb-2">{scene.titleZh}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-3 border-t border-border">
          <LevelBadge level={scene.level} />
          <span className="ml-auto"><DurationLabel duration={scene.duration} /></span>
        </div>
      </div>
    </Link>
  );
}
