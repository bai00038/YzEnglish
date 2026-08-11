import { useState } from "react";
import { Search, X, FileText, Download } from "lucide-react";
import { displayResourceTitle } from "@/data/resources";
import { COLLECTION_TYPE_LABELS, COLLECTION_TYPE_BADGE_STYLE, COLLECTION_TYPE_BG } from "@/data/resource-collections";
import { useResourceCollections } from "@/data/resource-collections-access";
import type { ResourceCollection } from "@/data/types";
import { Btn } from "@/app/components/Btn";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";

// Type-filter pills shown on the Resources page. "All" has no `type` and
// matches every collection; the rest map a display label to the
// `collection_type` column on resource_collections (topic/travel/country —
// see supabase/migrations/0023_create_resource_collections.sql). Never
// inferred from the title.
const TYPE_FILTERS: { label: string; type?: string }[] = [
  { label: "All" },
  { label: "Topic Packs", type: "topic" },
  { label: "Travel Series", type: "travel" },
  { label: "By Country", type: "country" },
];

// Maps to price_type on resource_collections (free/paid). "All" has no
// `type` and matches every collection regardless of price.
const PRICE_FILTERS: { label: string; type?: "free" | "paid" }[] = [
  { label: "All" },
  { label: "Free", type: "free" },
  { label: "Paid", type: "paid" },
];

const PILL_ACTIVE = { backgroundColor: "#B7F21D", color: "#1E1F1C", borderColor: "#B7F21D" };
const PILL_INACTIVE = { backgroundColor: "white", color: "#3A3B37", borderColor: "rgba(24,76,58,0.18)" };

// $128 for a whole number, $128.50 for cents — never a bare $128.00.
function formatPrice(price: number): string {
  return `$${Number.isInteger(price) ? price.toFixed(0) : price.toFixed(2)}`;
}

// One resource card. Owns its own cover-image load state so a broken
// cover_image_url (missing/expired asset) falls back to the plain icon
// placeholder instead of rendering a broken-image glyph — see task
// requirement "do not show broken images".
function CollectionCard({ c }: { c: ResourceCollection }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!c.coverImageUrl && !imageFailed;
  const canDownload = !!c.pdfUrl;

  return (
    <div
      onClick={() => canDownload && window.open(c.pdfUrl!, "_blank", "noopener,noreferrer")}
      className={`h-full flex flex-col border border-border rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-200 ${canDownload ? "cursor-pointer" : ""}`}
    >
      {/* Card header */}
      <div className={`relative h-28 flex-shrink-0 flex flex-col items-center justify-center gap-2 overflow-hidden ${COLLECTION_TYPE_BG[c.collectionType] ?? "bg-secondary"}`}>
        {showImage && (
          <img
            src={c.coverImageUrl!}
            alt=""
            onError={() => setImageFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {!showImage && <FileText size={26} className="relative z-10 text-foreground/15" />}
        <span className={`relative z-10 text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full ${COLLECTION_TYPE_BADGE_STYLE[c.collectionType] ?? "bg-secondary text-muted-foreground"}`}>
          {COLLECTION_TYPE_LABELS[c.collectionType]}
        </span>
        <span className={`absolute z-10 top-2.5 right-2.5 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm ${
          c.priceType === "free" ? "" : "bg-card text-muted-foreground border border-border"
        }`}
        style={c.priceType === "free" ? { backgroundColor: "#B7F21D", color: "#1E1F1C" } : {}}>
          {c.priceType === "free" ? "Free" : c.price != null ? formatPrice(c.price) : "Premium"}
        </span>
      </div>
      {/* Card body — flex column so the footer can pin to the bottom
          regardless of how many lines the title/desc take */}
      <div className="p-3.5 flex flex-col flex-1">
        <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">{displayResourceTitle(c.titleEn)}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5 line-clamp-2">{displayResourceTitle(c.titleZh)}</p>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-3">{c.descriptionEn}</p>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
          <span className="text-[10px] text-muted-foreground">{c.sceneCount} scene{c.sceneCount !== 1 ? "s" : ""}</span>
          {/* stopPropagation so this doesn't also trigger the card's own
              onClick (same action — would otherwise open two tabs) */}
          <div onClick={e => e.stopPropagation()}>
            <Btn
              variant="accent"
              size="sm"
              disabled={!canDownload}
              onClick={() => canDownload && window.open(c.pdfUrl!, "_blank", "noopener,noreferrer")}
            >
              <Download size={11} />Download
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResourcesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [priceFilter, setPriceFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  // Already filtered to status = "published" and ordered by sort_order by
  // the hook itself — see src/data/resource-collections-access.ts. Never
  // reads from the Scenes table.
  const { data: collectionsData, loading, error } = useResourceCollections();
  const collections = collectionsData ?? [];

  const filtered = collections.filter(c => {
    const priceType = PRICE_FILTERS.find(f => f.label === priceFilter)?.type;
    if (priceType && c.priceType !== priceType) return false;
    const typeFilter = TYPE_FILTERS.find(f => f.label === activeFilter);
    if (typeFilter?.type && c.collectionType !== typeFilter.type) return false;
    if (searchQuery && !c.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) && !c.titleZh.includes(searchQuery)) return false;
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
              {PRICE_FILTERS.map(p => (
                <button key={p.label} onClick={() => setPriceFilter(p.label)}
                  className="text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150 whitespace-nowrap"
                  style={priceFilter === p.label ? PILL_ACTIVE : PILL_INACTIVE}>
                  {p.label}
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
              {filtered.map(c => <CollectionCard key={c.id} c={c} />)}
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
