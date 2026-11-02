import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Play } from "lucide-react";
import { useFreeTrialScenes } from "@/data/collections-access";
import type { Scene } from "@/data/types";
import { getSceneCategoryLabel } from "@/data/scene-categories";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";
import { SceneBadges } from "@/app/components/SceneBadges";
import { SentenceListeningCard } from "@/app/components/SentenceListeningCard";

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
      <SceneBadges isNew={scene.isNew} isHot={scene.isHot} className="absolute left-3 top-3" />
      <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary shadow-sm"><Play size={14} fill="currentColor" /></span>
      <div className="absolute inset-x-4 bottom-4 z-10 text-white">
        <p className="text-[10px] font-bold tracking-[0.14em] text-white/80">{getSceneCategoryLabel(scene.category)}</p>
        <h3 className="mt-1.5 font-['Noto_Serif_SC'] text-[21px] font-bold leading-tight">{scene.titleZh || scene.titleEn}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-white/85">{scene.titleEn}</p>
      </div>
    </Link>
  );
}

const demoLines = [
  { speaker: "You", speakerZh: "你", en: "Hi, I'd like to book a cleaning, please.", zh: "你好，我想约一个洗牙。" },
  { speaker: "Front", speakerZh: "前台", en: "Of course. Have you been here before?", zh: "好的，您之前来过我们这儿吗？" },
  { speaker: "You", speakerZh: "你", en: "Yes — and this tooth has been bothering me.", zh: "来过，而且这颗牙最近有点不舒服。" },
  { speaker: "Front", speakerZh: "前台", en: "We'll take a look first, then go from there.", zh: "我们先检查一下，再决定下一步。" },
];

function SentenceListeningDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [repeatLine, setRepeatLine] = useState(false);
  const [bilingualMode, setBilingualMode] = useState(true);
  const line = demoLines[activeIndex];

  function moveLine(direction: -1 | 1) {
    setIsPlaying(false);
    setActiveIndex(index => Math.min(demoLines.length - 1, Math.max(0, index + direction)));
  }

  return (
    <SentenceListeningCard
      line={line}
      speakerLabel={line.speaker}
      speakerZh={line.speakerZh}
      isLearner={line.speaker.toLowerCase() === "you"}
      position={activeIndex}
      total={demoLines.length}
      isPlaying={isPlaying}
      onTogglePlay={() => setIsPlaying(value => !value)}
      onPrevious={() => moveLine(-1)}
      onNext={() => moveLine(1)}
      playbackRate={playbackRate}
      onPlaybackRateChange={setPlaybackRate}
      repeatLine={repeatLine}
      onRepeatLineChange={setRepeatLine}
      bilingualMode={bilingualMode}
      onBilingualModeChange={setBilingualMode}
    />
  );
}

export function HomePage({ onExploreEnter }: { onExploreEnter?: () => void }) {
  const { data: freeData, loading: freeLoading, error: freeError } = useFreeTrialScenes();
  const scenes = (freeData ?? []).map(({ scene }) => scene);
  return (
    <div className="bg-background">
      <header className="mx-auto max-w-[1180px] px-5 py-6 md:px-8 md:py-7">
        <div className="grid gap-7 md:grid-cols-[.9fr_1.1fr] md:items-center md:gap-10">
          <div>
            <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground before:block before:h-px before:w-7 before:bg-muted-foreground">Canada · 真实生活英语</p>
            <h1 className="mt-5 font-normal leading-[0.98] tracking-[-0.03em] text-foreground">
              <span className="display-serif block text-[42px] font-semibold md:text-[48px]">Real scenes,<br /><em className="font-medium">for real life.</em></span>
              <span className="mt-5 block font-['Noto_Serif_SC'] text-[20px] font-bold leading-[1.4]">真实生活里的英语，先练熟再上场。</span>
            </h1>
            <p className="mt-4 max-w-[500px] text-[14px] leading-[1.8] text-secondary-foreground">看牙、抽血、家校沟通、日常寒暄——每个场景都有视频和跟读，练几遍，下次就不慌。</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/explore" onClick={onExploreEnter} className="rounded-full border border-primary bg-primary px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90">进入场景库</Link>
              <a href="#free" className="rounded-full border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5">免费体验课程 →</a>
            </div>
          </div>

          <div className="relative isolate flex min-h-0 items-center justify-center px-1 py-1 md:min-h-[360px] md:py-1.5">
            <span className="pointer-events-none absolute -bottom-5 left-1 z-0 h-[230px] w-[230px] rounded-full bg-accent/25 md:-bottom-7 md:left-5 md:h-[270px] md:w-[270px]" />
            <figure className="relative z-10 w-[90%] max-w-[360px]">
              <img
                src="/hero-v7-final.webp"
                alt="窗边书架旁，Aria 坐着向镜头展示手机里的英语学习场景"
                width={1296}
                height={1397}
                className="block h-auto w-full rounded-[26px] shadow-[0_26px_52px_rgba(18,36,28,.22)]"
              />
              <figcaption className="absolute -left-2 top-[15%] flex max-w-[66%] items-start gap-2 rounded-[13px] border border-border bg-white px-3 py-2 shadow-[0_12px_24px_rgba(18,36,28,.12)] md:-left-[18px]">
                <span className="mt-[5px] h-[7px] w-[7px] flex-none rounded-full bg-accent" />
                <p className="text-[12.5px] font-semibold leading-[1.5] text-foreground">每天几分钟，吃透一个场景</p>
              </figcaption>
            </figure>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1180px] scroll-mt-24 px-5 pb-2 pt-7 md:px-8" id="free">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground before:block before:h-px before:w-7 before:bg-muted-foreground">Free Experience</p>
            <h2 className="mt-2 font-['Noto_Serif_SC'] text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">免费体验区</h2>
          </div>
          <p className="max-w-[360px] text-[13px] leading-relaxed text-muted-foreground">无需注册</p>
        </div>

        {freeLoading ? <LoadingState label="Loading free experience…" /> : freeError ? <ErrorState message={freeError} /> : scenes.length ? (
          <div className="grid gap-3.5 md:grid-cols-[1.25fr_.85fr_.85fr]">{scenes.map((scene, index) => <EditorialScene key={scene.id} scene={scene} large={index === 0} />)}</div>
        ) : <EmptyState title="No scenes yet." />}
        <div className="mt-5 text-center"><Link to="/explore" onClick={onExploreEnter} className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-5 py-3 text-sm font-bold text-white">进入场景库 <ArrowRight size={15} /></Link></div>
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
          <div className="grid gap-6 lg:grid-cols-[1fr_1.12fr] lg:items-start lg:gap-12">
            <div className="pt-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">Featured Scene · 看病就医</p>
              <h3 className="mt-3.5 font-['Noto_Serif_SC'] text-[28px] font-bold leading-[1.45]">在牙科前台：<br />“我想约一个洗牙，<br />顺便看看这颗牙。”</h3>
              <p className="mt-4 max-w-[34em] text-[14.5px] leading-[1.9] text-white/75">先看一遍视频，再逐句点读，最后跟读录一遍。每句都放回真实流程里学——不是课本腔，是前台真的会这样说。</p>
              <div className="mt-6 flex flex-wrap gap-2.5">{["视频", "点读", "跟读"].map((label) => <span key={label} className="rounded-full border border-white/30 px-3.5 py-2 text-xs font-bold">{label}</span>)}</div>
            </div>

            <div className="min-w-0 text-foreground">
              <SentenceListeningDemo />
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
