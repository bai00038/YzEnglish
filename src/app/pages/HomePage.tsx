import { Link } from "react-router";
import { ArrowRight, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCuratedFeaturedScenes, useLatestScenes } from "@/data/scenes-access";
import type { Scene } from "@/data/types";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";

function uniqueScenes(primary: Scene[], secondary: Scene[]) {
  const seen = new Set<number>();
  return [...primary, ...secondary].filter((scene) => {
    if (seen.has(scene.id)) return false;
    seen.add(scene.id);
    return true;
  });
}

function EditorialScene({ scene, large = false }: { scene: Scene; large?: boolean }) {
  return (
    <Link
      to={`/scenes/${scene.slug}`}
      className={`group relative min-h-[280px] overflow-hidden rounded-[18px] border border-primary/15 bg-card ${large ? "md:min-h-[420px]" : "md:min-h-[300px]"}`}
    >
      {scene.photo ? (
        <img src={scene.photo} alt={scene.titleEn} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" loading="lazy" />
      ) : scene.video_url ? (
        <video
          src={`${scene.video_url}#t=0.001`}
          aria-label={`${scene.titleEn} video cover`}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#254B3C,#0F3527)]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_32%,rgba(6,20,14,.82))]" />
      <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary shadow-sm"><Play size={14} fill="currentColor" /></span>
      <div className="absolute inset-x-4 bottom-4 z-10 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">{scene.category}</p>
        <h3 className="mt-1.5 font-['Noto_Serif_SC'] text-[21px] font-bold leading-tight">{scene.titleZh || scene.titleEn}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-white/85">{scene.titleEn}</p>
      </div>
    </Link>
  );
}

const demoLines = [
  { role: "You", zhRole: "你", en: "Hi, I'd like to book a cleaning, please.", zh: "你好，我想约一个洗牙。", person: true },
  { role: "Front", zhRole: "前台", en: "Of course. Have you been here before?", zh: "好的，您之前来过我们这儿吗？" },
  { role: "You", zhRole: "你", en: "Yes — and this tooth has been bothering me.", zh: "来过，而且这颗牙最近有点不舒服。", person: true },
  { role: "Front", zhRole: "前台", en: "We'll take a look first, then go from there.", zh: "我们先检查一下，再决定下一步。" },
];

const TICKER_ITEMS = [
  "At the dentist — 看牙怎么说",
  "At the pharmacy — 药房取药",
  "School communication — 家校沟通",
  "Blood work — 抽血检查",
  "Parent-teacher meeting — 家长会",
];
const TICKER_TEXT = TICKER_ITEMS.join(" ✦ ");
const HOME_CATEGORIES = ["购物英语", "日常生活", "医疗英语", "家校沟通"];

function SceneTicker() {
  const tickerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const ticker = tickerRef.current;
    if (!ticker) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.35 },
    );

    observer.observe(ticker);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={tickerRef} className="mx-auto max-w-[1180px] overflow-hidden border-y border-border py-5 md:py-6">
      <div className={`scene-ticker-track ${isVisible ? "is-running" : ""}`} aria-label={TICKER_TEXT}>
        {[0, 1].map((copy) => (
          <p
            key={copy}
            aria-hidden={copy === 1}
            className="scene-ticker-copy display-serif whitespace-nowrap px-5 text-[15px] italic text-secondary-foreground md:px-8 md:text-[16px]"
          >
            {TICKER_ITEMS.map((item) => (
              <span key={item} className="inline-flex items-center gap-10">
                <span>{item}</span>
                <span aria-hidden="true">✦</span>
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  const { data: featuredData, loading: featuredLoading, error: featuredError } = useCuratedFeaturedScenes();
  const { data: latestData, loading: latestLoading } = useLatestScenes(3);
  const featured = featuredData ?? [];
  const latest = latestData ?? [];
  const scenes = uniqueScenes(featured, latest)
    .sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)))
    .slice(0, 6);
  return (
    <div className="bg-background">
      <header className="mx-auto max-w-[1180px] px-5 py-12 md:px-8 md:py-[72px]">
        <div className="grid gap-8 md:grid-cols-[.92fr_1.08fr] md:items-center md:gap-[52px]">
          <div>
            <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground before:block before:h-px before:w-7 before:bg-muted-foreground">Canada · 真实生活英语</p>
            <h1 className="mt-6 font-normal leading-[0.92] tracking-[-0.03em] text-foreground">
              <span className="display-serif block text-[42px] font-semibold md:text-[54px]">Real scenes,<br /><em className="font-medium">for real life.</em></span>
              <span className="mt-4 block font-['Noto_Serif_SC'] text-[22px] font-bold leading-[1.35] md:text-[26px]">真实生活里的英语，提前练一遍。</span>
            </h1>
            <p className="mt-4 max-w-[480px] text-[15px] leading-[1.75] text-secondary-foreground">看牙、抽血、家校沟通、日常寒暄——每一个场景都聚焦真实生活，做成视频、点读和跟读。学完，就能用在下一次真实交流里。</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/explore" className="rounded-full border border-primary bg-primary px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90">进入场景库</Link>
              <a href="#learn" className="rounded-full border border-border bg-card px-5 py-3 text-sm font-bold text-foreground">先试学一课 ↓</a>
            </div>
          </div>

          <div className="relative isolate flex min-h-0 items-center justify-center px-1 py-2 md:min-h-[430px] md:py-2.5">
            <span className="pointer-events-none absolute -bottom-6 -left-5 z-0 h-[280px] w-[280px] rounded-full bg-accent/25 md:-bottom-9 md:-left-10 md:h-[340px] md:w-[340px]" />
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute right-5 top-[10%] z-0 h-[150px] w-[150px] text-accent opacity-25"
              viewBox="0 0 150 150"
              fill="none"
            >
              <circle cx="98" cy="48" r="42" fill="currentColor" />
            </svg>
            <figure className="relative z-10 w-[92%] max-w-[380px]">
              <img
                src="/hero-aria-cafe.jpg"
                alt="咖啡馆窗边，Aria 微笑着低头看自己的手机，自然地学英语"
                className="block aspect-[4/5] w-full rounded-[26px] object-cover shadow-[0_26px_52px_rgba(18,36,28,.22)]"
              />
              <figcaption className="absolute -left-2 top-[15%] flex max-w-[62%] items-start gap-2 rounded-[14px] border border-border bg-white px-3.5 py-2.5 shadow-[0_14px_30px_rgba(18,36,28,.14)] md:-left-[22px]">
                <span className="mt-[5px] h-[7px] w-[7px] flex-none rounded-full bg-accent" />
                <p className="text-[13.5px] font-semibold leading-[1.5] text-foreground">每天几分钟，吃透一个场景</p>
              </figcaption>
            </figure>
          </div>
        </div>
      </header>

      <SceneTicker />

      <section className="mx-auto max-w-[1180px] px-5 pb-2 pt-12 md:px-8" id="scenes">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground before:block before:h-px before:w-7 before:bg-muted-foreground">Scene Library</p>
            <h2 className="mt-2 font-['Noto_Serif_SC'] text-[28px] font-bold leading-[1.2] tracking-[-0.02em] md:text-[34px]">按生活逛，不按课本翻。<br /><span className="display-serif font-medium italic">Browse by life, not by textbook.</span></h2>
          </div>
          <p className="max-w-[360px] text-[13px] leading-relaxed text-muted-foreground">按“你下一次会遇到的事”找场景。先看完整交流如何发生，再练真正会用到的话。</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Link to="/explore" className="rounded-full border border-foreground bg-foreground px-3.5 py-2 text-[13px] font-semibold text-background">全部</Link>
          {HOME_CATEGORIES.map((category) => <Link key={category} to="/explore" className="rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-semibold text-secondary-foreground">{category}</Link>)}
        </div>

        {featuredLoading || latestLoading ? <LoadingState label="Loading scenes…" /> : featuredError ? <ErrorState message={featuredError} /> : scenes.length ? (
          <div className="grid gap-3.5 md:grid-cols-[1.25fr_.85fr_.85fr]">{scenes.map((scene, index) => <EditorialScene key={scene.id} scene={scene} large={index === 0} />)}</div>
        ) : <EmptyState title="No scenes yet." />}
      </section>

      <section className="mx-auto max-w-[1180px] px-5 pb-2 pt-12 md:px-8" id="learn">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground before:block before:h-px before:w-7 before:bg-muted-foreground">How it feels to learn</p>
            <h2 className="mt-2 font-['Noto_Serif_SC'] text-[28px] font-bold leading-[1.25] md:text-[34px]">点开一节课，<span className="display-serif font-medium italic">不像上课，像排练生活。</span></h2>
          </div>
          <p className="max-w-[360px] text-[13px] leading-relaxed text-muted-foreground">先看真实场景，再逐句点读、跟读和整理表达。不是做题，是为下一次交流做准备。</p>
        </div>

        <div className="rounded-[24px] bg-primary p-6 text-white md:p-12">
          <div className="grid gap-6 md:grid-cols-[1fr_1.12fr] md:items-start md:gap-12">
            <div className="pt-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">Featured Scene · HC 医疗系列</p>
              <h3 className="mt-3.5 font-['Noto_Serif_SC'] text-[28px] font-bold leading-[1.45]">在牙科前台：<br />“我想约一个洗牙，<br />顺便看看这颗牙。”</h3>
              <p className="mt-4 max-w-[34em] text-[14.5px] leading-[1.9] text-white/75">先看一遍视频，再逐句点读，最后跟读录一遍。每句都放回真实流程里学——不是课本腔，是前台真的会这样说。</p>
              <div className="mt-6 flex flex-wrap gap-2.5">{["视频", "点读", "跟读"].map((label) => <span key={label} className="rounded-full border border-white/30 px-3.5 py-2 text-xs font-bold">{label}</span>)}</div>
            </div>

            <div>
              <div className="rounded-2xl bg-card p-2 text-foreground">
                {demoLines.map((line, index) => (
                  <div key={line.en} className={`flex gap-3 rounded-xl border p-3 ${index === 0 ? "border-[#D6E8A8] bg-[#EEF6D8]" : "border-transparent"}`}>
                    <span className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-white ${line.person ? "bg-primary" : "bg-[#8A6D3B]"}`}>{line.role}</span>
                    <div className="min-w-0"><b className="text-[13px]">{line.zhRole}</b><p className="display-serif mt-0.5 text-base">{line.en}</p><p className="mt-0.5 text-xs text-muted-foreground">{line.zh}</p></div>
                    <Volume2 size={14} className="ml-auto mt-1 shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
              <div className="mx-1 mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><span className="block h-full w-1/4 bg-accent" /></div>
              <div className="mx-1 mt-2 flex justify-between gap-3 text-xs text-white/55"><span>已点读 1 / 4 句</span><span>跟读清单 · 学完去生活里试一次</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-14 md:px-8 md:py-20">
        <div className="flex flex-col items-start justify-between gap-6 border-y border-border py-8 md:flex-row md:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Ready for real life?</p><h2 className="display-serif mt-2 text-[34px] font-medium leading-tight md:text-[46px]">Choose the situation you need next.</h2></div>
          <Link to="/explore" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-accent-foreground">逛全部场景 <ArrowRight size={15} /></Link>
        </div>
      </section>
    </div>
  );
}
