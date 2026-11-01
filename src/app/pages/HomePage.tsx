import { Link } from "react-router";
import { ArrowRight, Clock3, Play, Volume2 } from "lucide-react";
import { useLatestScenes } from "@/data/scenes-access";
import { useFreeTrialScenes } from "@/data/collections-access";
import type { Scene } from "@/data/types";
import { getSceneCategoryLabel } from "@/data/scene-categories";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";
import { SceneBadges } from "@/app/components/SceneBadges";

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
  { role: "You", zhRole: "你", en: "Hi, I'd like to book a cleaning, please.", zh: "你好，我想约一个洗牙。", person: true },
  { role: "Front", zhRole: "前台", en: "Of course. Have you been here before?", zh: "好的，您之前来过我们这儿吗？" },
  { role: "You", zhRole: "你", en: "Yes — and this tooth has been bothering me.", zh: "来过，而且这颗牙最近有点不舒服。", person: true },
  { role: "Front", zhRole: "前台", en: "We'll take a look first, then go from there.", zh: "我们先检查一下，再决定下一步。" },
];

export function HomePage({ onExploreEnter }: { onExploreEnter?: () => void }) {
  const { data: latestData, loading: latestLoading, error: latestError } = useLatestScenes(3);
  const { data: freeData, loading: freeLoading, error: freeError } = useFreeTrialScenes();
  const scenes = latestData ?? [];
  return (
    <div className="bg-background">
      <header className="mx-auto max-w-[1180px] px-5 py-7 md:px-8 md:py-9">
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

          <div id="free" className="scroll-mt-4 rounded-[22px] border border-primary/15 bg-secondary/70 p-4 md:p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-['Noto_Serif_SC'] text-[18px] font-bold text-primary">免费体验 · 先学完一整集</h2>
              <span className="text-[11px] text-muted-foreground">无需注册</span>
            </div>
            {freeLoading ? <LoadingState label="Loading free experience…" /> : freeError ? <ErrorState message={freeError} /> : (
              <div className="space-y-2.5">
                {(freeData ?? []).map(({ scene, collectionLabel }) => {
                  const isLive = scene.status === "live";
                  const content = (
                    <>
                      <div className="h-[68px] w-[120px] flex-none overflow-hidden rounded-[10px] bg-primary/90">
                        {scene.photo ? <img src={scene.photo} alt="" className={`h-full w-full object-cover ${isLive ? "" : "grayscale opacity-45"}`} /> : <div className="h-full w-full bg-[radial-gradient(circle_at_70%_25%,rgba(200,241,105,.35),transparent_28%),linear-gradient(145deg,#315848,#0f3527)]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-bold text-muted-foreground">{collectionLabel}</p>
                        <p className="mt-1 truncate font-['Noto_Serif_SC'] text-[14px] font-bold text-primary">{scene.titleZh || scene.titleEn}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-[12px] font-bold text-primary">{isLive ? <>开始学习 <ArrowRight size={13} /></> : <><Clock3 size={13} /> 即将上线</>}</span>
                    </>
                  );
                  const className = "flex h-[82px] items-center gap-3 rounded-[14px] border border-border bg-card p-1.5 pr-3";
                  return isLive ? <Link key={scene.externalId ?? scene.id} to={`/scenes/${scene.slug}`} className={`${className} transition-colors hover:border-primary/30`}>{content}</Link> : <div key={scene.externalId ?? scene.id} className={`${className} opacity-75`} aria-disabled="true">{content}</div>;
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1180px] border-t border-border px-5 pb-2 pt-9 md:px-8" id="scenes">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-['Noto_Serif_SC'] text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">别慌，我们一个一个来。 <span className="display-serif text-[17px] font-medium italic text-muted-foreground">Don't panic. We'll take them one by one.</span></h2>
          <p className="max-w-[360px] text-[13px] leading-relaxed text-muted-foreground">挑一个场景，看完完整对话，把那几句练到脱口而出。</p>
        </div>

        {latestLoading ? <LoadingState label="Loading scenes…" /> : latestError ? <ErrorState message={latestError} /> : scenes.length ? (
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
