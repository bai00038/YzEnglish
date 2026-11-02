import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Check, Headphones, Play } from "lucide-react";
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
      compact
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

          <div className="relative isolate min-h-[355px] md:min-h-[430px]">
            <span className="pointer-events-none absolute -right-[2%] top-[-1%] z-0 h-[350px] w-[350px] rounded-full bg-[rgba(223,233,197,.34)] md:-right-[5%] md:top-[-5%] md:h-[460px] md:w-[460px]" />
            <span className="pointer-events-none absolute right-[3%] top-[1%] z-0 h-11 w-11 rounded-full border-2 border-primary/15 md:right-[1%] md:top-[4%]" />
            <span className="pointer-events-none absolute left-[13%] top-[9%] z-0 h-4 w-4 rotate-45 rounded-[3px] bg-accent md:left-[17%]" />
            <div className="pointer-events-none absolute right-[2%] top-[29%] z-0 grid grid-cols-3 gap-2 opacity-55" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, index) => <span key={index} className="h-1.5 w-1.5 rounded-full bg-primary/55" />)}
            </div>

            <img
              src="/hero-aria-macbook-cutout-v4.png"
              alt="Aria 坐在电脑前练习真实场景英语"
              width={1536}
              height={1024}
              className="pointer-events-none absolute bottom-[5%] right-[-1%] z-10 h-[76%] w-auto max-w-none object-contain object-bottom drop-shadow-[0_18px_22px_rgba(18,36,28,.12)] md:bottom-[4%] md:right-[-4%] md:h-[82%]"
            />

            <div className="absolute left-0 top-[20%] z-20 w-[184px] rounded-[17px] border border-white/80 bg-white/95 p-3.5 shadow-[0_18px_38px_rgba(18,36,28,.15)] backdrop-blur-sm md:left-[3%] md:top-[23%] md:w-[210px] md:p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-accent/35 text-primary"><Headphones size={19} strokeWidth={2.3} /></span>
                <div>
                  <p className="text-[13px] font-black text-foreground md:text-[14px]">逐句精听</p>
                  <p className="mt-0.5 text-[10.5px] text-muted-foreground md:text-[11px]">一句一句，练到会说</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><span className="block h-full w-[72%] rounded-full bg-accent" /></div>
            </div>

            <div className="absolute bottom-[4%] right-0 z-20 w-[180px] rounded-[17px] border border-white/80 bg-white/95 p-3.5 shadow-[0_18px_38px_rgba(18,36,28,.15)] backdrop-blur-sm md:-right-[1%] md:bottom-[5%] md:w-[205px] md:p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-primary text-white"><Check size={19} strokeWidth={2.5} /></span>
                <div>
                  <p className="text-[13px] font-black text-foreground md:text-[14px]">学完接着练</p>
                  <p className="mt-0.5 text-[10.5px] text-muted-foreground md:text-[11px]">进度自动保存在这里</p>
                </div>
              </div>
            </div>
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
