import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { Btn } from "@/app/components/Btn";
import { SmileCurve, LimeLine } from "@/app/components/brand";

// ─── Design System reference page ────────────────────────────────────────────

function Swatch({ bg, label, value, style }: { bg: string; label: string; value: string; style?: CSSProperties }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`w-full h-12 rounded-xl border border-border ${bg}`} style={style} />
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground font-mono">{value}</p>
    </div>
  );
}

export function AboutPage() {
  const METHOD_STEPS = [
    { num: "01", en: "Watch the real-life scene", zh: "观看真实场景", desc: "See what actually happens — from the opening line to the final exchange." },
    { num: "02", en: "Read the complete dialogue", zh: "学习完整对话", desc: "Follow every line with bilingual support and natural conversation flow." },
    { num: "03", en: "Learn useful expressions and context", zh: "掌握实用表达与场景信息", desc: "Understand the key phrases, cultural context, and how to use them naturally." },
    { num: "04", en: "Practise before real life", zh: "在真实场景发生前进行练习", desc: "Shadow the dialogue, rehearse your lines, and feel ready when the moment arrives." },
  ];

  const DIFFERENTIATORS = [
    { en: "Complete communication flows", zh: "完整的沟通流程" },
    { en: "Realistic, natural dialogue", zh: "真实自然的对话" },
    { en: "Bilingual English and Chinese support", zh: "双语英汉支持" },
    { en: "Practical speaking preparation", zh: "实用口语练习" },
    { en: "Everyday life and travel scenarios", zh: "日常生活与旅行场景" },
    { en: "Cultural and local context when relevant", zh: "相关文化与本地背景" },
    { en: "Searchable, structured scene library", zh: "可检索的场景内容库" },
  ];

  const WHO_FOR = [
    { en: "People living or settling abroad", zh: "在海外生活或定居的人" },
    { en: "Immigrants and newcomers", zh: "移民与新来者" },
    { en: "International students", zh: "留学生" },
    { en: "Parents managing school and family situations", zh: "需要处理学校与家庭事务的家长" },
    { en: "People working in English-speaking environments", zh: "在英语环境中工作的人" },
    { en: "International travellers", zh: "国际旅行者" },
    { en: "Intermediate learners wanting practical spoken English", zh: "希望提升实用口语的中级学习者" },
  ];

  return (
    <div>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-12 pb-14 md:pt-16 md:pb-20">
          <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-6"
            style={{ backgroundColor: "#C8F169", color: "#12241C" }}>
            About Yz English · 关于我们
          </span>
          <div className="md:grid md:grid-cols-[1fr_auto] md:gap-16 md:items-end">
            <div>
              <h1 className="text-[36px] md:text-[52px] font-black leading-[1.06] text-foreground mb-3">
                Real English for Real Life
              </h1>
              <p className="text-lg md:text-xl font-semibold mb-6" style={{ color: "#0F3527" }}>为真实生活准备的场景英语</p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mb-3">
                Yz English helps adult learners prepare for real English situations before they happen. Through realistic videos, complete conversations, useful expressions and speaking practice, learners can understand what may happen next and respond with more confidence.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-8" style={{ color: "rgba(15,53,39,0.7)" }}>
                Yz English 帮助成年英语学习者提前预演真实生活中的英语场景。通过真实视频、完整对话、实用表达和口语练习，让学习者了解接下来可能发生什么，并更有信心地回应。
              </p>
              <div className="flex items-center gap-4">
                <Btn variant="accent" size="lg" to="/explore">
                  Explore Real-Life Scenes <ArrowRight size={15} />
                </Btn>
              </div>
            </div>
            {/* Accent graphic — desktop only */}
            <div className="hidden md:flex flex-col items-center gap-3 pb-2 flex-shrink-0">
              <div className="w-28 h-28 rounded-3xl flex flex-col items-center justify-center gap-1"
                style={{ backgroundColor: "#0F3527" }}>
                <span className="text-[32px] font-black leading-none" style={{ color: "#C8F169" }}>Yz</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-white/50">English</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#C8F169" }} />
                <span className="text-[10px] font-bold" style={{ color: "#0F3527" }}>Watch · Learn · Practise</span>
              </div>
              <SmileCurve width={48} opacity={0.4} className="mt-2 mx-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* ══ WHY ══════════════════════════════════════════════════════════════ */}
      <section className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <div className="md:grid md:grid-cols-2 md:gap-16 md:items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">Why we built it</p>
              <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-foreground mb-2">
                Why we created Yz English
              </h2>
              <p className="text-base font-semibold mb-6" style={{ color: "#0F3527" }}>为什么创建 Yz English</p>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Many learners know vocabulary and grammar — but still feel nervous in real situations. Not because their English is poor, but because they have never encountered that situation in English before.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                They don't know what the other person will say next. They don't know how the full process works. They haven't practised how to respond naturally. And they have never had the chance to prepare before an unfamiliar situation.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(15,53,39,0.75)" }}>
                许多学习者词汇和语法都没问题，但在真实场景中仍然感到紧张——因为他们从未用英语经历过那个情景。他们不知道对方接下来会说什么，也不知道整个流程是怎么进行的。Yz English 正是为此而生。
              </p>
              <div className="pt-2 border-l-2 pl-4" style={{ borderColor: "#C8F169" }}>
                <p className="text-sm font-semibold text-foreground">Yz English gives learners a chance to see the situation first — so they can walk in prepared, not surprised.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ METHOD ════════════════════════════════════════════════════════════ */}
      <section className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">The learning method</p>
          <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-foreground mb-1">
            Watch. Understand. Practise.
          </h2>
          <p className="text-base font-semibold mb-10" style={{ color: "#0F3527" }}>观看、理解、练习</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {METHOD_STEPS.map((step, idx) => (
              <div key={step.num} className="flex items-center gap-5 bg-card rounded-2xl border border-border px-5 py-5 shadow-sm relative overflow-hidden">
                <span className="w-9 h-9 rounded-full border border-primary text-primary bg-transparent flex items-center justify-center flex-shrink-0 text-sm font-bold tabular-nums select-none">{step.num}</span>
                <div className="pt-1 flex-1">
                  <p className="text-[15px] font-black text-foreground leading-snug">{step.en}</p>
                  <p className="text-sm font-semibold mt-0.5 mb-2" style={{ color: "#0F3527" }}>{step.zh}</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{step.desc}</p>
                  {/* Brand accent: smile on even steps, line on odd */}
                  {idx % 2 === 0
                    ? <SmileCurve width={40} opacity={0.4} className="mt-3" />
                    : <LimeLine width={32} opacity={0.5} className="mt-3" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHO ═══════════════════════════════════════════════════════════════ */}
      <section className="border-b border-border" style={{ backgroundColor: "#0F3527" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] mb-4" style={{ color: "rgba(200,241,105,0.6)" }}>Who it's for</p>
          <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-white mb-1">
            Made for real-life English learners
          </h2>
          <p className="text-base font-semibold mb-10" style={{ color: "rgba(200,241,105,0.8)" }}>为真正需要使用英语的人设计</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {WHO_FOR.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "#C8F169" }} />
                <div>
                  <p className="text-sm font-semibold text-white">{item.en}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{item.zh}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DIFFERENT ═════════════════════════════════════════════════════════ */}
      <section className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <div className="md:grid md:grid-cols-[1fr_1fr] md:gap-16 md:items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">What makes it different</p>
              <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-foreground mb-1">
                More than phrases.<br />Complete situations.
              </h2>
              <p className="text-base font-semibold mb-6" style={{ color: "#0F3527" }}>不只是一句话，而是完整场景</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Most learning tools give you isolated phrases or grammar drills. Yz English shows you the full exchange — from the moment you walk in to the moment you walk out — so you know what to expect at every step.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(15,53,39,0.65)" }}>
                大多数学习工具只提供孤立的短语或语法练习。Yz English 呈现的是完整的沟通过程——从开口的第一句话，到最终完成交流——让你在每一步都知道该说什么。
              </p>
            </div>
            <div className="mt-8 md:mt-0 space-y-2.5">
              {DIFFERENTIATORS.map((d, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#C8F169" }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#12241C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{d.en}</p>
                    <p className="text-xs" style={{ color: "rgba(15,53,39,0.6)" }}>{d.zh}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CONTENT APPROACH ═══════════════════════════════════════════════════ */}
      <section className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <div className="md:grid md:grid-cols-[1.1fr_1fr] md:gap-14">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">Content approach</p>
              <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-foreground mb-1">
                Built from real situations
              </h2>
              <p className="text-base font-semibold mb-6" style={{ color: "#0F3527" }}>内容来自真实生活</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Every Yz English scene starts from a real-world experience — the kind of situation learners actually face when living, working, studying, or travelling in an English-speaking environment.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(15,53,39,0.65)" }}>
                每一个 Yz English 场景都来源于真实的生活经历——学习者在英语环境中生活、工作、学习或旅行时，真正会遇到的情景。
              </p>
            </div>
            <div className="mt-8 md:mt-0">
              <div className="space-y-2.5">
                {[
                  { en: "Real overseas experiences", zh: "真实的海外生活经历" },
                  { en: "Everyday problems learners face", zh: "学习者日常遇到的实际问题" },
                  { en: "Questions from the audience", zh: "来自学习者的真实提问" },
                  { en: "Common travel and life situations", zh: "常见的旅行与生活场景" },
                  { en: "Situations people wish they had prepared for", zh: "那些人们事后希望自己提前准备过的情景" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3.5 px-4 py-3.5 rounded-xl border border-border bg-background">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#C8F169" }}>
                      <span className="text-[11px] font-black" style={{ color: "#12241C" }}>{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.en}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.zh}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ VISION ════════════════════════════════════════════════════════════ */}
      <section className="border-b border-border" style={{ backgroundColor: "#ffffff" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">Brand vision</p>
            <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-foreground mb-1">
              Our vision
            </h2>
            <p className="text-base font-semibold mb-8" style={{ color: "#0F3527" }}>我们的愿景</p>
            <SmileCurve width={72} opacity={0.55} className="mb-5" />
            <blockquote className="border-l-2 pl-6 mb-6" style={{ borderColor: "#C8F169" }}>
              <p className="text-[17px] md:text-[19px] font-semibold text-foreground leading-relaxed">
                We want Yz English to become the place learners open before entering an unfamiliar English situation — whether they are going to a store, school, clinic, workplace, hotel or airport.
              </p>
            </blockquote>
            <p className="text-sm leading-relaxed pl-6" style={{ color: "rgba(15,53,39,0.7)", borderLeft: "2px solid rgba(200,241,105,0.3)" }}>
              我们希望 Yz English 成为学习者进入陌生英语场景之前，会主动打开并提前练习的平台——无论是去商店、学校、诊所、工作场所、酒店还是机场。
            </p>
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ═════════════════════════════════════════════════════════ */}
      <section className="border-t border-border" style={{ backgroundColor: "#f7f6f3" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
          <SmileCurve width={64} opacity={0.5} className="mx-auto mb-6" />
          <h2 className="text-[28px] md:text-[38px] font-black leading-tight text-foreground mb-2">
            Prepare before it happens.
          </h2>
          <p className="text-base font-semibold mb-10" style={{ color: "#0F3527" }}>
            在场景发生之前，先练一遍。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Btn variant="accent" size="lg" to="/explore">
              Explore Scenes <ArrowRight size={15} />
            </Btn>
            <Btn variant="secondary" size="lg" to="/resources">
              Browse Resources
            </Btn>
          </div>
        </div>
      </section>

    </div>
  );
}
