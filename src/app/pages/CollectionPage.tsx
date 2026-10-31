import { ArrowLeft, ArrowRight, FileText, LockKeyhole } from "lucide-react";
import { Link, useParams } from "react-router";
import { LoadingState, ErrorState } from "@/app/components/DataState";
import { useCollections } from "@/data/collections-access";

export function CollectionPage() {
  const { collectionId = "" } = useParams();
  const { data, loading, error } = useCollections();
  if (loading) return <div className="mx-auto max-w-[1180px] px-5 py-16 md:px-8"><LoadingState label="Loading collection…" /></div>;
  if (error) return <div className="mx-auto max-w-[1180px] px-5 py-16 md:px-8"><ErrorState message={error} /></div>;

  const collections = data ?? [];
  const collection = collections.find(item => item.id === collectionId);
  if (!collection) return <div className="mx-auto max-w-[1180px] px-5 py-20 text-center md:px-8"><h1 className="text-3xl font-bold">没有找到这个合集</h1><Link to="/explore" className="mt-5 inline-block underline">返回场景库</Link></div>;

  const liveCount = collection.scenes.filter(scene => scene.status === "live").length;
  const nextCollection = collections.find(item => item.shelfOrder > collection.shelfOrder);

  return (
    <div>
      <header className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-[1180px] px-5 py-5 md:px-8">
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <Link to="/explore" className="inline-flex items-center gap-2 font-semibold text-muted-foreground hover:text-primary"><ArrowLeft size={16} /> 返回场景库</Link>
            <p className="font-semibold text-foreground">共 {collection.scenes.length} 集 · 已上线 {liveCount} 集</p>
          </div>
          <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-0 font-['Noto_Serif_SC'] text-[40px] font-bold leading-[1.15] text-primary md:text-[44px]">
            {collection.name}
            <span className="display-serif text-[17px] font-normal italic text-muted-foreground md:text-[19px]">{collection.titleEn}</span>
          </h1>
          <p className="mt-1.5 max-w-[760px] text-[15px] leading-relaxed text-secondary-foreground md:text-base">{collection.tagline}</p>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 py-6 md:px-8 md:py-7">
        <div className="overflow-hidden rounded-[24px] border border-border bg-card">
          {collection.scenes.length ? collection.scenes.map((scene, index) => {
            const isLive = scene.status === "live";
            const number = String(scene.collectionOrder ?? index + 1).padStart(2, "0");
            const row = (
              <div className={`grid gap-4 p-4 md:min-h-[120px] md:grid-cols-[48px_200px_minmax(0,1fr)_auto] md:items-center md:p-3 ${isLive ? "transition-colors hover:bg-secondary/60" : "bg-secondary/55 text-muted-foreground grayscale"}`}>
                <span className="display-serif text-[27px] italic text-primary/60">{number}</span>
                <div className="aspect-[16/9] overflow-hidden rounded-[12px] bg-primary/90 md:h-24 md:w-[200px] md:aspect-auto">
                  {scene.photo ? <img src={scene.photo} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_70%_30%,rgba(200,241,105,.3),transparent_26%),linear-gradient(145deg,#315848,#0f3527)]" />}
                </div>
                <div>
                  <h2 className="display-serif text-[19px] font-semibold leading-tight text-primary md:text-[20px]">{scene.titleEn}</h2>
                  <p className="mt-0.5 font-['Noto_Serif_SC'] text-[13px] text-muted-foreground">{scene.titleZh}</p>
                  <p className="mt-1 line-clamp-1 text-[13px] leading-relaxed text-secondary-foreground">{scene.desc}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold md:justify-end">
                  {isLive ? <><FileText size={17} /><span>讲义 PDF</span><ArrowRight size={16} /></> : <><LockKeyhole size={16} /><span>制作中</span></>}
                </div>
              </div>
            );
            return isLive
              ? <Link key={scene.externalId ?? scene.id} to={`/scenes/${scene.slug}`} className="block border-b border-border last:border-b-0">{row}</Link>
              : <div key={scene.externalId ?? scene.id} className="border-b border-border last:border-b-0" aria-disabled="true">{row}</div>;
          }) : (
            <div className="px-6 py-20 text-center text-muted-foreground"><p className="font-['Noto_Serif_SC'] text-xl font-bold text-primary">本合集正在建设中</p><p className="mt-2 text-sm">内容上线后会按学习顺序显示在这里。</p></div>
          )}
        </div>

        <div className="mt-10 rounded-[20px] border border-primary/15 bg-secondary p-6 md:flex md:items-center md:justify-between md:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Next collection</p>
            <p className="mt-2 font-['Noto_Serif_SC'] text-xl font-bold text-primary">学完这个合集，接着学 →</p>
          </div>
          {nextCollection ? <Link to={`/collections/${nextCollection.id}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white md:mt-0">{nextCollection.id} · {nextCollection.name}<ArrowRight size={16} /></Link> : <Link to="/explore" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white md:mt-0">返回场景库<ArrowRight size={16} /></Link>}
        </div>
      </main>
    </div>
  );
}
