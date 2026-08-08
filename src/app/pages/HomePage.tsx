import { Link } from "react-router";
import { ChevronRight, Play, ArrowRight, FileText } from "lucide-react";
import { CATEGORY_BG } from "@/data/scenes";
import { useCuratedFeaturedScenes, useLatestScenes, useCategoryNames } from "@/data/scenes-access";
import { useResources } from "@/data/resources-access";
import { Btn } from "@/app/components/Btn";
import { LimeLine } from "@/app/components/brand";
import { SceneCard } from "@/app/components/SceneCard";
import { LevelBadge, DurationLabel } from "@/app/components/badges";
import { ImgBox } from "@/app/components/primitives";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";

export function HomePage() {
  const { data: featuredScenesData, loading: featuredLoading, error: featuredError } = useCuratedFeaturedScenes();
  const { data: latestScenesData, loading: latestLoading, error: latestError } = useLatestScenes(3);
  const { data: categoriesData, loading: categoriesLoading, error: categoriesError } = useCategoryNames();
  const { data: resourcesData, loading: resourcesLoading, error: resourcesError } = useResources();

  const featuredScenes = featuredScenesData ?? [];
  const latestScenes = latestScenesData ?? [];
  const categories = categoriesData ?? [];
  const freeResources = resourcesData?.filter(r => r.free).slice(0, 2) ?? [];

  // Hero collage — reuses the curated featured scenes (matched by stable
  // slug, not title) also shown in the Featured Scenes section below.
  const heroPriceAdjustmentScene = featuredScenes.find(s => s.slug === "requesting-a-price-adjustment-at-costco");
  const heroFamilyDoctorScene = featuredScenes.find(s => s.slug === "checking-in-at-a-family-doctors-office");
  const heroTurkishRestaurantScene = featuredScenes.find(s => s.slug === "dining-at-a-turkish-restaurant");

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
            <div className="absolute overflow-hidden bg-secondary shadow-2xl"
              style={{ width: "210px", height: "300px", top: "16px", left: "0px", borderRadius: "20px", transform: "rotate(1.2deg)", boxShadow: "0 20px 48px rgba(24,76,58,0.18)" }}>
              {heroPriceAdjustmentScene?.photo ? (
                <img
                  src={heroPriceAdjustmentScene.photo}
                  alt={heroPriceAdjustmentScene.titleEn}
                  className="w-full h-full object-cover object-center"
                  loading="lazy"
                />
              ) : (
                <ImgBox label="Price Adjustment" className="w-full h-full" />
              )}
            </div>

            {/* ── Secondary image — top-right, counter-tilt ── */}
            <div className="absolute overflow-hidden bg-secondary"
              style={{ width: "148px", height: "148px", top: "0px", right: "0px", borderRadius: "16px", transform: "rotate(-1.8deg)", boxShadow: "0 8px 24px rgba(24,76,58,0.13)" }}>
              {heroFamilyDoctorScene?.photo ? (
                <img
                  src={heroFamilyDoctorScene.photo}
                  alt={heroFamilyDoctorScene.titleEn}
                  className="w-full h-full object-cover object-center"
                  loading="lazy"
                />
              ) : (
                <ImgBox label="Family Doctor" className="w-full h-full" />
              )}
            </div>

            {/* ── Tertiary image — bottom-right, slightly overlapping secondary ── */}
            <div className="absolute overflow-hidden bg-secondary"
              style={{ width: "162px", height: "142px", top: "164px", right: "4px", borderRadius: "14px", transform: "rotate(0.6deg)", boxShadow: "0 10px 28px rgba(24,76,58,0.14)" }}>
              {heroTurkishRestaurantScene?.photo ? (
                <img
                  src={heroTurkishRestaurantScene.photo}
                  alt={heroTurkishRestaurantScene.titleEn}
                  className="w-full h-full object-cover object-center"
                  loading="lazy"
                />
              ) : (
                <ImgBox label="Turkish Restaurant" className="w-full h-full" />
              )}
            </div>

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

        {/* Mobile: horizontal scene photo strip */}
        <div className="md:hidden flex gap-3 overflow-x-auto px-4 pb-8 pt-3" style={{ scrollbarWidth: "none" }}>
          {[
            { url: "https://images.unsplash.com/photo-1546213290-e1b492ab3eee?w=320&h=200&fit=crop&auto=format", alt: "Clothing store return counter", label: "Shopping & Returns" },
            { url: "https://images.unsplash.com/photo-1516901408257-500ed7566e6a?w=320&h=200&fit=crop&auto=format", alt: "Parent with child at school", label: "School & Family" },
            { url: "https://images.unsplash.com/photo-1629308993023-bb7ca078abdc?w=320&h=200&fit=crop&auto=format", alt: "Airport terminal", label: "Travel" },
            { url: "https://images.unsplash.com/photo-1545575950-59f935d6521c?w=320&h=200&fit=crop&auto=format", alt: "Drive-through food counter", label: "Food & Restaurants" },
          ].map(p => (
            <Link key={p.url} to="/explore" className="flex-shrink-0 w-44 text-left group">
              <div className="rounded-2xl overflow-hidden aspect-video mb-2 shadow-md bg-secondary">
                <img src={p.url} alt={p.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              </div>
              <p className="text-xs font-bold text-foreground">{p.label}</p>
            </Link>
          ))}
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
          <div className="border border-border rounded-2xl bg-card shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Scene PDFs, topic collections, and travel packs to study offline — no login required for free resources.
              </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              {resourcesLoading ? (
                <LoadingState label="Loading resources…" />
              ) : resourcesError ? (
                <ErrorState message={resourcesError} />
              ) : freeResources.length > 0 ? (
                freeResources.map(r => (
                  <div key={r.id} className="p-4">
                    <div className={`w-full h-20 rounded-xl mb-3 overflow-hidden ${CATEGORY_BG[r.category] ?? "bg-secondary"}`}>
                      <ImgBox label={r.category} className="w-full h-full" />
                    </div>
                    <p className="text-xs font-bold text-foreground leading-snug mb-0.5">{r.title}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{r.titleZh}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{r.scenes} scenes · <span className="text-emerald-700 font-bold">Free</span></p>
                  </div>
                ))
              ) : (
                <EmptyState title="No free resources yet." />
              )}
            </div>
            <div className="p-4 border-t border-border">
              <Btn variant="primary" to="/resources" className="w-full">
                <FileText size={14} />Browse all PDF resources
              </Btn>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}