import { Link } from "react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useScenes } from "@/data/scenes-access";
import type { Scene } from "@/data/types";
import { ImgBox } from "@/app/components/primitives";
import { LevelBadge, DurationLabel } from "@/app/components/badges";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";

// ─────────────────────────────────────────────
// Scene Library — the five editorial collections.
// `match` maps each collection to the data-layer categories that feed
// it; `fixedCount` is an editorial override for collections whose
// scenes live outside the current dataset (Small Talk's 13 episodes).
// Purely presentational — the data layer is untouched.
// ─────────────────────────────────────────────
const LIBRARY = [
  {
    name: "生活场景",
    en: "Everyday Life",
    desc: "日常办事与生活消费",
    match: ["Shopping & Returns", "Food & Restaurants", "Housing", "Travel"],
  },
  {
    name: "医疗场景",
    en: "Healthcare · 看病就医",
    desc: "看病、问诊与药房沟通",
    match: ["Healthcare"],
  },
  {
    name: "家校沟通",
    en: "School & Family",
    desc: "学校、老师与家长交流",
    match: ["School & Family"],
  },
  {
    name: "Small Talk",
    en: "日常寒暄 · 13 集",
    desc: "自然破冰与闲聊",
    match: ["Small Talk"],
    fixedCount: 13,
  },
  {
    name: "宠物英语",
    en: "Pets",
    desc: "养宠、看诊与社区交流",
    match: ["Pets"],
  },
] as const;

function LibraryCard({ name, en, desc, scenes, fixedCount }: {
  name: string; en: string; desc: string; scenes: Scene[]; fixedCount?: number;
}) {
  const photo = scenes.find(s => s.photo)?.photo;
  const count = fixedCount ?? scenes.length;
  return (
    <Link
      to="/explore"
      className="group block bg-card rounded-3xl overflow-hidden border border-border/60 hover:shadow-[0_22px_54px_rgba(28,51,41,0.13)] hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-primary">
        {photo ? (
          <>
            <img
              src={photo}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary">
            <span className="font-display text-[26px] font-semibold text-[#F7F4EE]/85">{name}</span>
          </div>
        )}
      </div>
      <div className="px-6 pt-5 pb-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-[22px] font-semibold text-foreground leading-tight">{name}</p>
          <ArrowUpRight size={18} className="flex-shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
        <p className="text-[12px] font-semibold tracking-wide text-muted-foreground mt-1">{en}</p>
        <p className="text-[13px] text-muted-foreground mt-2">{desc}</p>
        <p className="text-[12px] font-bold text-primary mt-3">
          {count > 0 ? `${count} 个场景` : "即将上线"}
        </p>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────
// Featured scene — one cinematic card (dental, the all-time top).
// ─────────────────────────────────────────────
function FeaturedCard({ scene }: { scene: Scene }) {
  return (
    <Link
      to={`/scenes/${scene.slug}`}
      className="group block rounded-3xl overflow-hidden border border-border/60 bg-card hover:shadow-[0_26px_60px_rgba(28,51,41,0.16)] transition-all duration-300"
    >
      <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-primary">
        {scene.photo ? (
          <img
            src={scene.photo}
            alt={scene.titleEn}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <ImgBox label={scene.titleEn} className="w-full h-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-3">
            精选场景 · Featured
          </p>
          <p className="font-display text-[26px] md:text-[38px] font-semibold text-white leading-tight">
            {scene.titleEn}
          </p>
          <p className="text-[14px] md:text-[16px] text-white/75 font-medium mt-2">
            {scene.titleZh}
          </p>
          <span className="inline-flex items-center gap-2 mt-5 text-[13px] font-bold text-[#1C3329] bg-accent rounded-full px-5 py-2.5 group-hover:gap-3 transition-all">
            进入场景 <ArrowRight size={14} />
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 px-6 md:px-10 py-4">
        <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">{scene.desc}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <LevelBadge level={scene.level} />
          <DurationLabel duration={scene.duration} />
        </div>
      </div>
    </Link>
  );
}

export function HomePage() {
  const { data: scenesData, loading, error } = useScenes();
  const scenes = scenesData ?? [];

  const dentalScene =
    scenes.find(s => s.slug === "booking-a-dentist-appointment") ??
    scenes.find(s => s.slug.includes("dental")) ??
    scenes[0];

  return (
    <div>
      {/* ════════════════════════════════════════
          HERO — editorial, generous whitespace.
          No stats, no collage, no dashboard chrome.
          ════════════════════════════════════════ */}
      <section className="bg-background">
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground mb-6">
            YZ English · Yz影子英语
          </p>
          <h1 className="font-display font-semibold text-foreground leading-[1.04] tracking-tight text-[44px] md:text-[76px]">
            real scenes<br />for real life.
          </h1>
          <p className="font-display text-[19px] md:text-[24px] text-foreground/80 mt-7 leading-relaxed">
            为海外生活而生的真场景英语。
          </p>
          <p className="text-[14px] md:text-[15px] text-muted-foreground leading-relaxed mt-4 max-w-md">
            在真实场景发生之前，先看一遍、听一遍、练一遍。
          </p>
          <div className="mt-10">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 text-[14px] font-bold text-[#F7F4EE] bg-primary rounded-full px-7 py-3.5 hover:opacity-90 transition-opacity"
            >
              逛场景库 <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURED SCENE
          ════════════════════════════════════════ */}
      <section className="bg-background pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto px-6">
          {loading ? (
            <LoadingState label="Loading featured scene…" />
          ) : error ? (
            <ErrorState message={error} />
          ) : dentalScene ? (
            <FeaturedCard scene={dentalScene} />
          ) : (
            <EmptyState title="No scenes yet." />
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════
          SCENE LIBRARY — the big cards
          ════════════════════════════════════════ */}
      <section className="bg-background pb-20 md:pb-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-10 md:mb-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Scene Library · 场景库
            </p>
            <h2 className="font-display font-semibold text-[30px] md:text-[44px] leading-tight tracking-tight text-foreground">
              从生活里选<br />要学的英语。
            </h2>
          </div>
          {loading ? (
            <LoadingState label="Loading scene library…" />
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7">
              {LIBRARY.map(lib => (
                <LibraryCard
                  key={lib.name}
                  name={lib.name}
                  en={lib.en}
                  desc={lib.desc}
                  scenes={scenes.filter(s => (lib.match as readonly string[]).includes(s.category))}
                  fixedCount={"fixedCount" in lib ? lib.fixedCount : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
