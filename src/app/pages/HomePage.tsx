import { useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useScenes } from "@/data/scenes-access";
import type { Scene } from "@/data/types";
import { ImgBox } from "@/app/components/primitives";
import { LevelBadge, DurationLabel } from "@/app/components/badges";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";

// ─────────────────────────────────────────────
// Scene cards — copy verbatim from the direction-A design source
// (~/workspace/ts-spaces/space/index.html, #sceneGrid).
// ─────────────────────────────────────────────
type SceneCardData = {
  cats: string[];
  large?: boolean;
  img: string;
  alt: string;
  imgStyle?: CSSProperties;
  small: string;
  h3: string;
  p: string;
};

const SCENE_CARDS: SceneCardData[] = [
  { cats: ["medical"], large: true, img: "/images/dental.webp", alt: "牙科诊所场景",
    small: "Medical · 看病就医", h3: "看牙：补牙、洗牙、问费用",
    p: "全站人气最高的场景之一。高焦虑时刻，一句句拆给你听。" },
  { cats: ["daily", "school"], img: "/images/hero.webp", alt: "校门口寒暄场景",
    small: "Small Talk · 家校", h3: "校门口寒暄",
    p: "孩子近况、课程、老师——固定话题库，下次见面接着聊。" },
  { cats: ["daily"], img: "/images/cafe.webp", alt: "咖啡馆闲聊场景",
    small: "Small Talk · 日常", h3: "和邻居喝杯咖啡",
    p: "不谈正事的聊天，才是最难的 bonding。" },
  { cats: ["medical"], img: "/images/pharmacy.webp", alt: "药房取药场景",
    small: "Medical · 看病就医", h3: "药房取药",
    p: "处方、剂量、副作用，一次问清，不靠猜。" },
  { cats: ["life"], img: "/images/cafe.webp", alt: "生活消费场景",
    imgStyle: { filter: "saturate(.85)" },
    small: "Life · 生活消费", h3: "买防晒 / 退换货",
    p: "小红书上跑出来的高收藏场景，实用又体面。" },
  { cats: ["school"], img: "/images/hero.webp", alt: "家校沟通场景",
    imgStyle: { filter: "brightness(.92)" },
    small: "School · 家校沟通", h3: "家长会：为孩子开口",
    p: "不是寒暄，是据理力争——这部分，翻译机替不了你。" },
];

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "medical", label: "看病就医" },
  { key: "school", label: "家校沟通" },
  { key: "daily", label: "日常寒暄" },
  { key: "life", label: "生活消费" },
] as const;

// Ticker copy — verbatim from design (em dash + ✦ separators).
const TICKER_TEXT =
  "At the dentist — 看牙怎么说 ✦ At the pharmacy — 药房取药 ✦ School gate small talk — 校门口寒暄 ✦ Blood work — 抽血检查 ✦ Parent-teacher meeting — 家长会 ✦ ";

function SceneCard({ card, hidden }: { card: SceneCardData; hidden: boolean }) {
  return (
    <Link
      to="/explore"
      className={`scene${card.large ? " large" : ""}${hidden ? " hidden" : ""}`}
      data-cat={card.cats.join(" ")}
    >
      <img src={card.img} alt={card.alt} style={card.imgStyle} loading="lazy" />
      <span className="play">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
        </svg>
      </span>
      <div className="scene-txt">
        <small>{card.small}</small>
        <h3>{card.h3}</h3>
        <p>{card.p}</p>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────
// Featured scene — one cinematic card (dental, the all-time top).
// Untouched by the direction-A restoration.
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
  const [filter, setFilter] = useState<string>("all");

  const dentalScene =
    scenes.find(s => s.slug === "booking-a-dentist-appointment") ??
    scenes.find(s => s.slug.includes("dental")) ??
    scenes[0];

  return (
    <div>
      {/* ════════════════════════════════════════
          HERO — structure per direction-A design source.
          EN headline stays as the approved cut-out image.
          ════════════════════════════════════════ */}
      <section className="bg-background overflow-hidden">
        <div className="wrap pt-14 md:pt-20 lg:pt-24 pb-14 md:pb-20">
          <div className="hero-grid">
            <div>
              <div className="kicker">Ottawa · 真实生活英语</div>
              <h1 className="dh1 max-w-[340px] md:max-w-[500px] lg:max-w-[620px]">
                <img
                  src="/images/headline-real-scenes.png"
                  alt="Real scenes, for real life."
                  className="block w-full h-auto select-none"
                  draggable={false}
                />
                <span className="zh">
                  不是背单词，
                  <br />
                  是下一次开口不慌。
                </span>
              </h1>
              <p className="lede">
                看牙、抽血、校门口寒暄、跟老师谈孩子——每一个场景都聚焦真实生活，做成视频 + 点读 + 跟读。学完，就能用在明天早上。
              </p>
              <div className="hero-actions">
                <Link to="/explore" className="btn primary">
                  进入场景库
                </Link>
                <a href="#library" className="btn">
                  先试学一课 ↓
                </a>
              </div>
            </div>
            <div className="hero-img">
              <img src="/images/hero.webp" alt="秋日街道上两位女士聊天" />
              <div className="hero-card">
                <div>
                  <b>本期场景 · 校门口寒暄</b>
                  <p>“聊十几分钟不冷场”的固定话题库——孩子近况、课程、老师，下次见面接着聊。</p>
                </div>
                <span className="badge">人气场景</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ticker — static, verbatim from design. */}
        <div className="marquee" aria-hidden="true">
          <span>{TICKER_TEXT}</span>
          <span>{TICKER_TEXT}</span>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURED SCENE (untouched)
          ════════════════════════════════════════ */}
      <section className="bg-background pb-16 md:pb-24">
        <div className="max-w-[1120px] mx-auto px-6">
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
          SCENE LIBRARY — rebuilt per direction-A design source.
          ════════════════════════════════════════ */}
      <section id="library" className="bg-background libsec scroll-mt-24">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="kicker">Scene Library</div>
              <h2>
                按生活逛，不按课本翻。
                <br />
                <i>Browse by life, not by textbook.</i>
              </h2>
            </div>
            <p>工具站按功能排，这里按“你明天会遇到的事”排。点分类筛一下，像逛一本生活杂志。</p>
          </div>
          <div className="filters">
            {FILTERS.map(f => (
              <button
                key={f.key}
                data-f={f.key}
                className={filter === f.key ? "active" : ""}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="scenes" id="sceneGrid">
            {SCENE_CARDS.map(card => (
              <SceneCard
                key={card.h3}
                card={card}
                hidden={filter !== "all" && !card.cats.includes(filter)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
