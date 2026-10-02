import { Search, X } from "lucide-react";
import { useScenes } from "@/data/scenes-access";
import { SceneCard } from "@/app/components/SceneCard";
import { LoadingState, ErrorState } from "@/app/components/DataState";

const CATEGORY_FILTERS = [
  { label: "购物英语", categories: ["Shopping & Beauty", "Shopping & Returns"] },
  { label: "日常生活", categories: ["Food & Restaurants", "Housing", "Transportation", "Social Life", "Work", "Travel", "Emergencies"] },
  { label: "医疗英语", categories: ["Healthcare"] },
  { label: "新移民必备", categories: ["Banking & Services", "Housing", "Transportation", "Work", "Emergencies"] },
  { label: "家校沟通", categories: ["School & Family"] },
] as const;

export function ExplorePage({
  activeCategory, setActiveCategory,
  searchQuery, setSearchQuery,
}: {
  activeCategory: string; setActiveCategory: (c: string) => void;
  searchQuery: string; setSearchQuery: (q: string) => void;
}) {
  const { data: scenesData, loading: scenesLoading, error: scenesError } = useScenes();
  const scenes = scenesData ?? [];

  const filtered = scenes.filter(s => {
    const selectedFilter = CATEGORY_FILTERS.find(filter => filter.label === activeCategory);
    const selectedCategories = selectedFilter?.categories as readonly string[] | undefined;
    const cm = activeCategory === "All" || Boolean(selectedCategories?.includes(s.category));
    const qm = !searchQuery || s.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) || s.titleZh.includes(searchQuery);
    return cm && qm;
  });

  return (
    <div>
      {/* Header + search */}
      <div className="mx-auto max-w-[1180px] bg-background px-5 pb-10 pt-12 md:px-8 md:pb-12 md:pt-16">
        <p className="editorial-kicker mb-4">Scene library · 场景库</p>
        <h1 className="display-serif mb-4 text-[44px] font-semibold leading-[1.04] tracking-[-0.01em] text-primary md:text-[68px]">
          Explore <em className="font-normal">real-life</em> scenes
        </h1>
        <p className="mb-8 text-[15px] text-foreground md:text-[17px]">
          浏览真实生活场景 · 共 {scenesLoading ? "…" : scenes.length} 个场景
          <span className="display-serif ml-2 hidden text-[15px] italic text-muted-foreground sm:inline">real scenes for real life</span>
        </p>
        <form className="flex max-w-[680px] items-center gap-3 rounded-full border border-border bg-card py-2 pl-5 pr-2 shadow-[0_10px_30px_rgba(18,36,28,0.06)] transition-colors focus-within:border-primary/50 md:pl-6" onSubmit={event => event.preventDefault()}>
          <Search size={19} className="flex-shrink-0 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索场景：退货、牙医、酒店…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground md:text-base" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
          )}
          <button type="submit" className="flex-shrink-0 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition-[filter] hover:brightness-95 md:px-6">搜索</button>
        </form>
      </div>

      {/* Filters — light editorial strip */}
      <div className="border-y border-border bg-secondary">
        <div className="mx-auto max-w-[1180px] px-5 py-4 md:px-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="mr-1 text-[12px] font-medium tracking-[0.18em] text-muted-foreground">场景分类</p>
            <div className="flex flex-wrap gap-2.5">
              {[{ label: "全部", value: "All" }, ...CATEGORY_FILTERS.map(filter => ({ label: filter.label, value: filter.label }))].map(cat => (
                <button key={cat.value} onClick={() => setActiveCategory(cat.value)}
                  className="whitespace-nowrap rounded-full border-[1.5px] px-5 py-2 text-sm leading-none transition-all duration-150"
                  style={activeCategory === cat.value
                    ? { backgroundColor: "#C8F169", color: "#12241C", borderColor: "#C8F169", fontWeight: 700 }
                    : { backgroundColor: "transparent", color: "#3A4A42", borderColor: "rgba(18,36,28,0.22)" }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Results count + clear */}
      <div className="mx-auto max-w-[1180px] bg-background px-5 md:px-8">
        <div className="flex items-baseline gap-4 pb-5 pt-7 md:pt-8">
          <p className="text-[15px] text-foreground">共 <b className="display-serif mx-0.5 text-[22px] text-primary">{filtered.length}</b> 个场景</p>
          {(activeCategory !== "All" || searchQuery) && (
            <button onClick={() => { setActiveCategory("All"); setSearchQuery(""); }}
              className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-primary">
              清除筛选
            </button>
          )}
        </div>
        <div className="pb-[72px]">
          {scenesLoading ? (
            <LoadingState label="Loading scenes…" />
          ) : scenesError ? (
            <ErrorState message={scenesError} />
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(scene => <SceneCard key={scene.id} scene={scene} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center text-muted-foreground">
              <Search size={28} className="mx-auto mb-3 opacity-30" />
              <p className="font-['Noto_Serif_SC'] text-[20px] font-bold text-foreground">没有找到匹配的场景</p>
              <p className="mt-1 text-sm">换个关键词试试，或者清除筛选看全部。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
