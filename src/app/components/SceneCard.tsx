import { Link } from "react-router";
import { CATEGORY_BG } from "@/data/scenes";
import type { Scene } from "@/data/types";
import { ImgBox } from "@/app/components/primitives";
import { LevelBadge, DurationLabel } from "@/app/components/badges";
import { ArrowUpRight } from "lucide-react";

// Editorial scene card — large image, serif title, quiet meta row.
// No pills, no dashboard chrome: the "深林编辑" voice.
export function SceneCard({ scene }: { scene: Scene }) {
  const catColor = CATEGORY_BG[scene.category] ?? "bg-secondary";
  return (
    <Link
      to={`/scenes/${scene.slug}`}
      className="group flex flex-col h-full w-full text-left bg-card rounded-2xl overflow-hidden border border-border/60 hover:shadow-[0_18px_44px_rgba(28,51,41,0.12)] hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] overflow-hidden shrink-0 bg-secondary">
        {scene.photo ? (
          <img
            src={scene.photo}
            alt={scene.titleEn}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <ImgBox label={scene.category} className={`w-full h-full ${catColor}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        {scene.isNew && (
          <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
            New
          </span>
        )}
        <span className="absolute bottom-3 left-4 text-[11px] font-semibold text-white/90">
          {scene.category}
        </span>
      </div>
      <div className="flex flex-col flex-1 px-5 pt-4 pb-5">
        <p className="font-display text-[19px] font-semibold leading-snug text-foreground">
          {scene.titleEn}
        </p>
        <p className="text-[13px] text-muted-foreground font-medium mt-1">{scene.titleZh}</p>
        <div className="flex items-center gap-2 mt-auto pt-4">
          <LevelBadge level={scene.level} />
          <DurationLabel duration={scene.duration} />
          <ArrowUpRight size={15} className="ml-auto text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
