import { ArrowRight, Hammer, Layers3, LockKeyhole } from "lucide-react";
import { Link } from "react-router";
import type { CollectionWithScenes } from "@/data/collections-access";

export function CollectionCard({ collection }: { collection: CollectionWithScenes }) {
  const firstScene = collection.scenes[0];
  const cover = collection.coverImage ?? firstScene?.photo;
  const liveCount = collection.scenes.filter(scene => scene.status === "live").length;
  const isComing = collection.status === "coming";

  return (
    <Link to={`/collections/${collection.id}`} className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(18,36,28,.11)]">
      <div className={`relative aspect-[16/9] overflow-hidden bg-primary ${isComing ? "grayscale" : ""}`}>
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover opacity-75 transition-transform duration-500 group-hover:scale-105" /> : <Layers3 className="absolute right-6 top-6 text-white/35" size={48} />}
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
        <span className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-bold ${isComing ? "bg-white/90 text-primary" : "bg-accent text-accent-foreground"}`}>
          {isComing ? "建设中" : "已上线"}
        </span>
        <div className="absolute inset-x-5 bottom-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-white/70">{collection.id} · {collection.titleEn}</p>
          <h2 className="mt-1 font-['Noto_Serif_SC'] text-[25px] font-bold">{collection.name}</h2>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="min-h-[44px] text-sm leading-relaxed text-muted-foreground">{collection.tagline}</p>
        <p className="mt-4 text-sm font-semibold text-foreground">共 {collection.scenes.length} 集 · 已上线 {liveCount} 集</p>
        <div className="mt-4 flex items-center border-t border-border pt-4 text-sm text-secondary-foreground">
          {isComing ? <Hammer size={15} className="mr-2" /> : <LockKeyhole size={15} className="mr-2" />}
          <span>{isComing ? "内容制作中" : "会员可学"}</span>
          <ArrowRight className="ml-auto transition-transform group-hover:translate-x-1" size={17} />
        </div>
      </div>
    </Link>
  );
}
