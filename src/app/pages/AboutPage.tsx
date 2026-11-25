import { Link } from "react-router";
import { PageHeading } from "@/app/components/PageHeading";
import "@/styles/about.css";
import { useScenes } from "@/data/scenes-access";

const METHOD_STEPS = [
  { num: "01", title: "看一遍视频", en: "Watch the scene", desc: "先看清楚事情怎么发生，听听双方都说了什么。" },
  { num: "02", title: "一句一句学", en: "Learn the dialogue", desc: "没听清的地方反复听，留意自己也能用上的说法。" },
  { num: "03", title: "自己开口练", en: "Practise out loud", desc: "跟着读几遍，再试着不看字幕说出来。" },
];

const AUDIENCES = [
  "已经在海外生活：有些事能应付，有些场合还是不知道怎么开口。",
  "需要和学校沟通的家长：想提前练练家长会、请假，以及和老师聊天时会用到的话。",
  "正在准备出国：定居、留学或旅行之前，先熟悉一些常见对话。",
  "想学日常英语：暂时没有出国计划，也想听懂、说出生活里常用的英语。",
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
    { value: sceneCount != null ? String(sceneCount) : "", suffix: "+", label: "真实场景，持续更新" },
    { value: collectionCount != null ? String(collectionCount) : "", suffix: "", label: "主题合集，从看牙到安家" },
    { value: "3", suffix: " 步", label: "看视频 · 学对话 · 开口练" },
  ];
  return (
    <div className="bg-background pt-9 md:pt-11">
      <section className="mx-auto max-w-[1180px] px-3 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.25fr_.55fr] md:gap-20">
          <div>
            <p className="editorial-kicker">About · 关于我们</p>
            <h1 className="mt-4 font-sans text-[32px] font-bold leading-[1.2] tracking-[-0.01em] text-primary md:text-[44px]">
              专为哑巴英语学习者而生
            </h1>
            <p className="about-hero-subtitle mt-4 max-w-[640px] font-sans text-[18px] font-semibold leading-relaxed text-primary md:text-[20px]">
              自信地开口讲英语，蜕去应试英语留下的外壳。
            </p>
            <p className="mt-3 max-w-[640px] text-base leading-relaxed text-secondary-foreground">
              看牙、开家长会、跟邻居聊天，这些事看着平常，换成英语却不一定知道怎么说。这里每集讲一个具体场景，你可以先看一遍，再跟着练，把可能用到的话提前说熟。
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

      <section className="mx-auto mt-14 max-w-[1180px] px-3 md:mt-16 md:px-8">
        <div className="border-t border-[#DCD4BE] pt-12 md:pt-14">
          <div className="max-w-[720px]">
            <PageHeading as="h2" subtitle="WHY">为什么做</PageHeading>
            <p className="mt-4 text-base leading-relaxed text-secondary-foreground">
              我自己也经历过“学了很多年英语，开口还是卡住”的时候。到了加拿大，看牙要怎么描述疼痛，家长会该问老师什么，碰到邻居又该聊什么，常常是事情到了眼前，才发现自己没准备好。
            </p>
            <p className="mt-4 text-base leading-relaxed text-secondary-foreground">
              后来我发现，提前听过类似的对话、知道对方可能会问什么，再把自己的回答练几遍，开口时会踏实很多。我做这个网站，就是想把这些生活里的对话整理出来，也给有同样困扰的人用。
            </p>
            <p className="mt-8 border-l-4 border-accent py-0.5 pl-5 font-zh-serif text-[21px] font-bold text-primary md:mt-11 md:text-[25px]">
              先把要说的话练一练，再去面对生活里的那一刻。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-3 pb-[72px] md:px-8">
        <div className="mt-14 border-t border-[#DCD4BE] pt-12 md:mt-16 md:pt-14">
        <PageHeading as="h2" subtitle="HOW IT WORKS">学习方法</PageHeading>
        <div className="mt-4 grid gap-5 xl:grid-cols-3">
          {METHOD_STEPS.map((step) => (
            <article key={step.num} className="about-method-card rounded-[22px] bg-white p-6 shadow-[0_1px_2px_rgba(18,51,37,.03),0_10px_30px_rgba(18,51,37,.08)] md:p-[26px]">
              <span className="font-sans grid h-[46px] w-[46px] place-items-center rounded-full bg-primary text-base font-bold text-white">
                {step.num}
              </span>
              <h3 className="mt-[18px] font-sans text-[19px] font-bold text-foreground">
                {step.title}
                <span className="mt-1 block font-sans text-[13.5px] font-medium text-muted-foreground">{step.en}</span>
              </h3>
              <p className="about-method-description mt-2 font-sans leading-relaxed text-secondary-foreground">{step.desc}</p>
            </article>
          ))}
        </div>
        </div>
      </section>

      <section className="about-audience bg-primary py-[46px] md:py-[60px]">
        <div className="mx-auto max-w-[1180px] px-3 md:px-8">
          <PageHeading as="h2" subtitle="WHO IT'S FOR">想在生活里用上英语，可以从这里开始</PageHeading>
          <p className="mt-4 text-[15.5px] leading-relaxed text-white/[0.78]">
            无论你准备出国，还是已经在海外生活，都可以挑一个眼下用得上的场景，先练起来。
          </p>
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
