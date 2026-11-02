import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Headphones, PenLine, Play } from "lucide-react";
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
      <header className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid gap-6 sm:gap-7 md:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] md:items-center md:gap-4 lg:grid-cols-[minmax(0,.9fr)_minmax(460px,1.1fr)] lg:gap-5 xl:grid-cols-[.94fr_1.06fr] xl:gap-8">
          <div className="relative z-10 max-w-[620px] md:max-w-none">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-primary/10 bg-white/55 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground shadow-[0_8px_22px_rgba(18,36,28,.04)] before:block before:h-px before:w-7 before:bg-muted-foreground after:block after:h-1.5 after:w-1.5 after:rounded-full after:bg-accent">Canada · 真实生活英语</p>
            <h1 className="mt-7 font-normal leading-[0.96] tracking-[-0.02em] text-foreground">
              <span className="display-serif block text-[42px] font-semibold sm:text-[48px] md:text-[44px] lg:text-[56px] xl:text-[62px]">Real scenes<br /><em className="mt-2 inline-block bg-[linear-gradient(transparent_72%,rgba(190,244,91,.34)_72%)] pb-1 font-medium">for real life</em></span>
              <span className="mt-6 block border-l-[3px] border-accent pl-4 font-['Noto_Serif_SC'] text-[19px] font-bold leading-[1.55] sm:text-[20px] md:mt-6 md:text-[17px] lg:mt-7 lg:text-[20px] xl:text-[22px]">真实生活里的英语，先练熟再上场。</span>
            </h1>
            <p className="mt-5 max-w-[560px] text-[15px] leading-[1.85] text-secondary-foreground md:text-[14px] lg:text-[15px]">看牙、抽血、家校沟通、日常寒暄——每个场景都有视频和跟读，练几遍，<br className="hidden xl:block" />下次就不慌。</p>
            <div className="mt-7 flex flex-wrap gap-3 sm:mt-8 md:mt-6 lg:mt-8 lg:gap-3.5">
              <Link to="/explore" onClick={onExploreEnter} className="rounded-full border border-primary bg-primary px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 md:px-4 md:py-2.5 md:text-[13px] lg:px-5 lg:py-3 lg:text-sm">进入场景库</Link>
              <a href="#free" className="rounded-full border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 md:px-4 md:py-2.5 md:text-[13px] lg:px-5 lg:py-3 lg:text-sm">先免费学 3 集 →</a>
            </div>
          </div>

          <div className="relative isolate aspect-[31/23] w-full max-w-[620px] justify-self-center [container-type:inline-size]">
            <span className="pointer-events-none absolute right-[1%] top-[1%] z-0 aspect-square w-[76%] rounded-full bg-[rgba(223,233,197,.34)]" />
            <span className="pointer-events-none absolute right-[6%] top-[6%] z-0 aspect-square h-[9%] rounded-full border-2 border-primary/15" />
            <span className="pointer-events-none absolute left-[19%] top-[10%] z-0 aspect-square h-[4%] rotate-45 rounded-[3px] bg-accent" />
            <div className="pointer-events-none absolute right-[4%] top-[31%] z-0 grid grid-cols-3 gap-[clamp(5px,1.2cqw,8px)] opacity-55" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, index) => <span key={index} className="h-[clamp(4px,.9cqw,6px)] w-[clamp(4px,.9cqw,6px)] rounded-full bg-primary/55" />)}
            </div>

            <img
              src="/hero-aria-macbook-cutout-v4.png"
              alt="Aria 坐在电脑前练习真实场景英语"
              width={1536}
              height={1024}
              className="pointer-events-none absolute bottom-[2%] right-[-1%] z-10 h-[88%] w-auto max-w-none object-contain object-bottom drop-shadow-[0_18px_22px_rgba(18,36,28,.12)]"
            />

            <div className="absolute left-0 top-[21%] z-20 w-[40%] min-w-[170px] max-w-[230px] rounded-[clamp(15px,2.8cqw,18px)] border border-white/80 bg-white/95 p-[clamp(12px,2.4cqw,16px)] shadow-[0_18px_38px_rgba(18,36,28,.15)] backdrop-blur-sm">
              <div className="flex items-center gap-[clamp(9px,2cqw,12px)]">
                <span className="grid aspect-square h-[clamp(38px,7cqw,44px)] flex-none place-items-center rounded-[clamp(10px,2cqw,12px)] bg-accent/35 text-primary"><Headphones className="h-[46%] w-[46%]" strokeWidth={2.3} /></span>
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-[clamp(12px,2.3cqw,14px)] font-black text-foreground">逐句精听</p>
                  <p className="mt-0.5 whitespace-nowrap text-[clamp(9.5px,1.8cqw,11px)] text-muted-foreground">一句一句，练到会说</p>
                </div>
              </div>
              <div className="mt-[clamp(9px,2cqw,12px)] h-1.5 overflow-hidden rounded-full bg-secondary"><span className="block h-full w-[72%] rounded-full bg-accent" /></div>
            </div>

            <div className="absolute bottom-[5%] right-0 z-20 w-[40%] min-w-[170px] max-w-[230px] rounded-[clamp(15px,2.8cqw,18px)] border border-white/80 bg-white/95 p-[clamp(12px,2.4cqw,16px)] shadow-[0_18px_38px_rgba(18,36,28,.15)] backdrop-blur-sm">
              <div className="flex items-center gap-[clamp(9px,2cqw,12px)]">
                <span className="grid aspect-square h-[clamp(38px,7cqw,44px)] flex-none place-items-center rounded-[clamp(10px,2cqw,12px)] bg-primary text-white"><PenLine className="h-[46%] w-[46%]" strokeWidth={2.4} /></span>
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-[clamp(12px,2.3cqw,14px)] font-black text-foreground">听写巩固</p>
                  <p className="mt-0.5 whitespace-nowrap text-[clamp(9.5px,1.8cqw,11px)] text-muted-foreground">听完写下来，记得更牢</p>
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
