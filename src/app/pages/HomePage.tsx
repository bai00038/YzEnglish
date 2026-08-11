import { Link } from "react-router";
import type { CSSProperties } from "react";
import { ChevronRight, Play, ArrowRight, FileText, Download } from "lucide-react";
import { CATEGORY_BG } from "@/data/scenes";
import { useCuratedFeaturedScenes, useLatestScenes, useCategoryNames } from "@/data/scenes-access";
import { useHomepageResourceCollections } from "@/data/resource-collections-access";
import type { Scene, ResourceCollection } from "@/data/types";
import { Btn } from "@/app/components/Btn";
import { LimeLine } from "@/app/components/brand";
import { SceneCard } from "@/app/components/SceneCard";
import { LevelBadge, DurationLabel } from "@/app/components/badges";
import { ImgBox } from "@/app/components/primitives";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";

// $128 for a whole number, $128.50 for cents — never a bare $128.00. Mirrors
// ResourcesPage.tsx's formatPrice; kept local since it's a one-line
// presentation helper, not part of the shared data layer.
function formatCollectionPrice(price: number): string {
  return `$${Number.isInteger(price) ? price.toFixed(0) : price.toFixed(2)}`;
}

// One PDF Resources preview card — a compact horizontal "download card",
// deliberately not the cover-image tile ResourcesPage.tsx's CollectionCard
// uses on the full Resources page. Never reads cover_image_url: on the
// homepage the goal is to read as a downloadable document at a glance, not
// another scene thumbnail (cover_image_url stays in the data model/query
// for the full Resources page). Only the Download PDF button opens pdf_url
// — the card body itself is inert — so a missing pdf_url can disable just
// the button ("Coming soon") without making the whole row falsely
// clickable or opening a blank tab.
function HomeResourceCard({ c }: { c: ResourceCollection }) {
  const canDownload = !!c.pdfUrl;

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 border border-border rounded-2xl bg-card px-4 py-3.5 md:px-5 transition-all duration-150 hover:border-primary/25 hover:shadow-sm">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* PDF icon — subtle light-green (primary-tinted) square */}
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
          <FileText size={16} className="text-primary" />
          <span className="text-[7px] font-black text-primary tracking-wide mt-0.5">PDF</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground leading-snug truncate">{c.titleEn}</p>
            <span
              className={`flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full ${c.priceType === "free" ? "" : "bg-secondary text-muted-foreground border border-border"}`}
              style={c.priceType === "free" ? { backgroundColor: "#B7F21D", color: "#1E1F1C" } : {}}
            >
              {c.priceType === "free" ? "Free" : c.price != null ? formatCollectionPrice(c.price) : "Premium"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-medium truncate">{c.titleZh}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.descriptionEn}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{c.sceneCount} scene{c.sceneCount !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <Btn
        variant="accent"
        size="sm"
        disabled={!canDownload}
        onClick={() => canDownload && window.open(c.pdfUrl!, "_blank", "noopener,noreferrer")}
        className="w-full md:w-auto flex-shrink-0"
      >
        <Download size={13} />{canDownload ? "Download PDF" : "Coming soon"}
      </Btn>
    </div>
  );
}

