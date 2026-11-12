import { useEffect, useRef, useState, type ComponentType } from "react";
import { Search, X, Stethoscope, Backpack, Baby, MessagesSquare, Sun, UtensilsCrossed, ShoppingBag, KeyRound, Plane, Briefcase } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { SceneCard } from "@/app/components/SceneCard";
import { LoadingState, ErrorState } from "@/app/components/DataState";
import { useCollections } from "@/data/collections-access";
import { COLLECTION_TAGS } from "@/data/content-collections";
import type { CollectionWithScenes } from "@/data/collections-access";

const CATALOGUE_TAGS = [{ id: "All", label: "全部" }, ...COLLECTION_TAGS];

type IconComponent = ComponentType<{ size?: number | string; className?: string; strokeWidth?: number | string }>;

function ToothIcon({ size = 24, className, strokeWidth = 1.5 }: { size?: number | string; className?: string; strokeWidth?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 5.8C10.9 4.9 9.4 4.4 8 4.7 5.9 5.1 4.8 6.7 5.1 8.7c.2 1.4.9 2.5 1.2 4 .3 1.6.5 3.2.9 4.8.2.8 1.3.9 1.7.1.4-.7.6-2.1 1-3.1.3-.8 1-1.4 2.1-1.4s1.8.6 2.1 1.4c.4 1 .6 2.4 1 3.1.4.8 1.5.7 1.7-.1.4-1.6.6-3.2.9-4.8.3-1.5 1-2.6 1.2-4 .3-2-.8-3.6-2.9-4-1.4-.3-2.9.2-4 1.1Z" />
    </svg>
  );
}

const COLLECTION_ICONS: Record<string, IconComponent> = {
  C1: ToothIcon,
  C2: Stethoscope,
  C4: Backpack,
  C6: Baby,
  C5: MessagesSquare,
  C12: Sun,
  C7: UtensilsCrossed,
  C8: ShoppingBag,
  C9: KeyRound,
  C10: Plane,
  C11: Briefcase,
};

function CollectionIcon({ id, size = 18, className, strokeWidth = 1.5 }: { id: string; size?: number; className?: string; strokeWidth?: number }) {
  const Icon = COLLECTION_ICONS[id] ?? MessagesSquare;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} />;
}

function CollectionSection({ collection, eager = false }: { collection: CollectionWithScenes; eager?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(eager);
  const liveScenes = collection.scenes.filter(scene => scene.status === "live");

  useEffect(() => {
    if (isNearViewport || !sectionRef.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setIsNearViewport(true);
      observer.disconnect();
    }, { rootMargin: "1000px 0px" });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [isNearViewport]);

  if (liveScenes.length === 0) {
    return (
      <div className="flex h-10 items-center justify-between rounded-[14px] border border-border bg-secondary/55 px-4 text-muted-foreground">
        <span className="font-zh-serif text-[17px] font-bold">{collection.name}</span>
        <span className="text-[12px] font-semibold">建设中</span>
      </div>
    );
  }

  return (
    <section ref={sectionRef} id={`shelf-${collection.id}`} className="scroll-mt-[132px]" aria-labelledby={`collection-${collection.id}`}>
      <div className="mb-3 flex items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <CollectionIcon id={collection.id} size={27} className="shrink-0 text-primary" />
          <div className="min-w-0 md:flex md:items-baseline md:gap-3">
          <h2 id={`collection-${collection.id}`} className="shrink-0 font-zh-serif text-[24px] font-bold leading-tight text-primary">{collection.name}</h2>
          <p className="mt-1 truncate text-[12px] text-muted-foreground md:mt-0">{collection.tagline}</p>
          <span className="mt-1 block shrink-0 text-[12px] font-semibold text-secondary-foreground md:mt-0">共 {liveScenes.length} 集</span>
          </div>
        </div>
        <Link to={`/collections/${collection.id}`} className="shrink-0 text-[13px] font-bold text-primary hover:underline">查看全部 →</Link>
      </div>
      {isNearViewport ? <>
        <div className="flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
          {liveScenes.slice(0, 4).map(scene => (
            <div key={scene.externalId ?? scene.id} className="flex w-[78vw] flex-none snap-start">
              <SceneCard compact showProgress={false} scene={scene} collectionLabels={[collection.name]} />
            </div>
          ))}
        </div>
        <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
          {liveScenes.slice(0, 4).map(scene => <SceneCard compact showProgress={false} key={scene.externalId ?? scene.id} scene={scene} collectionLabels={[collection.name]} />)}
        </div>
      </> : <div aria-hidden="true" className="h-[310px] animate-pulse rounded-[16px] bg-secondary/45 md:h-[280px]" />}
    </section>
  );
}

export function ExplorePage({
  activeCategory, setActiveCategory,
  searchQuery, setSearchQuery,
}: {
  activeCategory: string; setActiveCategory: (c: string) => void;
  searchQuery: string; setSearchQuery: (q: string) => void;
}) {
  const [searchParams] = useSearchParams();
  const { data: collectionsData, loading, error } = useCollections();
  const collections = collectionsData ?? [];
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
      const matchesQuery = !query || [scene.titleEn, scene.titleZh, scene.desc, (scene.searchKeywords ?? []).join(" ")]
        .some(value => value.toLowerCase().includes(query));
      return matchesTag && matchesQuery;
    });
  return (
    <div className="pb-10">
      <div className="sticky top-0 z-40 bg-background">
        <div className="mx-auto max-w-[1180px] px-4 py-2 md:px-8">
          <form className="flex w-full items-center gap-3 rounded-full border border-border bg-card py-1 pl-4 pr-1 transition-colors focus-within:border-primary/50 md:pl-5" onSubmit={event => event.preventDefault()}>
            <Search size={18} className="flex-shrink-0 text-muted-foreground" />
            <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)}
              placeholder="搜索场景或合集：牙医、退货、点餐…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground md:text-[15px]" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="清除搜索" className="text-muted-foreground hover:text-foreground"><X size={14} /></button>}
            <button type="submit" className="flex-shrink-0 rounded-full bg-accent px-4 py-1.5 text-[13px] font-bold text-accent-foreground transition-[filter] hover:brightness-95 md:px-5">搜索</button>
          </form>
          {!hasActiveFilter && collections.length > 0 && (
            <nav aria-label="合集快捷导航" className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {collections.filter(collection => collection.scenes.some(scene => scene.status === "live")).map(collection => (
                <button key={collection.id} type="button" onClick={() => document.getElementById(`shelf-${collection.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary">
                  <CollectionIcon id={collection.id} size={15} className="text-primary" />
                  {collection.name}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-[1180px] px-4 py-2 md:px-8 md:py-2">
        {loading ? <LoadingState label="Loading scene library…" /> : error ? <ErrorState message={error} /> : hasActiveFilter ? (
          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h1 className="font-zh-serif text-[22px] font-bold text-primary">搜索结果</h1>
              <p className="text-[13px] font-semibold text-muted-foreground">共 {filteredScenes.length} 个场景</p>
            </div>
            {filteredScenes.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {filteredScenes.map(scene => <SceneCard compact showProgress={false} key={scene.externalId ?? scene.id} scene={scene} collectionLabels={scene.collectionId ? [collectionNames.get(scene.collectionId) ?? ""] : []} />)}
              </div>
            ) : <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">没有找到匹配的场景，换个关键词或标签试试。</div>}
          </section>
        ) : (
          <div className="space-y-8">
            {collections.map((collection, index) => <CollectionSection key={collection.id} collection={collection} eager={index < 2} />)}
          </div>
        )}
      </main>
    </div>
  );
}
