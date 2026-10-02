import { Search, X } from "lucide-react";
import { useScenes, useCategoryNames } from "@/data/scenes-access";
import { SceneCard } from "@/app/components/SceneCard";
import { LoadingState, ErrorState } from "@/app/components/DataState";

export function ExplorePage({
  activeCategory, setActiveCategory,
  searchQuery, setSearchQuery,
}: {
  activeCategory: string; setActiveCategory: (c: string) => void;
  searchQuery: string; setSearchQuery: (q: string) => void;
}) {
  const { data: scenesData, loading: scenesLoading, error: scenesError } = useScenes();
  const { data: categoryNamesData } = useCategoryNames();
  const scenes = scenesData ?? [];
  const categories = categoryNamesData ?? [];

  const filtered = scenes.filter(s => {
    const cm = activeCategory === "All" || s.category === activeCategory;
    const qm = !searchQuery || s.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) || s.titleZh.includes(searchQuery);
    return cm && qm;
  });

  return (
    <div>
      {/* Header + search */}
      <div className="bg-background max-w-lg mx-auto md:max-w-5xl px-4 pt-10 md:pt-16 pb-8">
        <p className="editorial-kicker mb-3">Scene library · 场景库</p>
        <h1 className="display-serif text-[42px] md:text-[60px] font-semibold leading-none text-foreground mb-2">Explore real-life scenes</h1>
        <p className="text-sm text-muted-foreground mb-7">浏览真实生活场景 · {scenesLoading ? "…" : scenes.length} scenes available</p>
        <div className="flex items-center gap-2.5 border border-border rounded-full px-5 py-3.5 bg-card shadow-[0_12px_35px_rgba(15,53,39,0.06)] focus-within:border-primary/50 transition-colors max-w-2xl">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search: return, 退货, dentist, hotel…"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
          )}
        </div>
      </div>

      {/* Filters — light editorial strip */}
      <div className="border-y border-border bg-secondary/70">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4 py-6">

          {/* Category */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.13em] mb-2.5" style={{ color: "#0F3527" }}>Category · 分类</p>
            <div className="flex flex-wrap gap-1.5">
              {["All", ...categories].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150 whitespace-nowrap"
                  style={activeCategory === cat
                    ? { backgroundColor: "#C8F169", color: "#12241C", borderColor: "#C8F169" }
                    : { backgroundColor: "#FFFEFB", color: "#3A4A42", borderColor: "rgba(15,53,39,0.18)" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Results count + clear */}
      <div className="bg-background max-w-lg mx-auto md:max-w-5xl px-4">
        <div className="py-3 flex items-center gap-3">
          <p className="text-xs font-semibold text-foreground">{filtered.length} scene{filtered.length !== 1 ? "s" : ""} found</p>
          {(activeCategory !== "All" || searchQuery) && (
            <button onClick={() => { setActiveCategory("All"); setSearchQuery(""); }}
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline underline-offset-2">
              Clear all
            </button>
          )}
        </div>
        <div className="pb-10">
          {scenesLoading ? (
            <LoadingState label="Loading scenes…" />
          ) : scenesError ? (
            <ErrorState message={scenesError} />
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map(scene => <SceneCard key={scene.id} scene={scene} />)}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
              <Search size={28} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No scenes found</p>
              <p className="text-xs mt-1">Try a different search or filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