// Shared tile for the Hero collage — a whole-image link to the scene's
// detail page with its English title over a dark gradient. Used for both
// the desktop (absolutely-positioned) and mobile (stacked) layouts, which
// only differ in the className/style passed in. `scene` is undefined only
// for the brief window before the curated fetch resolves, in which case it
// renders as a non-interactive placeholder instead of a dead link.
function HeroSceneTile({ scene, className = "", style, titleClassName }: {
  scene?: Scene;
  className?: string;
  style?: CSSProperties;
  titleClassName?: string;
}) {
  const inner = (
    <>
      {scene?.photo ? (
        <img
          src={scene.photo}
          alt={scene.titleEn}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      ) : (
        <ImgBox label={scene?.titleEn ?? ""} className="w-full h-full" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      {scene && (
        <p className={titleClassName ?? "absolute bottom-3 left-3 right-3 text-sm font-black text-white leading-snug"}>
          {scene.titleEn}
        </p>
      )}
    </>
  );

  // No hardcoded position class here — the caller's className supplies
  // either "absolute" (desktop collage, positioned within a relative
  // parent) or "relative" (mobile stack, block layout). Tailwind's
  // generated stylesheet order would let a hardcoded "relative" silently
  // beat a caller's "absolute" of the same specificity regardless of
  // class-string order, so don't combine both here.
  const base = `block overflow-hidden bg-secondary group ${className}`;

  if (!scene) {
    return <div className={base} style={style}>{inner}</div>;
  }
  return (
    <Link to={`/scenes/${scene.slug}`} className={base} style={style}>
      {inner}
    </Link>
  );
}

export function HomePage() {
  const { data: featuredScenesData, loading: featuredLoading, error: featuredError } = useCuratedFeaturedScenes();
  const { data: latestScenesData, loading: latestLoading, error: latestError } = useLatestScenes(3);
  const { data: categoriesData, loading: categoriesLoading, error: categoriesError } = useCategoryNames();
  const { data: homepageCollectionsData, loading: collectionsLoading, error: collectionsError } = useHomepageResourceCollections();

  const featuredScenes = featuredScenesData ?? [];
  const latestScenes = latestScenesData ?? [];
  const categories = categoriesData ?? [];
  const homepageCollections = homepageCollectionsData ?? [];

  // Hero collage — reuses the curated featured scenes (matched by stable
  // slug, not title) also shown in the Featured Scenes section below.
  const heroDiningScene = featuredScenes.find(s => s.slug === "dining-at-a-turkish-restaurant");
  const heroShoppingScene = featuredScenes.find(s => s.slug === "shopping-for-clothes");
  const heroDentalScene = featuredScenes.find(s => s.slug === "getting-a-dental-filling");

  return (
    <div>

      {/* ════════════════════════════════════════
          HERO — off-white, bold, editorial
          ════════════════════════════════════════ */}
      <section className="bg-background">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4 pt-10 pb-6 md:pt-14 md:pb-12 md:flex md:items-start md:gap-14">

          <div className="md:flex-1 md:max-w-[540px]">
            {/* Lime pill badge */}
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3" style={{ backgroundColor: "#B7F21D", color: "#1E1F1C" }}>
              Real English for Real Life · 真实生活英语
            </span>
            <div className="flex items-center gap-2 mb-4 opacity-30">
              <LimeLine width={28} opacity={1} />
            </div>

            <h1 className="text-[32px] md:text-[48px] font-black leading-[1.08] text-foreground mb-4">
              Prepare for real{" "}
              <span className="relative inline-block" style={{ isolation: "isolate" }}>
                <span className="relative" style={{ zIndex: 1 }}>English</span>
                {/* Hand-drawn marker underline — SVG sits below the text layer */}
                <svg
                  aria-hidden="true"
                  className="absolute left-[-2%] w-[104%] pointer-events-none"
                  style={{ bottom: "-0.28em", height: "0.28em", zIndex: -1 }}
                  viewBox="0 0 220 18"
                  fill="none"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 13.5 C28 10.2, 60 8.8, 92 9.6 C124 10.4, 158 12.8, 188 11.2 C200 10.6, 210 9.8, 216 9.2"
                    stroke="#B7F21D"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 15.5 C36 13.8, 80 13.2, 120 13.8 C155 14.3, 185 13.6, 214 12.8"
                    stroke="#B7F21D"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.45"
                  />
                </svg>
              </span>
              {" "}situations<br className="hidden md:block" /> before they happen.
            </h1>

            <p className="text-sm font-semibold text-primary mt-2 mb-1">
              在真实场景发生之前，先看一遍、听一遍、练一遍。
            </p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed mb-7 max-w-md">
              For people living, working, studying, or travelling in English-speaking countries.
              Not a language course — a real-life situational preparation platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Btn variant="accent" size="lg" to="/explore">
                Explore Scenes <ArrowRight size={15} />
              </Btn>
            </div>
          </div>

          {/* Right: editorial collage — desktop only */}
          <div className="hidden md:block flex-shrink-0 self-start mt-2" style={{ width: "380px", position: "relative", height: "420px" }}>

            {/* ── Primary image — tall, left-anchored, slight clockwise tilt ── */}
            <HeroSceneTile
              scene={heroDiningScene}
              className="absolute shadow-2xl"
              style={{ width: "210px", height: "300px", top: "16px", left: "0px", borderRadius: "20px", transform: "rotate(1.2deg)", boxShadow: "0 20px 48px rgba(24,76,58,0.18)" }}
              titleClassName="absolute bottom-3 left-3 right-3 text-sm font-black text-white leading-snug"
            />

            {/* ── Secondary image — top-right, counter-tilt ── */}
            <HeroSceneTile
              scene={heroShoppingScene}
              className="absolute"
              style={{ width: "148px", height: "148px", top: "0px", right: "0px", borderRadius: "16px", transform: "rotate(-1.8deg)", boxShadow: "0 8px 24px rgba(24,76,58,0.13)" }}
              titleClassName="absolute bottom-2 left-2 right-2 text-[11px] font-black text-white leading-snug"
            />

            {/* ── Tertiary image — bottom-right, slightly overlapping secondary ── */}
            <HeroSceneTile
              scene={heroDentalScene}
              className="absolute"
              style={{ width: "162px", height: "142px", top: "164px", right: "4px", borderRadius: "14px", transform: "rotate(0.6deg)", boxShadow: "0 10px 28px rgba(24,76,58,0.14)" }}
              titleClassName="absolute bottom-2 left-2 right-2 text-[11px] font-black text-white leading-snug"
            />

            {/* ── Floating info badge ── */}
            <div className="absolute flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5"
              style={{ bottom: "24px", left: "140px", boxShadow: "0 6px 20px rgba(24,76,58,0.14)", minWidth: "164px", zIndex: 10 }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#B7F21D" }}>
                <Play size={9} fill="#1E1F1C" style={{ color: "#1E1F1C", marginLeft: "1px" }} />
              </div>
              <div>
                <p className="text-[11px] font-black leading-none" style={{ color: "#184C3A" }}>Watch · Learn · Practise</p>
                <p className="text-[9px] mt-0.5 font-medium" style={{ color: "rgba(24,76,58,0.5)" }}>Real-life scenes</p>
              </div>
            </div>

            {/* ── Lime hand-drawn arc — top-left corner accent ── */}
            <svg aria-hidden="true" className="absolute pointer-events-none" style={{ top: "0px", left: "168px", width: "48px", height: "48px", zIndex: 5 }} viewBox="0 0 48 48" fill="none">
              <path d="M8 40 Q24 6 40 10" stroke="#B7F21D" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85"/>
              <circle cx="40" cy="10" r="3" fill="#B7F21D" opacity="0.7"/>
            </svg>

            {/* ── Small dot cluster — bottom-left ── */}
            <svg aria-hidden="true" className="absolute pointer-events-none" style={{ bottom: "60px", left: "8px", width: "36px", height: "36px", zIndex: 5 }} viewBox="0 0 36 36" fill="none">
              <circle cx="6" cy="6" r="3" fill="#B7F21D" opacity="0.6"/>
              <circle cx="18" cy="10" r="2" fill="#B7F21D" opacity="0.35"/>
              <circle cx="10" cy="20" r="1.5" fill="#184C3A" opacity="0.25"/>
            </svg>

            {/* ── Tiny sparkle — top-right ── */}
            <svg aria-hidden="true" className="absolute pointer-events-none" style={{ top: "130px", right: "168px", width: "20px", height: "20px", zIndex: 5 }} viewBox="0 0 20 20" fill="none">
              <path d="M10 2 L11.2 8.8 L18 10 L11.2 11.2 L10 18 L8.8 11.2 L2 10 L8.8 8.8 Z" fill="#B7F21D" opacity="0.8"/>
            </svg>
          </div>
        </div>

        {/* Mobile: one main scene image, with the two smaller ones below */}
        <div className="md:hidden px-4 pb-8 pt-3 space-y-3">
          <HeroSceneTile
            scene={heroDiningScene}
            className="relative rounded-2xl shadow-md aspect-[16/10]"
            titleClassName="absolute bottom-3 left-3 right-3 text-sm font-black text-white leading-snug"
          />
          <div className="grid grid-cols-2 gap-3">
            <HeroSceneTile
              scene={heroShoppingScene}
              className="relative rounded-2xl shadow-md aspect-square"
              titleClassName="absolute bottom-2 left-2 right-2 text-xs font-black text-white leading-snug"
            />
            <HeroSceneTile
              scene={heroDentalScene}
              className="relative rounded-2xl shadow-md aspect-square"
              titleClassName="absolute bottom-2 left-2 right-2 text-xs font-black text-white leading-snug"
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          HOW IT WORKS — dark forest green
          ════════════════════════════════════════ */}
      <section style={{ backgroundColor: "#184C3A" }} className="py-12 md:py-16">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-8 md:mb-12" style={{ color: "rgba(183,242,29,0.6)" }}>
            How it works · 学习方式
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 relative">
            {[
              { num: "01", en: "Watch the situation", zh: "观看真实场景视频", desc: "Each scene opens with a short vertical video showing a realistic, everyday English situation before the conversation begins." },
              { num: "02", en: "Learn the conversation", zh: "逐句学习完整对话", desc: "Read the full bilingual dialogue, study key expressions, and build vocabulary — at your own pace, with no pressure." },
              { num: "03", en: "Practise before real life", zh: "开口练习，做好准备", desc: "Shadow the conversation line by line to build the confidence to handle the situation yourself when it actually happens." },
            ].map((s, i) => (
              <div key={i} className="flex gap-5 md:block">
                <div className="md:mb-4 flex-shrink-0">
                  <span className="text-6xl md:text-7xl font-black leading-none select-none" style={{ color: "rgba(183,242,29,0.25)" }}>{s.num}</span>
                </div>
                <div className="pt-1 md:pt-0">
                  <p className="text-lg font-black text-white mb-1 leading-snug">{s.en}</p>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#B7F21D" }}>{s.zh}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURED SCENES — off-white
          ════════════════════════════════════════ */}
      <section className="bg-background py-10 md:py-14">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-1">Featured scenes · 精选场景</p>
              <p className="text-2xl font-black text-foreground leading-tight">Real situations. Practise them first.</p>
            </div>
            <Link to="/explore" className="text-xs font-bold text-primary flex items-center gap-0.5 hover:opacity-70 transition-opacity flex-shrink-0 mb-1">
              See all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {featuredLoading ? (
              <LoadingState label="Loading featured scenes…" />
            ) : featuredError ? (
              <ErrorState message={featuredError} />
            ) : featuredScenes.length > 0 ? (
              featuredScenes.map(scene => <SceneCard key={scene.id} scene={scene} />)
            ) : (
              <EmptyState title="No featured scenes yet." />
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          BROWSE BY LIFE SITUATION — light neutral
          ════════════════════════════════════════ */}
      <section className="bg-secondary border-y border-border py-10 md:py-14">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4">
          <div className="flex items-end justify-between mb-5">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Browse by life situation · 按生活任务</p>
            <Link to="/explore" className="text-xs font-bold text-primary flex items-center gap-0.5 hover:opacity-70 transition-opacity">
              View all scenes <ChevronRight size={13} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoriesLoading ? (
              <LoadingState label="Loading categories…" />
            ) : categoriesError ? (
              <ErrorState message={categoriesError} />
            ) : categories.length > 0 ? (
              categories.map(cat => (
                <Link key={cat} to="/explore"
                  className="text-xs font-bold border border-border rounded-full px-4 py-2 bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-150 text-foreground">
                  {cat}
                </Link>
              ))
            ) : (
              <EmptyState title="No categories yet." />
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          RECENTLY ADDED — off-white
          ════════════════════════════════════════ */}
      <section className="bg-background border-b border-border py-10 md:py-14">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-0.5">Recently added · 最新场景</p>
              <p className="text-xl font-black text-foreground">New scenes this week</p>
            </div>
            <Link to="/explore" className="text-xs font-bold text-primary flex items-center gap-0.5 hover:opacity-70 transition-opacity">
              See all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="space-y-3">
            {latestLoading ? (
              <LoadingState label="Loading new scenes…" />
            ) : latestError ? (
              <ErrorState message={latestError} />
            ) : latestScenes.length > 0 ? (
              latestScenes.map(scene => (
                <Link key={scene.id} to={`/scenes/${scene.slug}`}
                  className="w-full flex items-center gap-4 rounded-2xl p-3 bg-card border border-border text-left hover:border-primary/25 hover:shadow-md transition-all duration-150">
                  <div className={`w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden ${scene.photo ? "" : (CATEGORY_BG[scene.category] ?? "bg-secondary")}`}>
                    {scene.photo ? (
                      <img src={scene.photo.replace("w=700&h=480", "w=128&h=128")} alt={scene.titleEn} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <ImgBox label="" className="w-full h-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground leading-snug">{scene.titleEn}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">{scene.titleZh}</p>
                    <div className="flex gap-1.5 mt-2">
                      <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{scene.category}</span>
                      <LevelBadge level={scene.level} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{ backgroundColor: "#B7F21D", color: "#1E1F1C" }}>New</span>
                    <DurationLabel duration={scene.duration} />
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title="No new scenes this week." />
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PDF RESOURCES PREVIEW — neutral surface
          ════════════════════════════════════════ */}
      <section className="bg-secondary py-10">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-1">PDF resources · 学习资料</p>
              <p className="text-xl font-black text-foreground">Download and study offline</p>
            </div>
            <Link to="/resources" className="text-xs font-bold text-primary flex items-center gap-0.5 hover:opacity-70 transition-opacity flex-shrink-0 mb-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          {collectionsLoading ? (
            <LoadingState label="Loading resources…" />
          ) : collectionsError ? (
            <ErrorState message={collectionsError} />
          ) : homepageCollections.length > 0 ? (
            <div className="flex flex-col gap-3">
              {homepageCollections.map(c => (
                <HomeResourceCard key={c.id} c={c} />
              ))}
            </div>
          ) : (
            <EmptyState title="No resources yet." />
          )}
        </div>
      </section>
    </div>
  );
}