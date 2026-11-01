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
  const catalogueTags = [{ id: "All", label: "全部" }, ...COLLECTION_TAGS];
  const query = searchQuery.trim().toLowerCase();
  const filteredCollections = collections.filter(collection => {
    const matchesTag = activeCategory === "All" || collection.tagId === activeCategory;
    const matchesQuery = !query || [collection.name, collection.titleEn, collection.tagline]
      .some(value => value.toLowerCase().includes(query))
      || collection.scenes.some(scene => [scene.titleEn, scene.titleZh, scene.desc]
        .some(value => value.toLowerCase().includes(query)));
    return matchesTag && matchesQuery;
  });
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

  return (
    <div className="pb-10">
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 shadow-[0_8px_24px_rgba(18,36,28,.05)] backdrop-blur-md">
        <div className="mx-auto max-w-[1180px] px-4 py-3 md:px-8">
          <form className="flex w-full items-center gap-3 rounded-full border border-border bg-card py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-primary/50 md:pl-5" onSubmit={event => event.preventDefault()}>
            <Search size={18} className="flex-shrink-0 text-muted-foreground" />
            <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)}
              placeholder="搜索场景或合集：牙医、退货、点餐…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground md:text-[15px]" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="清除搜索" className="text-muted-foreground hover:text-foreground"><X size={14} /></button>}
            <button type="submit" className="flex-shrink-0 rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-accent-foreground transition-[filter] hover:brightness-95 md:px-5">搜索</button>
          </form>
          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {catalogueTags.map(tag => (
            <button
              key={tag.id}
              type="button"
              aria-pressed={activeCategory === tag.id}
              onClick={() => setActiveCategory(tag.id)}
              className="flex-none whitespace-nowrap rounded-full border px-4 py-2 text-[13px] leading-none transition-colors"
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

      <section className="border-b border-primary/10 bg-[#EEF1E8]">
        <div className="mx-auto max-w-[1180px] px-4 py-4 md:px-8">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-['Noto_Serif_SC'] text-[20px] font-bold text-primary">免费体验</h2>
            <p className="text-[12px] text-muted-foreground">先免费学完一整集，体验完整的学习方式</p>
          </div>
          <div className="mt-3">
            {freeLoading ? <LoadingState label="Loading free experience…" /> : freeError ? <ErrorState message={freeError} /> : (
              <div className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
                {(freeData ?? []).map(({ scene, collectionLabel }) => <FreeExperienceCard compact key={scene.externalId ?? scene.id} scene={scene} collectionLabel={collectionLabel} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-4 py-5 md:px-6">
        <h2 className="mb-3 font-['Noto_Serif_SC'] text-[20px] font-bold text-primary">合集</h2>
        {loading ? <LoadingState label="Loading collections…" /> : error ? <ErrorState message={error} /> : filteredCollections.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCollections.map(collection => <CollectionCard compact key={collection.id} collection={collection} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">没有找到匹配的合集，换个关键词或标签试试。</div>
        )}
      </section>

      <section className="mx-auto max-w-[1180px] px-4 py-5 md:px-8">
        <h2 className="mb-3 font-['Noto_Serif_SC'] text-[20px] font-bold text-primary">全部场景</h2>
        {loading ? <LoadingState label="Loading scenes…" /> : error ? <ErrorState message={error} /> : filteredScenes.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredScenes.map(scene => <SceneCard compact key={scene.externalId ?? scene.id} scene={scene} collectionLabels={scene.collectionId ? [collectionNames.get(scene.collectionId) ?? ""] : []} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">没有找到匹配的场景，换个关键词或标签试试。</div>
        )}
      </section>
    </div>
  );
}
