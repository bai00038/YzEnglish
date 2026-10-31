import { Search, X } from "lucide-react";
import { CollectionCard } from "@/app/components/CollectionCard";
import { FreeExperienceCard } from "@/app/components/FreeExperienceCard";
import { SceneCard } from "@/app/components/SceneCard";
import { LoadingState, ErrorState } from "@/app/components/DataState";
import { useCollections, useFreeTrialScenes } from "@/data/collections-access";
import { COLLECTION_TAGS } from "@/data/content-collections";

export function ExplorePage({
  activeCategory, setActiveCategory,
  searchQuery, setSearchQuery,
}: {
  activeCategory: string; setActiveCategory: (c: string) => void;
  searchQuery: string; setSearchQuery: (q: string) => void;
}) {
  const { data: collectionsData, loading, error } = useCollections();
  const { data: freeData, loading: freeLoading, error: freeError } = useFreeTrialScenes();
  const collections = collectionsData ?? [];
  const collectionNames = new Map(collections.map(collection => [collection.id, collection.name]));
  const allLiveScenes = collections
    .flatMap(collection => collection.scenes)
    .filter(scene => scene.status === "live");
  const query = searchQuery.trim().toLowerCase();
  const filteredScenes = allLiveScenes.filter(scene => {
    const matchesTag = activeCategory === "All" || (scene.tags ?? []).includes(activeCategory);
    const matchesQuery = !query || [scene.titleEn, scene.titleZh, scene.desc]
      .some(value => value.toLowerCase().includes(query));
    return matchesTag && matchesQuery;
  });

  const clearFilters = () => {
    setActiveCategory("All");
    setSearchQuery("");
  };

  return (
    <div>
      <header className="mx-auto max-w-[1180px] px-5 pb-8 pt-8 md:px-8 md:pb-9 md:pt-10">
        <p className="editorial-kicker mb-2.5">Scene library · 场景库</p>
        <h1 className="display-serif mb-3 text-[36px] font-semibold leading-[1.04] tracking-[-0.01em] text-primary md:text-[48px]">
          Choose a collection,<br /><em className="font-normal">then enter the scene.</em>
        </h1>
        <p className="mb-5 text-[14px] text-foreground md:text-[15px]">按真实生活任务学习，而不是零散背句子。</p>
        <form className="flex max-w-[680px] items-center gap-3 rounded-full border border-border bg-card py-2 pl-5 pr-2 shadow-[0_10px_30px_rgba(18,36,28,0.06)] transition-colors focus-within:border-primary/50 md:pl-6" onSubmit={event => event.preventDefault()}>
          <Search size={19} className="flex-shrink-0 text-muted-foreground" />
          <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)}
            placeholder="搜索场景：牙医、退货、酒店…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground md:text-base" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="清除搜索" className="text-muted-foreground hover:text-foreground"><X size={14} /></button>}
          <button type="submit" className="flex-shrink-0 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition-[filter] hover:brightness-95 md:px-6">搜索</button>
        </form>
      </header>

      <section className="border-y border-primary/10 bg-[#EEF1E8]">
        <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-12">
          <p className="editorial-kicker">Free experience</p>
          <h2 className="mt-2 font-['Noto_Serif_SC'] text-[30px] font-bold text-primary">免费体验</h2>
          <p className="mt-2 text-sm text-muted-foreground">先免费学完一整集，体验完整的学习方式</p>
          <div className="mt-7">
            {freeLoading ? <LoadingState label="Loading free experience…" /> : freeError ? <ErrorState message={freeError} /> : (
              <div className="grid gap-5 md:grid-cols-3">
                {(freeData ?? []).map(({ scene, collectionLabel }) => <FreeExperienceCard key={scene.externalId ?? scene.id} scene={scene} collectionLabel={collectionLabel} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
        <div className="mb-7">
          <p className="editorial-kicker">Collections · 合集货架</p>
          <h2 className="mt-2 font-['Noto_Serif_SC'] text-[30px] font-bold text-primary md:text-[36px]">按一条完整内容线来学</h2>
        </div>
        {loading ? <LoadingState label="Loading collections…" /> : error ? <ErrorState message={error} /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map(collection => <CollectionCard key={collection.id} collection={collection} />)}
          </div>
        )}
      </section>

      <section className="border-t border-border bg-secondary">
        <div className="mx-auto max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
          <div className="mb-7">
            <p className="editorial-kicker">All scenes</p>
            <h2 className="mt-2 font-['Noto_Serif_SC'] text-[30px] font-bold text-primary md:text-[36px]">全部场景 · 快速查找</h2>
          </div>
          <div className="mb-8 flex flex-wrap items-center gap-2.5 border-y border-border py-4">
            <p className="mr-1 text-[12px] font-medium tracking-[0.18em] text-muted-foreground">筛选场景</p>
            {[{ id: "All", label: "全部" }, ...COLLECTION_TAGS].map(tag => (
              <button key={tag.id} onClick={() => setActiveCategory(tag.id)}
                className="whitespace-nowrap rounded-full border-[1.5px] px-5 py-2 text-sm leading-none transition-all duration-150"
                style={activeCategory === tag.id
                  ? { backgroundColor: "#C8F169", color: "#12241C", borderColor: "#C8F169", fontWeight: 700 }
                  : { backgroundColor: "transparent", color: "#3A4A42", borderColor: "rgba(18,36,28,0.22)" }}>
                {tag.label}
              </button>
            ))}
          </div>
          <div className="mb-6 flex items-baseline gap-4">
            <p className="text-[15px] text-foreground">共 <b className="display-serif mx-0.5 text-[22px] text-primary">{filteredScenes.length}</b> 个场景</p>
            {(activeCategory !== "All" || searchQuery) && <button onClick={clearFilters} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary">清除筛选</button>}
          </div>
          {filteredScenes.length ? (
            <div className="grid grid-cols-1 gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
              {filteredScenes.map(scene => <SceneCard key={scene.externalId ?? scene.id} scene={scene} collectionLabels={scene.collectionId ? [collectionNames.get(scene.collectionId) ?? ""] : []} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
              <Search size={28} className="mx-auto mb-3 opacity-30" />
              <p className="font-['Noto_Serif_SC'] text-[20px] font-bold text-foreground">没有找到匹配的场景</p>
              <p className="mt-1 text-sm">换个关键词或清除筛选试试。</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
