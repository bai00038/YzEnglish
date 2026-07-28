import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  ChevronRight, Play, Volume2, Bookmark, Share2, ChevronLeft, Mic,
  FileText, Download, Info,
} from "lucide-react";
import { CATEGORY_BG } from "@/data/scenes";
import { useSceneDetail } from "@/data/scenes-access";
import { Btn } from "@/app/components/Btn";
import { SmileCurve, LimeLine, SpeechBubbleLabel } from "@/app/components/brand";
import { LevelBadge, DurationLabel } from "@/app/components/badges";
import { Collapsible } from "@/app/components/primitives";
import { LoadingState, ErrorState } from "@/app/components/DataState";

const CHAPTER_LABELS = [
  { num: "01", label: "Watch", sectionId: "section-watch" },
  { num: "02", label: "Dialogue", sectionId: "section-dialogue" },
  { num: "03", label: "Language", sectionId: "section-language" },
  { num: "04", label: "Practise", sectionId: "section-practise" },
];
export function SceneDetailPage({ bilingualMode, setBilingualMode }: {
  bilingualMode: boolean;
  setBilingualMode: (v: boolean) => void;
}) {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = useSceneDetail(slug ?? "");
  const scene = data?.scene ?? null;
  const content = scene?.content;
  const related = data?.related ?? [];
  const prevScene = data?.prevScene ?? undefined;
  const nextScene = data?.nextScene ?? undefined;

  const [shadowLine, setShadowLine] = useState(0);
  const [activeChapter, setActiveChapter] = useState(0);

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    if (!content) return;
    const ids = CHAPTER_LABELS.map(ch => ch.sectionId);
    // Track which sections are currently intersecting
    const visibleSections = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            visibleSections.add(entry.target.id);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });
        // Set active to the first visible section in order
        for (let i = 0; i < ids.length; i++) {
          if (visibleSections.has(ids[i])) {
            setActiveChapter(i);
            return;
          }
        }
      },
      {
        // Trigger when section enters the upper ~40% of the viewport
        rootMargin: "-100px 0px -55% 0px",
        threshold: 0,
      }
    );

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    // Offset: main nav h-14 (56px) + sticky chapter nav (~44px) + 8px buffer
    const offset = 64 + 44 + 8;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24">
        <LoadingState label="Loading scene…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <p className="text-sm font-semibold text-foreground">Scene not found</p>
        <p className="text-xs text-muted-foreground mt-1">This scene may have been moved or no longer exists.</p>
        <Link to="/explore" className="text-xs font-bold text-primary inline-flex items-center gap-0.5 mt-4 hover:opacity-70 transition-opacity">
          Back to Explore <ChevronRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div>

      {/* Breadcrumb */}
      <div className="bg-background border-b border-border">
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-2.5 flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight size={9} />
          <Link to="/explore" className="hover:text-primary transition-colors">{scene.category}</Link>
          <ChevronRight size={9} />
          <span className="text-foreground font-semibold">{scene.titleEn}</span>
        </div>
      </div>

      {/* ─── Lesson identity block (sits between breadcrumb and chapter nav) ─── */}
      <div className="bg-background border-b border-border">
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 pt-6 pb-5">
          <h1 className="text-[32px] md:text-[38px] font-black leading-tight text-foreground mb-0.5">
            {scene.titleEn}
          </h1>
          <p className="font-semibold mb-3" style={{ fontSize: "18px", color: "#184C3A" }}>{scene.titleZh}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">{scene.category}</span>
            <LevelBadge level={scene.level} />
            <DurationLabel duration={scene.duration} />
          </div>
        </div>
      </div>

      {!content ? (
        <div className="pb-24">
          <section className="max-w-[1000px] mx-auto px-4 md:px-6 pt-8 pb-20">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-[44px] md:text-[52px] font-black leading-none select-none flex-shrink-0 mt-0.5 tabular-nums" style={{ color: "rgba(24,76,58,0.1)" }}>01</span>
              <div className="pt-0.5">
                <p className="text-[24px] md:text-[28px] font-black leading-tight text-foreground">Watch & Understand</p>
                <p className="text-[15px] md:text-[16px] text-muted-foreground mt-1 leading-snug">Watch the scene, then read the setup and your goal.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
              <p className="text-sm font-semibold text-foreground">Full lesson content for this scene is coming soon.</p>
              <p className="text-xs text-muted-foreground mt-1">该场景的完整学习内容即将上线。</p>
              <Link to="/explore" className="text-xs font-bold text-primary inline-flex items-center gap-0.5 mt-4 hover:opacity-70 transition-opacity">
                Explore other scenes <ChevronRight size={12} />
              </Link>
            </div>
          </section>
        </div>
      ) : (
        <>
          {/* ─── Sticky chapter nav ─── */}
          <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="max-w-[1000px] mx-auto px-4 md:px-6">
              <div className="flex items-center gap-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {CHAPTER_LABELS.map((ch, i) => {
                  const isActive = activeChapter === i;
                  return (
                    <button
                      key={i}
                      onClick={() => scrollToSection(ch.sectionId)}
                      className="flex items-center gap-2 flex-shrink-0 pr-5 py-3 border-b-2 border-transparent transition-colors cursor-pointer bg-transparent"
                      style={isActive
                        ? { borderBottomColor: "#B7F21D", color: "#184C3A" }
                        : { color: "var(--muted-foreground)" }
                      }
                    >
                      <span className="text-[9px] font-black" style={{ color: isActive ? "#184C3A" : undefined }}>
                        {ch.num}
                      </span>
                      <span className="text-[11px] font-bold whitespace-nowrap">{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              CENTRED CONTENT LAYOUT (no sidebar)
              ═══════════════════════════════════════════ */}
          <div className="pb-24">

            {/* ─────────────────────────────────────────────
                STAGE 01 · Watch & Understand
                ───────────────────────────────────────────── */}
            <section id="section-watch" className="max-w-[1000px] mx-auto px-4 md:px-6 pt-8 pb-14">

              {/* ── Section heading ── */}
              <div className="flex items-start gap-4 mb-6">
                <span className="text-[44px] md:text-[52px] font-black leading-none select-none flex-shrink-0 mt-0.5 tabular-nums" style={{ color: "rgba(24,76,58,0.1)" }}>01</span>
                <div className="pt-0.5">
                  <p className="text-[24px] md:text-[28px] font-black leading-tight text-foreground">Watch & Understand</p>
                  <p className="text-[15px] md:text-[16px] text-muted-foreground mt-1 leading-snug">Watch the scene, then read the setup and your goal.</p>
                </div>
              </div>

              {/* ── 16:9 video — primary action ── */}
              <div className="rounded-2xl overflow-hidden bg-gray-900 mb-8" style={{ aspectRatio: "16/9" }}>
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <button className="w-16 h-16 rounded-full border-2 flex items-center justify-center mb-4 transition-all hover:scale-105"
                    style={{ borderColor: "rgba(183,242,29,0.5)", backgroundColor: "rgba(183,242,29,0.12)" }}>
                    <Play size={22} className="ml-0.5" style={{ color: "#B7F21D" }} fill="currentColor" />
                  </button>
                  <p className="text-white/40 text-sm font-semibold">{scene.titleEn}</p>
                  <p className="text-white/22 text-xs mt-1">16:9 · {scene.duration}</p>
                  <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
                    <div className="w-full h-0.5 rounded-full mb-3" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
                      <div className="h-full w-[28%] rounded-full" style={{ backgroundColor: "#B7F21D" }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/40 text-[11px]">0:34 / 2:00</span>
                      <div className="flex items-center gap-3">
                        <Volume2 size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(183,242,29,0.2)", color: "#B7F21D" }}>CC</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Scene Setup + Learning Goal — below video ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-7">
                {/* Scene Setup */}
                <div className="rounded-xl border border-border bg-card px-4 py-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2.5">Scene Setup · 场景说明</p>
                  <p className="text-sm leading-[1.65] text-foreground">
                    {content.sceneSetup.en}
                  </p>
                  <p className="text-[13px] mt-2.5 leading-[1.7]" style={{ color: "#3A3B37" }}>
                    {content.sceneSetup.zh}
                  </p>
                </div>
                {/* Learning Goal — highlight card with speech-bubble corner detail */}
                <div className="rounded-xl px-4 py-4 relative overflow-hidden" style={{ backgroundColor: "rgba(183,242,29,0.08)", border: "1px solid rgba(183,242,29,0.22)" }}>
                  {/* Speech-bubble tail — bottom-left corner detail */}
                  <svg aria-hidden="true" width="14" height="10" viewBox="0 0 14 10" fill="none"
                    className="absolute bottom-2 left-4">
                    <path d="M0 0 Q7 8 14 2" stroke="#B7F21D" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
                  </svg>
                  <div className="flex items-center gap-2 mb-2.5">
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#184C3A" }}>Learning Goal · 学习目标</p>
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: "#B7F21D" }} />
                  </div>
                  <p className="text-sm font-semibold leading-[1.55] text-foreground">
                    {content.learningGoal.en}
                  </p>
                  <p className="text-[13px] mt-2.5 leading-[1.7]" style={{ color: "#3A3B37" }}>
                    {content.learningGoal.zh}
                  </p>
                </div>
              </div>

              {/* ── Save / Share ── */}
              <div className="flex items-center gap-2">
                <Btn variant="secondary" size="sm" disabled><Bookmark size={12} />Save</Btn>
                <Btn variant="secondary" size="sm" disabled><Share2 size={12} />Share</Btn>
                <span className="text-[10px] text-muted-foreground/45 italic ml-1">Coming soon</span>
              </div>
            </section>

            {/* ─────────────────────────────────────────────
                STAGE 02 · Learn the Dialogue
                ───────────────────────────────────────────── */}
            <section id="section-dialogue" className="border-t border-border" style={{ backgroundColor: "#EFF4F1" }}>
              <div className="max-w-[960px] mx-auto px-4 md:px-6 py-12 md:py-16">
              <div className="rounded-2xl px-5 py-8 md:py-10" style={{ backgroundColor: "#EFF4F1" }}>
                <div className="flex items-start gap-5 mb-8">
                  <span className="text-[56px] md:text-[64px] font-black leading-none select-none flex-shrink-0 mt-1 tabular-nums" style={{ color: "rgba(24,76,58,0.09)" }}>02</span>
                  <div className="pt-1">
                    <p className="text-[32px] md:text-[36px] font-black leading-tight text-foreground">Learn the Dialogue</p>
                    <SmileCurve width={80} opacity={0.55} className="mt-1 mb-1" />
                    <p className="text-[16px] md:text-[17px] text-muted-foreground mt-0.5 leading-snug">Read line by line. Toggle bilingual mode for Chinese translations.</p>
                  </div>
                </div>

                {/* Controls bar */}
                <div className="flex flex-wrap items-center gap-3 mb-5 pb-5 border-b border-black/8">
                  <button disabled className="flex items-center gap-2 text-xs font-bold rounded-xl px-4 py-2.5 opacity-50 cursor-default" style={{ backgroundColor: "#184C3A", color: "#F7F6F2" }}>
                    <Play size={11} fill="currentColor" />Play full dialogue
                  </button>

                  {/* EN / 双语 toggle */}
                  <div className="flex items-center border border-border rounded-full p-0.5 bg-white shadow-sm">
                    <button onClick={() => setBilingualMode(false)}
                      className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all duration-200 ${!bilingualMode ? "shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      style={!bilingualMode ? { backgroundColor: "#184C3A", color: "#F7F6F2" } : {}}>
                      English
                    </button>
                    <button onClick={() => setBilingualMode(true)}
                      className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all duration-200 ${bilingualMode ? "shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      style={bilingualMode ? { backgroundColor: "#184C3A", color: "#F7F6F2" } : {}}>
                      双语
                    </button>
                  </div>

                  <span className="text-xs text-muted-foreground">{content.dialogue.length} lines · {scene.duration}</span>

                  {/* Legend */}
                  <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(183,242,29,0.22)", color: "#184C3A" }}>YOU</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">Customer · 顾客</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white border border-border text-muted-foreground">STAFF</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">Staff · 店员</span>
                    </div>
                  </div>
                </div>

                {/* Transcript rows */}
                <div>
                  {content.dialogue.map((line, i) => {
                    const isYou = line.speaker === "You";
                    return (
                      <div key={i}
                        className="flex items-start gap-4 py-4 border-b border-black/6 last:border-0 hover:bg-white/70 transition-colors rounded-lg px-3 -mx-3"
                        style={{ borderLeft: `3px solid ${isYou ? "rgba(183,242,29,0.6)" : "transparent"}` }}>

                        {/* Speech-bubble speaker label */}
                        <SpeechBubbleLabel isYou={isYou} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground leading-[1.65]" style={{ fontSize: "17px" }}>{line.en}</p>
                          {bilingualMode && (
                            <p className="mt-2 leading-[1.75]" style={{ fontSize: "15px", color: "#3A3B37" }}>{line.zh}</p>
                          )}
                        </div>

                        {/* Audio */}
                        <button disabled className="flex-shrink-0 w-7 h-7 rounded-full border border-border bg-white flex items-center justify-center opacity-25 cursor-default mt-1">
                          <Volume2 size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>{/* inner card */}
              </div>{/* inner container */}
            </section>

            {/* ─────────────────────────────────────────────
                STAGE 03 · Learn the Language
                ───────────────────────────────────────────── */}
            <section id="section-language" className="border-t border-border bg-card">
              <div className="max-w-[960px] mx-auto px-4 md:px-6 py-12 md:py-16">
              <div className="bg-card px-0">
                <div className="flex items-start gap-5 mb-8">
                  <span className="text-[56px] md:text-[64px] font-black leading-none select-none flex-shrink-0 mt-1 tabular-nums" style={{ color: "rgba(24,76,58,0.06)" }}>03</span>
                  <div className="pt-1">
                    <p className="text-[32px] md:text-[36px] font-black leading-tight text-foreground">Learn the Language</p>
                    <LimeLine width={56} opacity={0.6} className="mt-1.5 mb-1" />
                    <p className="text-[16px] md:text-[17px] text-muted-foreground mt-0.5 leading-snug">Key expressions, vocabulary, and cultural notes from this scene.</p>
                  </div>
                </div>

                {/* Key Expressions — 2-col grid */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-0.5 h-4 rounded-full bg-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Key Expressions · 重点表达</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {content.expressions.map((exp, i) => (
                      <div key={i} className="border border-border rounded-xl overflow-hidden bg-background">
                        <div className="px-4 pt-4 pb-3">
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mb-2.5 inline-block" style={{ backgroundColor: "rgba(183,242,29,0.2)", color: "#184C3A" }}>
                            {exp.label}
                          </span>
                          <p className="text-[15px] font-bold text-foreground leading-snug mt-1">{exp.en}</p>
                          <p className="text-sm text-primary font-semibold mt-1">{exp.zh}</p>
                        </div>
                        <div className="px-4 py-2.5 border-t border-border flex items-center gap-3" style={{ backgroundColor: "rgba(183,242,29,0.07)" }}>
                          <p className="text-[11px] text-muted-foreground italic flex-1 leading-relaxed">{exp.note}</p>
                          <button disabled className="w-6 h-6 rounded-full border border-border bg-white flex items-center justify-center opacity-25 cursor-default flex-shrink-0">
                            <Volume2 size={9} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vocabulary — collapsible */}
                <div className="mb-4">
                  <Collapsible label="Vocabulary · 重点词汇" defaultOpen={false}>
                    <div className="mt-2 divide-y divide-border">
                      {content.vocabulary.map((v, i) => (
                        <div key={i} className="flex items-start gap-3 py-3 first:pt-1">
                          <div className="flex-shrink-0 w-40">
                            <span className="text-sm font-bold text-foreground">{v.word}</span>
                            {v.phonetic && <span className="text-[10px] text-muted-foreground font-mono ml-1.5">{v.phonetic}</span>}
                            <span className="text-[10px] text-muted-foreground italic ml-1">{v.pos}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{v.zh}</p>
                            <p className="text-[11px] text-muted-foreground italic mt-0.5">"{v.example}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Collapsible>
                </div>

                {/* Culture & Local Tips */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-0.5 h-4 rounded-full bg-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Culture & Local Tips · 文化与本地提示</span>
                  </div>
                  <SmileCurve width={48} opacity={0.45} className="mb-4 -mt-1" />
                  <div className="space-y-3">
                    {content.tips.map((tip, i) => (
                      <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(24,76,58,0.13)", backgroundColor: "rgba(24,76,58,0.025)" }}>
                        <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: "rgba(24,76,58,0.09)" }}>
                          <Info size={13} className="text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-foreground">{tip.title}</p>
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(183,242,29,0.18)", color: "#184C3A" }}>
                                {tip.type}
                              </span>
                            </div>
                            <p className="text-[14px] mt-0.5 leading-snug" style={{ color: "#184C3A", opacity: 0.75 }}>{tip.titleZh}</p>
                          </div>
                        </div>
                        <div className="px-4 py-4">
                          <p className="text-sm leading-[1.7] text-foreground">{tip.body}</p>
                          <p className="mt-3 leading-[1.75]" style={{ fontSize: "15.5px", color: "#3A3B37" }}>{tip.bodyZh}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>{/* inner card */}
              </div>{/* inner container */}
            </section>

            {/* ─────────────────────────────────────────────
                STAGE 04 · Practise & Continue
                dark forest green — shadowing only
                ───────────────────────────────────────────── */}
            <section id="section-practise" className="border-t border-black/8" style={{ backgroundColor: "#184C3A" }}>
              <div className="max-w-[960px] mx-auto px-4 md:px-6 py-12 md:py-16">

                {/* Stage header */}
                <div className="flex items-start gap-5 mb-10">
                  <span className="text-[56px] md:text-[64px] font-black leading-none select-none flex-shrink-0 mt-1 tabular-nums" style={{ color: "rgba(183,242,29,0.12)" }}>04</span>
                  <div className="pt-1">
                    <p className="text-[32px] md:text-[36px] font-black text-white leading-tight">Practise & Continue</p>
                    <SmileCurve width={96} opacity={0.45} className="mt-1 mb-1" />
                    <p className="text-[16px] md:text-[17px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.5)" }}>Say each line out loud. Match the rhythm and intonation.</p>
                  </div>
                </div>

                {/* Shadowing label */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: "rgba(183,242,29,0.55)" }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: "rgba(183,242,29,0.6)" }}>Shadowing Practice · 跟读练习</span>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: "rgba(183,242,29,0.8)" }}>
                    Line {shadowLine + 1} of {content.dialogue.length}
                  </span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((shadowLine + 1) / content.dialogue.length) * 100}%`, backgroundColor: "#B7F21D" }} />
                  </div>
                </div>

                {/* Current line — hand-drawn left accent + speech-bubble label */}
                <div className="rounded-xl p-5 mb-3 relative" style={{ backgroundColor: "rgba(183,242,29,0.07)", border: "1px solid rgba(183,242,29,0.18)" }}>
                  {/* Hand-drawn active-line marker on left edge */}
                  <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full" style={{ backgroundColor: "#B7F21D", opacity: 0.7 }} />
                  <div className="flex items-center gap-3 mb-3">
                    <SpeechBubbleLabel isYou={content.dialogue[shadowLine].speaker === "You"} light />
                    {/* Lime dot — pulse-like brand accent */}
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#B7F21D", opacity: 0.7 }} />
                    <span className="text-[9px] font-semibold" style={{ color: "rgba(183,242,29,0.5)" }}>Say it out loud</span>
                  </div>
                  <p className="font-bold text-white leading-[1.65]" style={{ fontSize: "18px" }}>{content.dialogue[shadowLine].en}</p>
                  {bilingualMode && (
                    <p className="mt-2.5 leading-[1.75]" style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)" }}>{content.dialogue[shadowLine].zh}</p>
                  )}
                </div>

                {/* Next line preview */}
                {shadowLine + 1 < content.dialogue.length && (
                  <div className="rounded-xl px-5 py-3 mb-6" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[9px] font-bold uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Next</p>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{content.dialogue[shadowLine + 1].en}</p>
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-2 mb-5">
                  <button disabled className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 opacity-50 cursor-default" style={{ backgroundColor: "rgba(183,242,29,0.15)", color: "#B7F21D", border: "1px solid rgba(183,242,29,0.2)" }}>
                    <Play size={11} fill="currentColor" />Listen
                  </button>
                  <button disabled className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 opacity-40 cursor-default" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    Slow
                  </button>
                  <button disabled className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 opacity-50 cursor-default ml-auto" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <Mic size={11} />Practise
                  </button>
                </div>

                {/* Prev / Next line */}
                <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <button onClick={() => setShadowLine(l => Math.max(0, l - 1))}
                    disabled={shadowLine === 0}
                    className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 transition-opacity disabled:opacity-25"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <ChevronLeft size={13} />Previous
                  </button>
                  {/* Smile-curve completion feedback — visible on last line */}
                  {shadowLine === content.dialogue.length - 1 && (
                    <div className="flex flex-col items-center gap-1">
                      <SmileCurve width={40} opacity={0.6} />
                      <span className="text-[9px] font-bold" style={{ color: "rgba(183,242,29,0.6)" }}>Done!</span>
                    </div>
                  )}
                  <button onClick={() => setShadowLine(l => Math.min(content.dialogue.length - 1, l + 1))}
                    disabled={shadowLine === content.dialogue.length - 1}
                    className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 transition-opacity disabled:opacity-25"
                    style={{ backgroundColor: "rgba(183,242,29,0.15)", color: "#B7F21D", border: "1px solid rgba(183,242,29,0.28)" }}>
                    Next line <ChevronRight size={13} />
                  </button>
                </div>

              </div>
            </section>

            {/* ─────────────────────────────────────────────
                LIGHT SECTION: PDF · Related · Prev/Next
                ───────────────────────────────────────────── */}
            <section className="border-t border-border bg-background">
              <div className="max-w-[960px] mx-auto px-4 md:px-6 py-12">

                {/* PDF download */}
                <div className="flex items-center gap-4 border border-border rounded-2xl bg-card px-5 py-4 mb-10 shadow-sm">
                  <div className="w-10 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(183,242,29,0.15)" }}>
                    <FileText size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground leading-snug">{scene.titleEn} — PDF</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Dialogue · Expressions · Vocabulary · Culture tips · Free</p>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs font-black rounded-xl px-4 py-2.5 transition-opacity hover:opacity-90 flex-shrink-0" style={{ backgroundColor: "#B7F21D", color: "#1E1F1C" }}>
                    <Download size={11} />Download
                  </button>
                </div>

                {/* Related Scenes */}
                {related.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-0.5 h-4 rounded-full bg-primary" />
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Related Scenes · 相关场景</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {related.map(r => (
                        <Link key={r.id} to={`/scenes/${r.slug}`}
                          className="flex items-start gap-3 border border-border rounded-xl p-3.5 bg-card text-left hover:border-primary/30 hover:shadow-sm transition-all">
                          <div className={`w-10 h-10 rounded-lg flex-shrink-0 ${CATEGORY_BG[r.category] ?? "bg-secondary"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground leading-snug">{r.titleEn}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{r.titleZh}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <LevelBadge level={r.level} />
                            </div>
                          </div>
                          <ChevronRight size={13} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prev / Next scene */}
                {(prevScene || nextScene) && (
                  <div className="grid grid-cols-2 gap-3 pt-8 border-t border-border">
                    {prevScene ? (
                      <Link to={`/scenes/${prevScene.slug}`} className="border border-border rounded-xl p-4 text-left bg-card hover:border-primary/30 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
                          <ChevronLeft size={10} />Previous scene
                        </div>
                        <p className="text-xs font-bold text-foreground leading-snug">{prevScene.titleEn}</p>
                        <p className="text-[11px] text-primary mt-1">{prevScene.titleZh}</p>
                      </Link>
                    ) : <div />}
                    {nextScene ? (
                      <Link to={`/scenes/${nextScene.slug}`} className="border border-border rounded-xl p-4 text-right bg-card hover:border-primary/30 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-1 justify-end text-[10px] text-muted-foreground mb-2">
                          Next scene<ChevronRight size={10} />
                        </div>
                        <p className="text-xs font-bold text-foreground leading-snug">{nextScene.titleEn}</p>
                        <p className="text-[11px] text-primary mt-1">{nextScene.titleZh}</p>
                      </Link>
                    ) : <div />}
                  </div>
                )}

              </div>
            </section>

          </div>{/* end pb-24 wrapper */}
        </>
      )}
    </div>
  );
}
