import { Link } from "react-router";
import { useScenes } from "@/data/scenes-access";

const METHOD_STEPS = [
  { num: "01", title: "看场景", en: "Watch the scene", desc: "观看真实场景视频，看懂完整经过。" },
  { num: "02", title: "学对话", en: "Learn the dialogue", desc: "逐句跟读，掌握关键表达。" },
  { num: "03", title: "练开口", en: "Practise out loud", desc: "开口练习，有准备地应对。" },
];

const AUDIENCES = [
  "在海外生活的人——新落地，或定居多年、遇到事儿还是没底",
  "要跟学校打交道的家长——家长会、请假、和老师当面聊",
  "准备出国的人——去定居、留学或旅行，出发前先排练一遍",
  "在国内学英语的人——不只为考试，也想学真实生活英语",
];

function ExploreButton() {
  return (
    <Link
      to="/explore"
      className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
    >
      逛场景库
    </Link>
  );
}

export function AboutPage() {
  const { data: scenes } = useScenes();
  const sceneCount = scenes?.length;
  const collectionCount = scenes ? new Set(scenes.map((scene) => scene.collectionId)).size : undefined;
  const stats: { value: string; suffix: string; label: string }[] = [
    { value: sceneCount != null ? String(sceneCount) : "", suffix: "+", label: "真实场景 · 持续更新中" },
    { value: collectionCount != null ? String(collectionCount) : "", suffix: "", label: "个主题合集 · 从看牙到安家" },
    { value: "3", suffix: " 步", label: "看懂 · 学会 · 说出口" },
  ];
  return (
    <div className="bg-background pt-9 md:pt-11">
      <section className="mx-auto max-w-[1180px] px-3 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.25fr_.55fr] md:gap-20">
          <div>
            <p className="editorial-kicker">About · 关于我们</p>
            <h1 className="display-serif mt-2.5 text-[32px] font-bold leading-[1.08] tracking-[-0.01em] text-primary md:text-[44px]">
              Real scenes for real life.
            </h1>
            <p className="mt-2.5 font-zh-serif text-[18px] font-bold text-foreground md:text-[20px]">
              为真实生活，练真场景英语。
            </p>
            <p className="display-serif mt-4 max-w-[640px] text-[16px] italic leading-relaxed text-secondary-foreground md:text-[16.5px]">
              YZ English turns real overseas life into watchable, practicable English scenes — so you walk in prepared, not surprised.
            </p>
            <p className="mt-2 max-w-[640px] text-base leading-relaxed text-secondary-foreground">
              把海外真实生活做成看得见、练得出的英语场景，让你有准备地走进每一个场景。
            </p>
            <div className="mt-5"><ExploreButton /></div>
          </div>

          <aside className="grid grid-cols-3 gap-4 border-t border-[#DCD4BE] pt-6 md:block md:border-l md:border-t-0 md:pl-8 md:pt-1">
            {stats.map((stat, index) => (
              <div key={stat.label} className={index === 0 ? "md:pb-[18px]" : "md:border-t md:border-[#E3DCC6] md:py-[18px]"}>
                <span className="display-serif block min-h-[34px] text-[34px] font-semibold leading-none text-primary md:min-h-[42px] md:text-[42px]">
                  {stat.value}
                  {stat.value ? <span className="text-[#4E9F3D]">{stat.suffix}</span> : null}
                </span>
                <p className="mt-1.5 text-[12.5px] tracking-[0.05em] text-muted-foreground md:mt-2 md:text-[13.5px]">{stat.label}</p>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section className="mt-14 bg-[#E9E0C9] py-[54px] md:mt-16 md:py-[58px]">
        <div className="mx-auto max-w-[1180px] px-3 md:px-8">
          <div className="max-w-[720px]">
            <h2 className="flex items-baseline gap-3 font-zh-serif text-[24px] font-bold text-foreground md:text-[26px]">
              为什么做
              <span className="display-serif text-[15px] font-medium italic text-muted-foreground">Why</span>
            </h2>
            <p className="display-serif mt-4 text-[16.5px] italic leading-relaxed text-secondary-foreground">
              Many learners aren't held back by poor English, but by never having lived that situation in English before. Not knowing what comes next is what makes people nervous.
            </p>
            <p className="mt-2 text-base leading-relaxed text-secondary-foreground">
              很多学习者不是英语差，而是从没用英语经历过那个场景。不知道接下来会发生什么，才是紧张的根源。
            </p>
            <p className="mt-8 border-l-4 border-accent py-0.5 pl-5 font-zh-serif text-[21px] font-bold text-primary md:mt-11 md:text-[25px]">
              先看一遍场景，再走进真实生活。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-3 pb-[72px] pt-14 md:px-8 md:pt-16">
        <h2 className="flex items-baseline gap-3 font-zh-serif text-[24px] font-bold text-foreground">
          学习方法
          <span className="display-serif text-[15px] font-medium italic text-muted-foreground">How it works</span>
        </h2>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {METHOD_STEPS.map((step) => (
            <article key={step.num} className="rounded-[22px] border border-border bg-card p-6 md:p-[26px]">
              <span className="display-serif grid h-[46px] w-[46px] place-items-center rounded-full bg-primary text-base font-bold text-white">
                {step.num}
              </span>
              <h3 className="mt-[18px] font-zh-serif text-[19px] font-bold text-foreground">
                {step.title}
                <span className="display-serif mt-1 block text-[13.5px] font-medium italic text-muted-foreground">{step.en}</span>
              </h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-secondary-foreground">{step.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-primary py-[46px] md:py-[60px]">
        <div className="mx-auto max-w-[1180px] px-3 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Who it's for · 适合谁</p>
          <h2 className="mt-4 font-zh-serif text-[24px] font-bold text-white md:text-[32px]">
            为想把英语用进真实生活的人而做
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {AUDIENCES.map((audience) => (
              <div key={audience} className="flex items-center gap-3 rounded-[18px] border border-white/15 bg-white/[0.06] px-5 py-5 text-base text-white/90 md:px-6">
                <span className="h-2 w-2 flex-none rounded-full bg-accent" />
                {audience}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-3 py-[60px] text-center md:px-8 md:py-[84px]">
        <h2 className="display-serif text-[34px] font-bold leading-[1.1] tracking-[-0.01em] text-primary md:text-[54px]">
          Prepare before it happens.
        </h2>
        <p className="mt-3 font-zh-serif text-[19px] text-secondary-foreground">
          在场景发生之前，先练一遍。
        </p>
        <div className="mt-7"><ExploreButton /></div>
      </section>
    </div>
  );
}
