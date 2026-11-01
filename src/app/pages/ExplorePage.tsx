import { useEffect } from "react";
import { Search, X } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { SceneCard } from "@/app/components/SceneCard";
import { LoadingState, ErrorState } from "@/app/components/DataState";
import { useCollections } from "@/data/collections-access";
import { COLLECTION_TAGS } from "@/data/content-collections";
import { getCollectionLearningProgress, getSceneProgressId, useAllLearningProgress } from "@/data/learning-progress";

const CATALOGUE_TAGS = [{ id: "All", label: "全部" }, ...COLLECTION_TAGS];

export function ExplorePage({
  activeCategory, setActiveCategory,
  searchQuery, setSearchQuery,
}: {
  activeCategory: string; setActiveCategory: (c: string) => void;
  searchQuery: string; setSearchQuery: (q: string) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: collectionsData, loading, error } = useCollections();
  const collections = collectionsData ?? [];
  const progressByScene = useAllLearningProgress();
  const requestedTag = searchParams.get("tag");

  useEffect(() => {
    if (requestedTag && CATALOGUE_TAGS.some(tag => tag.id === requestedTag)) {
      setActiveCategory(requestedTag);
      setSearchQuery("");
    }
  }, [requestedTag, setActiveCategory, setSearchQuery]);
  const query = searchQuery.trim().toLowerCase();
  const hasActiveFilter = activeCategory !== "All" || Boolean(query);
  const collectionNames = new Map(collections.map(collection => [collection.id, collection.name]));
  const filteredScenes = collections
    .flatMap(collection => collection.scenes)
    .filter(scene => scene.status === "live")
    .filter(scene => {
      const matchesTag = activeCategory === "All" || (scene.tags ?? []).includes(activeCategory);
      const matchesQuery = !query || [scene.titleEn, scene.titleZh, scene.desc]
        .some(value => value.toLowerCase().includes(query));
      return matchesTag && matchesQuery;
    });
  const continueScenes = collections
    .flatMap(collection => collection.scenes)
    .filter(scene => scene.status === "live")
    .filter(scene => {
      const percent = progressByScene[getSceneProgressId(scene)]?.percent ?? 0;
      return percent > 0 && percent < 100;
    })
    .sort((a, b) => {
      const aUpdated = progressByScene[getSceneProgressId(a)]?.updatedAt ?? "";
      const bUpdated = progressByScene[getSceneProgressId(b)]?.updatedAt ?? "";
      return bUpdated.localeCompare(aUpdated);
    });

  return (
    <div className="pb-10">
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 shadow-[0_8px_24px_rgba(18,36,28,.05)] backdrop-blur-md">
        <div className="mx-auto max-w-[1180px] px-4 py-2 md:px-8">
          <form className="flex w-full items-center gap-3 rounded-full border border-border bg-card py-1 pl-4 pr-1 transition-colors focus-within:border-primary/50 md:pl-5" onSubmit={event => event.preventDefault()}>
            <Search size={18} className="flex-shrink-0 text-muted-foreground" />
            <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)}
              placeholder="搜索场景或合集：牙医、退货、点餐…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground md:text-[15px]" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="清除搜索" className="text-muted-foreground hover:text-foreground"><X size={14} /></button>}
            <button type="submit" className="flex-shrink-0 rounded-full bg-accent px-4 py-1.5 text-[13px] font-bold text-accent-foreground transition-[filter] hover:brightness-95 md:px-5">搜索</button>
          </form>
          <div className="mt-2 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATALOGUE_TAGS.map(tag => (
            <button
              key={tag.id}
              type="button"
              aria-pressed={activeCategory === tag.id}
              onClick={() => {
                setActiveCategory(tag.id);
                setSearchParams(tag.id === "All" ? {} : { tag: tag.id }, { replace: true });
                if (tag.id === "All") setSearchQuery("");
              }}
              className="flex-none whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] leading-none transition-colors"
              style={activeCategory === tag.id
                ? { backgroundColor: "#C8F169", color: "#12241C", borderColor: "#C8F169", fontWeight: 700 }
                : { backgroundColor: "rgba(255,255,255,.55)", color: "#3A4A42", borderColor: "rgba(18,36,28,.16)" }}
            >
              {tag.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1180px] px-4 py-2 md:px-8 md:py-2">
        {loading ? <LoadingState label="Loading scene library…" /> : error ? <ErrorState message={error} /> : hasActiveFilter ? (
          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h1 className="font-['Noto_Serif_SC'] text-[22px] font-bold text-primary">搜索结果</h1>
              <p className="text-[13px] font-semibold text-muted-foreground">共 {filteredScenes.length} 个场景</p>
            </div>
            {filteredScenes.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {filteredScenes.map(scene => <SceneCard compact key={scene.externalId ?? scene.id} scene={scene} collectionLabels={scene.collectionId ? [collectionNames.get(scene.collectionId) ?? ""] : []} />)}
              </div>
            ) : <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">没有找到匹配的场景，换个关键词或标签试试。</div>}
          </section>
        ) : (
          <div className="space-y-4">
            {continueScenes.length > 0 && (
              <section aria-labelledby="continue-learning-heading">
                <div className="mb-2 flex items-end justify-between gap-4 border-b border-border pb-2">
                  <div className="min-w-0 md:flex md:items-baseline md:gap-3">
                    <h2 id="continue-learning-heading" className="shrink-0 font-['Noto_Serif_SC'] text-[22px] font-bold leading-tight text-primary">继续学习</h2>
                    <p className="mt-1 truncate text-[12px] text-muted-foreground md:mt-0">从上次停下的地方接着学</p>
                    <span className="mt-1 block shrink-0 text-[12px] font-semibold text-secondary-foreground md:mt-0">共 {continueScenes.length} 集</span>
                  </div>
                </div>
                <div className="flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
                  {continueScenes.map(scene => (
                    <div key={scene.externalId ?? scene.id} className="flex w-[78vw] flex-none snap-start">
                      <SceneCard compact resume scene={scene} collectionLabels={scene.collectionId ? [collectionNames.get(scene.collectionId) ?? ""] : []} />
                    </div>
                  ))}
                </div>
                <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
                  {continueScenes.map(scene => <SceneCard compact resume key={scene.externalId ?? scene.id} scene={scene} collectionLabels={scene.collectionId ? [collectionNames.get(scene.collectionId) ?? ""] : []} />)}
                </div>
              </section>
            )}
            {collections.map(collection => {
              const liveScenes = collection.scenes.filter(scene => scene.status === "live");
              if (liveScenes.length === 0) {
                return (
                  <div key={collection.id} className="flex h-10 items-center justify-between rounded-[14px] border border-border bg-secondary/55 px-4 text-muted-foreground">
                    <span className="font-['Noto_Serif_SC'] text-[17px] font-bold">{collection.name}</span>
                    <span className="text-[12px] font-semibold">建设中</span>
                  </div>
                );
              }
              const collectionProgress = getCollectionLearningProgress(liveScenes, progressByScene);
              return (
                <section key={collection.id} aria-labelledby={`collection-${collection.id}`}>
                  <div className="mb-2 flex items-end justify-between gap-4 border-b border-border pb-2">
                    <div className="min-w-0 md:flex md:items-baseline md:gap-3">
                      <h2 id={`collection-${collection.id}`} className="shrink-0 font-['Noto_Serif_SC'] text-[22px] font-bold leading-tight text-primary">{collection.name}</h2>
                      <p className="mt-1 truncate text-[12px] text-muted-foreground md:mt-0">{collection.tagline}</p>
                      <span className="mt-1 block shrink-0 text-[12px] font-semibold text-secondary-foreground md:mt-0">
                        {collectionProgress.isComplete
                          ? `共 ${collectionProgress.totalCount} 集 · ✓ 整套已学完`
                          : collectionProgress.hasAnyProgress
                            ? `共 ${collectionProgress.totalCount} 集 · 已学完 ${collectionProgress.completedCount} 集`
                            : `共 ${collectionProgress.totalCount} 集`}
                      </span>
                    </div>
                    <Link to={`/collections/${collection.id}`} className="shrink-0 text-[13px] font-bold text-primary hover:underline">查看全部 →</Link>
                  </div>
                  {collectionProgress.hasAnyProgress && (
                    <div role="progressbar" aria-label={`${collection.name}合集进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={collectionProgress.percent} className="mb-2 h-[3px] overflow-hidden rounded-full bg-primary/10">
                      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${collectionProgress.percent}%` }} />
                    </div>
                  )}
                  <div className="flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
                    {liveScenes.slice(0, 10).map(scene => (
                      <div key={scene.externalId ?? scene.id} className="flex w-[78vw] flex-none snap-start">
                        <SceneCard compact scene={scene} collectionLabels={[collection.name]} />
                      </div>
                    ))}
                    <Link
                      to={`/collections/${collection.id}`}
                      className="flex w-[78vw] flex-none snap-start items-center justify-center rounded-[16px] border border-border bg-transparent text-[14px] font-bold text-primary transition-colors hover:border-primary/30"
                    >
                      查看全部 →
                    </Link>
                  </div>
                  <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
                    {liveScenes.slice(0, 8).map(scene => <SceneCard compact key={scene.externalId ?? scene.id} scene={scene} collectionLabels={[collection.name]} />)}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
