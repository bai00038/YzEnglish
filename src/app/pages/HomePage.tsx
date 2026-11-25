import { PageHeading } from "@/app/components/PageHeading";
import { Link } from "react-router";
import { ArrowRight, Headphones, PenLine, Play } from "lucide-react";
import { useFreeTrialScenes } from "@/data/collections-access";
import { useLatestScenes } from "@/data/scenes-access";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";
import { getSceneCardCategoryLabel } from "@/data/scene-categories";
import type { Scene } from "@/data/types";
import { responsiveImageProps } from "@/data/responsive-image";

const HOME_COVER_FALLBACKS: Record<string, string> = {
  "SH-01-007": "https://go.learnyzenglish.com/content/SH-01-007/cover.png",
  "ST-01-001": "https://go.learnyzenglish.com/content/ST-01-001/cover.jpg",
};

function HomeEditorialScene({ scene, featured = false, badge = "免费体验", short = false }: { scene: Scene; featured?: boolean; badge?: string; short?: boolean }) {
  const cover = scene.photo ?? (scene.externalId ? HOME_COVER_FALLBACKS[scene.externalId] : undefined);
  return (
    <Link
      to={`/scenes/${scene.slug}`}
      className={`group relative overflow-hidden rounded-[20px] bg-[#E9E4DA] text-white shadow-[0_18px_42px_rgba(18,36,28,.08)] ${short ? "min-h-[230px] md:min-h-[250px]" : "min-h-[300px] md:min-h-[330px] min-[1025px]:min-h-[430px]"}`}
    >
      {cover ? (
        <img {...responsiveImageProps(cover, "(max-width: 1024px) 33vw, 40vw")} alt={scene.titleEn} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" loading="lazy" decoding="async" />
      ) : scene.video_url ? (
        <video src={`${scene.video_url}#t=0.001`} aria-label={scene.titleEn} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" muted playsInline preload="metadata" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#315848,#0f3527)]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,19,13,.02)_24%,rgba(5,19,13,.18)_56%,rgba(5,19,13,.9)_100%)]" />
      {badge ? <span className="absolute left-4 top-4 rounded-full bg-accent/80 px-3 py-1.5 text-[11px] font-black text-primary">{badge}</span> : null}
      <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/92 text-primary shadow-sm backdrop-blur-sm">
        <Play size={15} fill="currentColor" />
      </span>
      <div className="absolute inset-x-5 bottom-5 z-10 md:inset-x-6 md:bottom-6">
        <p className="text-[11px] font-bold tracking-[0.12em] text-white/76">{getSceneCardCategoryLabel(scene.collectionId, scene.category)}</p>
        <h3 className={`mt-2 font-sans font-black leading-[1.18] tracking-[-0.02em] text-white ${short ? "truncate text-[20px] md:text-[21px]" : featured ? "text-[27px] md:text-[31px]" : "text-[23px] md:text-[26px]"}`}>
          {scene.titleZh || scene.titleEn}
        </h3>
        <p className={`mt-1.5 line-clamp-2 font-sans italic leading-snug text-white/78 ${short ? "min-h-[2.6em]" : ""} ${featured ? "text-[14px] md:text-[15px]" : "text-[13px] md:text-[14px]"}`}>{scene.titleEn}</p>
      </div>
    </Link>
  );
}

function SentenceListeningDemo() {
  return (
    <div role="group" aria-label="逐句精听界面示意" className="rounded-[20px] border border-border bg-white p-3 shadow-[0_14px_38px_rgba(15,53,39,0.08)]">
      <div className="grid min-h-[180px] grid-cols-[48px_minmax(0,1fr)] items-center gap-4 rounded-[17px] bg-[#F5F1E8] px-5 py-5 text-left">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F3A2B] text-[13px] font-black text-white">You</span>
        <div className="min-w-0">
          <span className="block text-[13px] font-black text-primary">你</span>
          <p className="mt-2 break-words font-serif text-[22px] leading-snug text-primary md:text-[25px]">Hi, I'd like to book a cleaning, please.</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground md:text-[14px]">你好，我想约一个洗牙。</p>
        </div>
      </div>
      <div aria-hidden="true" className="mt-3 p-3">
        <div className="flex items-center justify-center gap-3">
          <span className="w-20 shrink-0 whitespace-nowrap rounded-full border border-border bg-white px-3 py-2 text-center text-[11px] font-black text-primary opacity-35 md:w-24">← 上一句</span>
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_18px_rgba(15,53,39,0.2)]"><Play className="ml-0.5 h-5 w-5 fill-current" /></span>
          <span className="w-20 shrink-0 whitespace-nowrap rounded-full border border-border bg-white px-3 py-2 text-center text-[11px] font-black text-primary md:w-24">下一句 →</span>
        </div>
        <p className="mt-1.5 text-center text-[11px] font-black tabular-nums text-primary">1 / 4</p>
      </div>
    </div>
  );
}

