import { useState } from "react";
import { Search, X, FileText, Download } from "lucide-react";
import { CATEGORY_BG } from "@/data/scenes";
import { PDF_TYPE_LABELS, COLLECTION_TYPES, displayResourceTitle } from "@/data/resources";
import { useResources } from "@/data/resources-access";
import { Btn } from "@/app/components/Btn";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";

// Type-filter pills shown on the Resources page. "All" has no `type` and
// matches every collection; the rest map a display label to the `type`
// column on pdf_resources (the same field used to exclude single-scene
// rows — see COLLECTION_TYPES in src/data/resources.ts). Never inferred
// from the title.
const TYPE_FILTERS: { label: string; type?: string }[] = [
  { label: "All" },
  { label: "Topic Collections", type: "collection" },
  { label: "Travel", type: "travel" },
  { label: "Country-Specific", type: "country" },
];

const PDF_TYPE_STYLE: Record<string, string> = {
  collection: "bg-purple-100 text-purple-800",
  travel: "bg-amber-100 text-amber-800",
  country: "bg-emerald-100 text-emerald-800",
};

const PILL_ACTIVE = { backgroundColor: "#B7F21D", color: "#1E1F1C", borderColor: "#B7F21D" };
const PILL_INACTIVE = { backgroundColor: "white", color: "#3A3B37", borderColor: "rgba(24,76,58,0.18)" };

export function ResourcesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [priceFilter, setPriceFilter] = useState<"All" | "Free">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: resourcesData, loading, error } = useResources();
  const resources = resourcesData ?? [];

  // Base data set for this page: multi-scene collections only. Single-scene
  // PDFs (type "scene") are downloadable from their own Scene Detail page
  // and never shown here.
  const collections = resources.filter(r => COLLECTION_TYPES.includes(r.type));

  const filtered = collections.filter(r => {
    if (priceFilter === "Free" && !r.free) return false;
    const typeFilter = TYPE_FILTERS.find(f => f.label === activeFilter);
    if (typeFilter?.type && r.type !== typeFilter.type) return false;
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase()) && !r.titleZh.includes(searchQuery)) return false;
    return true;
  });

  const hasActiveFilters = activeFilter !== "All" || priceFilter !== "All" || !!searchQuery;

  return (
    <div>
      {/* Header */}
      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4 pt-5 pb-4">
        <h1 className="text-xl font-black text-foreground mb-0.5">PDF Resources</h1>
        <p className="text-sm text-muted-foreground mb-1">学习资料下载 · Topic Collections · Travel Packs · Country Packs</p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">Download curated collections to study offline. Free resources need no login.</p>
        <div className="flex items-center gap-2.5 border border-border rounded-xl px-3.5 py-2.5 bg-card shadow-sm focus-within:border-primary/50 transition-colors">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search resources…"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
          {searchQuery && <button onClick={() => setSearchQuery("")}><X size={14} className="text-muted-foreground" /></button>}
        </div>
      </div>

      {/* Filters — light editorial strip, matches Explore page */}
      <div style={{ backgroundColor: "#EDF3EE" }} className="border-b border-black/8">
        <div className="max-w-lg mx-auto md:max-w-4xl px-4 pt-5 pb-4 space-y-4">

          {/* Collection type */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.13em] mb-2.5" style={{ color: "#184C3A" }}>Collection Type · 合集类型</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map(f => (
                <button key={f.label} onClick={() => setActiveFilter(f.label)}
                  className="text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150 whitespace-nowrap"
                  style={activeFilter === f.label ? PILL_ACTIVE : PILL_INACTIVE}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price — a resource property, kept as its own filter dimension
              rather than mixed into the collection-type list above */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.13em] mb-2.5" style={{ color: "#184C3A" }}>Price · 价格</p>
            <div className="flex flex-wrap gap-1.5">
              {(["All", "Free"] as const).map(p => (
                <button key={p} onClick={() => setPriceFilter(p)}
                  className="text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150 whitespace-nowrap"
                  style={priceFilter === p ? PILL_ACTIVE : PILL_INACTIVE}>
                  {p}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Results count + clear */}
      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4">
        <div className="py-3 flex items-center gap-3">
          <p className="text-xs font-semibold text-foreground">{loading ? "…" : filtered.length} collection{filtered.length !== 1 ? "s" : ""} found</p>
          {hasActiveFilters && (
            <button onClick={() => { setActiveFilter("All"); setPriceFilter("All"); setSearchQuery(""); }}
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline underline-offset-2">
              Clear all
            </button>
          )}
        </div>

        <div className="pb-10">
          {loading ? (
            <LoadingState label="Loading resources…" />
          ) : error ? (
            <ErrorState message={error} />
          ) : collections.length === 0 ? (
            <EmptyState title="More resource collections are coming soon." subtitle="更多主题合集正在整理中" />
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-stretch">
              {filtered.map(r => (
                <div key={r.id} className="h-full flex flex-col border border-border rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-200">
                  {/* Card header */}
                  <div className={`relative h-28 flex-shrink-0 flex flex-col items-center justify-center gap-2 ${CATEGORY_BG[r.category] ?? "bg-secondary"}`}>
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
                  {/* Card body — flex column so the footer can pin to the
                      bottom regardless of how many lines the title/desc take */}
                  <div className="p-3.5 flex flex-col flex-1">
                    <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">{displayResourceTitle(r.title)}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5 line-clamp-2">{displayResourceTitle(r.titleZh)}</p>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-3">{r.desc}</p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                      {r.scenes > 1 ? (
                        <span className="text-[10px] text-muted-foreground">{r.scenes} scenes</span>
                      ) : <span />}
                      {r.free && !r.filePath ? (
                        <span className="text-[11px] font-bold text-muted-foreground italic">资料准备中</span>
                      ) : r.free ? (
                        <a href={r.filePath} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all duration-150 text-xs px-3 py-1.5 bg-accent text-accent-foreground hover:opacity-90 active:scale-95">
                          <Download size={11} />Download
                        </a>
                      ) : (
                        <Btn variant="secondary" size="sm"><Download size={11} />Get Access</Btn>
                      )}
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
    </div>
  );
}
