import { ArrowLeft, ArrowRight, FileText, LockKeyhole } from "lucide-react";
import { Link, useParams } from "react-router";
import { LoadingState, ErrorState } from "@/app/components/DataState";
import { useCollections } from "@/data/collections-access";
import { getCollectionLearningProgress, getSceneProgressId, useAllLearningProgress } from "@/data/learning-progress";
import { useMembershipAccess } from "@/data/membership";
import { responsiveImageProps } from "@/data/responsive-image";

export function CollectionPage() {
  const { collectionId = "" } = useParams();
  const { data, loading, error } = useCollections();
  const progressByScene = useAllLearningProgress();
  const { isUnlocked } = useMembershipAccess();
  if (loading) return <div className="mx-auto max-w-[1180px] px-5 py-16 md:px-8"><LoadingState label="Loading collection…" /></div>;
  if (error) return <div className="mx-auto max-w-[1180px] px-5 py-16 md:px-8"><ErrorState message={error} /></div>;

  const collections = data ?? [];
  const collection = collections.find(item => item.id === collectionId);
  if (!collection) return <div className="mx-auto max-w-[1180px] px-5 py-20 text-center md:px-8"><h1 className="text-3xl font-bold">没有找到这个合集</h1><Link to="/explore" className="mt-5 inline-block underline">返回场景库</Link></div>;

  const liveScenes = collection.scenes.filter(scene => scene.status === "live");
  const liveCount = liveScenes.length;
  const learningProgress = getCollectionLearningProgress(liveScenes, progressByScene);
  const nextCollection = collections.find(item => item.shelfOrder > collection.shelfOrder);

  return (
    <div>
      <header className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-[1180px] px-5 py-5 md:px-8">
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <Link to="/explore" className="inline-flex items-center gap-2 font-semibold text-muted-foreground hover:text-primary"><ArrowLeft size={16} /> 返回场景库</Link>
            <p className="font-semibold text-foreground">
              {learningProgress.hasAnyProgress
                ? `已学完 ${learningProgress.completedCount} / ${learningProgress.totalCount} 集`
                : `共 ${collection.scenes.length} 集 · 已上线 ${liveCount} 集`}
            </p>
          </div>
          <h1 className="flex flex-wrap items-baseline gap-x-3 font-zh-serif text-[30px] font-bold leading-[1.15] text-primary md:text-[38px]">
            {collection.name}<span className="display-serif text-[18px] font-medium italic text-muted-foreground md:text-[20px]">{collection.titleEn}</span>
          </h1>
          <p className="mt-1.5 max-w-[760px] text-[15px] leading-relaxed text-secondary-foreground md:text-base">{collection.tagline}</p>
          {learningProgress.hasAnyProgress && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[12px] font-bold text-secondary-foreground">
                <span>{learningProgress.isComplete ? "✓ 整套已学完" : `已学完 ${learningProgress.completedCount} / ${learningProgress.totalCount} 集`}</span>
                <span>{learningProgress.percent}%</span>
              </div>
              <div role="progressbar" aria-label={`${collection.name}合集进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={learningProgress.percent} className="h-1.5 overflow-hidden rounded-full bg-primary/10">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${learningProgress.percent}%` }} />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 py-6 md:px-8 md:py-7">
        <div className="overflow-hidden rounded-[24px] border border-border bg-card">
          {collection.scenes.length ? collection.scenes.map((scene, index) => {
            const isLive = scene.status === "live";
            const sceneProgress = progressByScene[getSceneProgressId(scene)];
            const sceneHasProgress = Boolean(sceneProgress && sceneProgress.percent > 0);
            const sceneIsLocked = isLive && !scene.isFreeExperience && !isUnlocked;
            const number = String(scene.collectionOrder ?? index + 1).padStart(2, "0");
            const row = (
              <div className={`grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-[13px] gap-y-1 px-[14px] py-[11px] md:grid-cols-[40px_160px_minmax(0,1fr)_auto] md:gap-x-[18px] md:px-5 md:py-[13px] ${isLive ? "transition-colors hover:bg-secondary/60" : "bg-secondary/55 text-muted-foreground grayscale"}`}>
                <span className="hidden justify-self-center display-serif text-[24px] font-bold italic text-primary/70 md:block">{number}</span>
                <div className="relative aspect-video w-[112px] overflow-hidden rounded-[8px] bg-[#E9E4DA] md:w-[160px] md:rounded-[10px]">
                  {scene.photo ? <img {...responsiveImageProps(scene.photo, "(max-width: 767px) 112px, 160px")} alt="" className={`h-full w-full object-cover ${sceneIsLocked ? "saturate-[.72]" : ""}`} loading="lazy" decoding="async" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_70%_30%,rgba(200,241,105,.3),transparent_26%),linear-gradient(145deg,#315848,#0f3527)]" />}
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-[#0F3527]/90 px-[7px] py-[2px] display-serif text-[11px] font-bold italic leading-none text-[#EAF4D3] md:hidden">{number}</span>
                  {(scene.isFreeExperience || sceneIsLocked) && (
                    <span className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold md:left-2 md:right-auto ${scene.isFreeExperience ? "bg-accent text-primary" : "bg-primary/90 text-white"}`}>
                      {sceneIsLocked && <LockKeyhole size={10} />}{scene.isFreeExperience ? "免费体验" : "会员专属"}
                    </span>
                  )}
                  {sceneHasProgress && (
                    <span role="progressbar" aria-label={`${scene.titleZh}学习进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={sceneProgress.percent} className="absolute inset-x-0 bottom-0 h-1 bg-white/35">
                      <span className="block h-full bg-accent" style={{ width: `${sceneProgress.percent}%` }} />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-sans text-[15px] font-bold leading-tight text-primary md:text-[17px]">{scene.titleZh}<span className="mt-0.5 block truncate font-sans text-[11px] font-normal italic text-muted-foreground md:ml-[9px] md:mt-0 md:inline md:text-[12.5px]">{scene.titleEn}</span></h2>
                  <p className="mt-1 hidden line-clamp-2 text-[13px] leading-relaxed text-secondary-foreground md:block">{scene.desc}</p>
                </div>
                <div className="col-start-2 flex items-center gap-1.5 text-[12px] font-semibold md:col-start-auto md:gap-2 md:text-sm md:justify-end">
                  {isLive ? <><FileText size={16} /><span>讲义 PDF</span><ArrowRight size={16} className="hidden md:block" /></> : <><LockKeyhole size={15} /><span>制作中</span></>}
                </div>
              </div>
            );
            return isLive
              ? <Link key={scene.externalId ?? scene.id} to={`/scenes/${scene.slug}`} className="block border-b border-border last:border-b-0">{row}</Link>
              : <div key={scene.externalId ?? scene.id} className="border-b border-border last:border-b-0" aria-disabled="true">{row}</div>;
          }) : (
            <div className="px-6 py-20 text-center text-muted-foreground"><p className="font-zh-serif text-xl font-bold text-primary">本合集正在建设中</p><p className="mt-2 text-sm">内容上线后会按学习顺序显示在这里。</p></div>
          )}
        </div>

        <div className="mt-10 rounded-[20px] border border-primary/15 bg-secondary p-6 md:flex md:items-center md:justify-between md:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Next collection</p>
            <p className="mt-2 font-zh-serif text-xl font-bold text-primary">学完这个合集，接着学 →</p>
          </div>
          {nextCollection ? <Link to={`/collections/${nextCollection.id}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white md:mt-0">{nextCollection.id} · {nextCollection.name}<ArrowRight size={16} /></Link> : <Link to="/explore" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white md:mt-0">返回场景库<ArrowRight size={16} /></Link>}
        </div>
      </main>
    </div>
  );
}