export function HomePage({ onExploreEnter }: { onExploreEnter?: () => void }) {
  const { data: freeData, loading: freeLoading, error: freeError } = useFreeTrialScenes();
  const scenes = (freeData ?? []).map(({ scene }) => scene);
  const { data: latestData, loading: latestLoading } = useLatestScenes(4);
  const latestScenes = latestData ?? [];
  const showFreshSection = latestLoading || latestScenes.length > 0;
  return (
    <div className="bg-background">
      <header className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid gap-6 sm:gap-7 md:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] md:items-center md:gap-4 lg:grid-cols-[minmax(0,.9fr)_minmax(460px,1.1fr)] lg:gap-5 xl:grid-cols-[.94fr_1.06fr] xl:gap-8">
          <div className="relative z-10 max-w-[620px] md:max-w-none">
            <h1 className="font-normal leading-[0.96] tracking-[-0.02em] text-foreground">
              <span className="display-serif block text-[42px] font-semibold sm:text-[48px] md:text-[44px] lg:text-[56px] xl:text-[62px]"><span className="home-hero-brand">Real scenes</span><br /><em className="mt-2 inline-block bg-[linear-gradient(transparent_72%,rgba(190,244,91,.34)_72%)] pb-1 font-medium">for real life</em></span>
              <span className="mt-6 block font-sans text-[19px] font-bold leading-[1.55] sm:text-[20px] md:mt-6 md:text-[17px] lg:mt-7 lg:text-[20px] xl:text-[22px]">深入真实场景，摆脱口语困境</span>
            </h1>
            <p className="mt-5 max-w-[560px] text-[15px] leading-[1.85] text-secondary-foreground md:text-[14px] lg:text-[15px]">看牙怎么说，家长会怎么聊，遇到邻居怎么打招呼？跟着视频听一听、练几遍，下次遇到时，心里更有底。</p>
            <div className="mt-7 flex flex-wrap gap-3.5 sm:mt-8 md:mt-6 lg:mt-8 lg:gap-4">
              <Link to="/explore" onClick={onExploreEnter} className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-primary bg-primary px-7 py-4 text-[15px] font-black tracking-[0.01em] text-white shadow-[0_10px_24px_rgba(18,53,39,.12)] transition-all hover:-translate-y-0.5 hover:opacity-90 lg:min-h-[58px] lg:px-8 lg:text-[16px]">进入场景库</Link>
              <a href="#free" className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-primary/15 bg-card px-7 py-4 text-[15px] font-black tracking-[0.01em] text-foreground shadow-[0_10px_24px_rgba(18,53,39,.06)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 lg:min-h-[58px] lg:px-8 lg:text-[16px]">先免费学 3 集 →</a>
            </div>
          </div>

          <div className="relative isolate hidden aspect-[31/23] w-full max-w-[620px] justify-self-center [container-type:inline-size] md:block md:translate-y-5 lg:translate-y-7">
            <span className="pointer-events-none absolute right-[1%] top-[1%] z-0 aspect-square w-[76%] rounded-full bg-[rgba(216,229,183,.46)]" />
            <span className="pointer-events-none absolute right-[6%] top-[6%] z-0 aspect-square h-[9%] rounded-full border-2 border-primary/15" />
            <span className="pointer-events-none absolute left-[19%] top-[10%] z-0 aspect-square h-[4%] rotate-45 rounded-[3px] bg-accent" />
            <div className="pointer-events-none absolute right-[4%] top-[31%] z-0 grid grid-cols-3 gap-[clamp(5px,1.2cqw,8px)] opacity-55" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, index) => <span key={index} className="h-[clamp(4px,.9cqw,6px)] w-[clamp(4px,.9cqw,6px)] rounded-full bg-primary/55" />)}
            </div>

            <img
              src="/hero-aria-macbook-cutout-v4.webp"
              alt="Aria 坐在电脑前练习真实场景英语"
              width={1536}
              height={1024}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="pointer-events-none absolute bottom-[1%] right-[1%] z-10 h-[98%] w-auto max-w-none object-contain object-bottom drop-shadow-[0_18px_22px_rgba(18,36,28,.12)]"
            />

            <div className="absolute left-0 top-[21%] z-20 w-[40%] min-w-[170px] max-w-[230px] rounded-[clamp(15px,2.8cqw,18px)] border border-white/80 bg-white/95 p-[clamp(12px,2.4cqw,16px)] shadow-[0_18px_38px_rgba(18,36,28,.15)] backdrop-blur-sm">
              <div className="flex items-center gap-[clamp(9px,2cqw,12px)]">
                <span className="grid aspect-square h-[clamp(38px,7cqw,44px)] flex-none place-items-center rounded-[clamp(10px,2cqw,12px)] bg-accent/35 text-primary"><Headphones className="h-[46%] w-[46%]" strokeWidth={2.3} /></span>
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-[clamp(12px,2.3cqw,14px)] font-black text-foreground">逐句精听</p>
                  <p className="mt-0.5 whitespace-nowrap text-[clamp(9.5px,1.8cqw,11px)] text-muted-foreground">一句一句，练到会说</p>
                </div>
              </div>
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
            <PageHeading as="h2" subtitle="Free Experience">免费体验区</PageHeading>
          </div>
        </div>

        {freeLoading ? <LoadingState label="Loading free experience…" /> : freeError ? <ErrorState message={freeError} /> : scenes.length ? (
          <div className="grid items-stretch gap-3.5 md:grid-cols-[1.45fr_1fr_1fr]">{scenes.map((scene, index) => <HomeEditorialScene key={scene.id} scene={scene} featured={index === 0} />)}</div>
        ) : <EmptyState title="No scenes yet." />}
        <div className="mt-5 text-center"><Link to="/explore" onClick={onExploreEnter} className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-5 py-3 text-sm font-bold text-white">进入场景库 <ArrowRight size={15} /></Link></div>
      </section>

      {showFreshSection ? (
        <section className="mx-auto max-w-[1180px] px-5 pb-2 pt-12 md:px-8" id="fresh">
          {latestLoading ? <LoadingState label="Loading latest scenes…" /> : (
            <>
              {latestScenes.length ? (
                <div>
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <PageHeading as="h2" subtitle="Just Added">最新上架</PageHeading>
                    </div>
                    <Link to="/explore" onClick={onExploreEnter} className="inline-flex items-center gap-2 text-sm font-bold text-primary">逛全部场景 <ArrowRight size={15} /></Link>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{latestScenes.map((scene) => <HomeEditorialScene key={scene.externalId ?? scene.id} scene={scene} short badge={scene.isFreeExperience ? "免费体验" : "NEW"} />)}</div>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      <section className="mx-auto max-w-[1180px] px-5 pb-2 pt-12 md:px-8" id="learn">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <PageHeading as="h2" subtitle="How it feels to learn">如何学习？</PageHeading>
          </div>
        </div>

        <div className="rounded-[24px] bg-primary p-6 text-white md:p-12">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-12">
            <div>
              <h3 className="font-sans text-[28px] font-bold leading-[1.55] md:text-[32px]">
                <span className="block">点开一个场景</span>
                <span className="block font-medium text-white/70">不像上课</span>
                <span className="mt-1 block">像在<span className="relative inline-block pb-3 text-accent">排练生活
                  <svg aria-hidden="true" viewBox="0 0 180 18" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-3 w-full fill-none">
                    <path d="M4 5C48 15 119 15 176 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span></span>
              </h3>
              <p className="mt-5 text-sm leading-relaxed text-white/75">按步骤练熟，把学到的英语用进真实生活。</p>
              <ol aria-label="学习流程" className="mt-8 flex flex-wrap items-center gap-y-3">{["看视频", "练精听", "跟读", "听写", "复习"].map((label, index) => <li key={label} className="flex items-center"><span className="whitespace-nowrap rounded-full border border-white/30 px-3 py-2 text-xs font-bold">{label}</span>{index < 4 && <ArrowRight size={12} className="mx-1.5 shrink-0 text-white/55" aria-hidden="true" />}</li>)}</ol>
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
