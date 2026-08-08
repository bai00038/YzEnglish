import { Search, X } from "lucide-react";
import { useScenes, useCategoryNames } from "@/data/scenes-access";
import { SceneCard } from "@/app/components/SceneCard";
import { LoadingState, ErrorState } from "@/app/components/DataState";

export function ExplorePage({
  activeCategory, setActiveCategory,
  activeDiff, setActiveDiff,
  searchQuery, setSearchQuery,
}: {
  activeCategory: string; setActiveCategory: (c: string) => void;
  activeDiff: string; setActiveDiff: (d: string) => void;
  searchQuery: string; setSearchQuery: (q: string) => void;
}) {
  const { data: scenesData, loading: scenesLoading, error: scenesError } = useScenes();
  const { data: categoryNamesData } = useCategoryNames();
  const scenes = scenesData ?? [];
  const categories = categoryNamesData ?? [];

  const filtered = scenes.filter(s => {
    const cm = activeCategory === "All" || s.category === activeCategory;
    const dm = activeDiff === "All" || s.level === activeDiff;
    const qm = !searchQuery || s.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) || s.titleZh.includes(searchQuery);
    return cm && dm && qm;
  });

  return (
    <div>
      {/* Header + search */}
      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4 pt-5 pb-4">
        <h1 className="text-xl font-black text-foreground mb-0.5">Explore Real-Life Scenes</h1>
        <p className="text-xs text-muted-foreground mb-4">浏览真实生活场景 · {scenesLoading ? "…" : scenes.length} scenes available</p>
        <div className="flex items-center gap-2.5 border border-border rounded-xl px-3.5 py-2.5 bg-card shadow-sm focus-within:border-primary/50 transition-colors">
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
      <div style={{ backgroundColor: "#EDF3EE" }} className="border-b border-black/8">
        <div className="max-w-lg mx-auto md:max-w-4xl px-4 pt-5 pb-4 space-y-4">

          {/* Category */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.13em] mb-2.5" style={{ color: "#184C3A" }}>Category · 分类</p>
            <div className="flex flex-wrap gap-1.5">
              {["All", ...categories].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150 whitespace-nowrap"
                  style={activeCategory === cat
                    ? { backgroundColor: "#B7F21D", color: "#1E1F1C", borderColor: "#B7F21D" }
                    : { backgroundColor: "white", color: "#3A3B37", borderColor: "rgba(24,76,58,0.18)" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.13em] mb-2.5" style={{ color: "#184C3A" }}>Level · 难度</p>
            <div className="flex flex-wrap gap-1.5">
              {["All", "A1–A2", "A2–B1", "B1–B2"].map(d => (
                <button key={d} onClick={() => setActiveDiff(d)}
                  className="text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150"
                  style={activeDiff === d
                    ? { backgroundColor: "#B7F21D", color: "#1E1F1C", borderColor: "#B7F21D" }
                    : { backgroundColor: "white", color: "#3A3B37", borderColor: "rgba(24,76,58,0.18)" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Results count + clear */}
      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4">
        <div className="py-3 flex items-center gap-3">
          <p className="text-xs font-semibold text-foreground">{filtered.length} scene{filtered.length !== 1 ? "s" : ""} found</p>
          {(activeCategory !== "All" || activeDiff !== "All" || searchQuery) && (
            <button onClick={() => { setActiveCategory("All"); setActiveDiff("All"); setSearchQuery(""); }}
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
