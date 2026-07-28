import { useState } from "react";
import { Search, X, FileText, Download } from "lucide-react";
import { CATEGORY_BG } from "@/data/scenes";
import { PDF_TYPE_LABELS } from "@/data/resources";
import { useResources } from "@/data/resources-access";
import { Btn } from "@/app/components/Btn";
import { CategoryPill } from "@/app/components/primitives";
import { LoadingState, ErrorState } from "@/app/components/DataState";

export function ResourcesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [freeOnly, setFreeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: resourcesData, loading, error } = useResources();
  const resources = resourcesData ?? [];

  const TYPE_FILTERS = ["All", "Free", "Scene PDFs", "Topic Collections", "Travel", "Country-Specific"];

  const PDF_TYPE_STYLE: Record<string, string> = {
    scene: "bg-primary/10 text-primary",
    collection: "bg-purple-100 text-purple-800",
    travel: "bg-amber-100 text-amber-800",
    country: "bg-emerald-100 text-emerald-800",
    free: "bg-emerald-100 text-emerald-800",
  };

  const filtered = resources.filter(r => {
    if (freeOnly && !r.free) return false;
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase()) && !r.titleZh.includes(searchQuery)) return false;
    if (activeFilter === "Free") return r.free;
    if (activeFilter === "Scene PDFs") return r.type === "scene";
    if (activeFilter === "Topic Collections") return r.type === "collection";
    if (activeFilter === "Travel") return r.type === "travel";
    if (activeFilter === "Country-Specific") return r.type === "country";
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4 pt-5 pb-4">
        <h1 className="text-xl font-black text-foreground mb-0.5">PDF Resources</h1>
        <p className="text-sm text-muted-foreground mb-1">学习资料下载 · Scene PDFs · Topic Collections · Travel Packs</p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">Download materials to study offline. Free resources need no login.</p>
        <div className="flex items-center gap-2.5 border border-border rounded-xl px-3.5 py-2.5 bg-card shadow-sm focus-within:border-primary/50 transition-colors">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search resources…"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
          {searchQuery && <button onClick={() => setSearchQuery("")}><X size={14} className="text-muted-foreground" /></button>}
        </div>
      </div>

      {/* Filters — dark green */}
      <div style={{ backgroundColor: "#184C3A" }} className="border-b border-black/20">
        <div className="max-w-lg mx-auto md:max-w-4xl px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {TYPE_FILTERS.map(t => (
              <CategoryPill key={t} active={activeFilter === t} onClick={() => setActiveFilter(t)} darkMode>{t}</CategoryPill>
            ))}
          </div>
        </div>
      </div>

      {/* Free-only + count */}
      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4 py-3 flex items-center gap-3">
        <button onClick={() => setFreeOnly(!freeOnly)}
          className={`flex items-center gap-1.5 text-xs font-bold border rounded-full px-3 py-1.5 transition-all ${
            freeOnly ? "text-accent-foreground border-accent" : "bg-card border-border hover:border-primary hover:text-primary"
          }`}
          style={freeOnly ? { backgroundColor: "#B7F21D", borderColor: "#B7F21D", color: "#1E1F1C" } : {}}>
          Free only
        </button>
        <span className="text-xs text-muted-foreground">{loading ? "…" : filtered.length} resource{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4 pb-10">
        {loading ? (
          <LoadingState label="Loading resources…" />
        ) : error ? (
          <ErrorState message={error} />
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map(r => (
              <div key={r.id} className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-200">
                {/* Card header */}
                <div className={`relative h-28 flex flex-col items-center justify-center gap-2 ${CATEGORY_BG[r.category] ?? "bg-secondary"}`}>
                  <FileText size={26} className="text-foreground/15" />
                  <span className={`text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full ${PDF_TYPE_STYLE[r.type] ?? "bg-secondary text-muted-foreground"}`}>
                    {PDF_TYPE_LABELS[r.type]}
                  </span>
                  <span className={`absolute top-2.5 right-2.5 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm ${
                    r.free ? "" : "bg-card text-muted-foreground border border-border"
                  }`}
                  style={r.free ? { backgroundColor: "#B7F21D", color: "#1E1F1C" } : {}}>
                    {r.free ? "Free" : "Premium"}
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="text-sm font-bold text-foreground leading-snug">{r.title}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{r.titleZh}</p>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-2">{r.desc}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-[10px] text-muted-foreground">{r.scenes} scene{r.scenes !== 1 ? "s" : ""}</span>
                    <Btn variant={r.free ? "accent" : "secondary"} size="sm">
                      <Download size={11} />{r.free ? "Download" : "Get Access"}
                    </Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
            <p className="text-sm font-semibold">No resources found</p>
            <p className="text-xs mt-1">Try adjusting the filters above</p>
          </div>
        )}
      </div>
    </div>
  );
}
