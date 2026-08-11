import { useState } from "react";
import { Search, X, FileText, Download } from "lucide-react";
import { displayResourceTitle } from "@/data/resources";
import { COLLECTION_TYPE_LABELS } from "@/data/resource-collections";
import { useResourceCollections } from "@/data/resource-collections-access";
import type { ResourceCollection } from "@/data/types";
import { Btn } from "@/app/components/Btn";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";

// Topic-filter pills shown on the Resources page. "All" has no `type` and
// matches every collection; the rest map a display label to the
// `collection_type` column on resource_collections — a single, consistent
// topic-based taxonomy (not format/topic/geography mixed together like the
// old topic/travel/country values). See
// supabase/migrations/0024_resource_collections_topic_taxonomy.sql. Never
// inferred from the title.
//
// essential_services and travel are listed here so they're ready to go the
// moment a published collection uses them, but the MVP has none yet — see
// the `visibleTopicFilters` filtering in ResourcesPage below, which drops any
// pill (other than "All") with zero matching collections in the current
// published data.
const TOPIC_FILTERS: { label: string; type?: string }[] = [
  { label: "All" },
  { label: "Daily Life", type: "daily_life" },
  { label: "Tests & Guides", type: "tests_licences" },
  { label: "Essential Services", type: "essential_services" },
  { label: "Travel", type: "travel" },
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

// One resource-library row. Deliberately never reads cover_image_url — the
// goal is a document-library card (icon + metadata + download button), not
// another Explore-style photo tile. Only the Download PDF button opens
// pdf_url; the row itself is inert so a missing pdf_url can disable just the
// button ("Coming soon") without the whole card looking clickable.
function CollectionCard({ c }: { c: ResourceCollection }) {
  const canDownload = !!c.pdfUrl;

  return (
    <div className="flex flex-col gap-3 border border-border rounded-2xl bg-card p-4 md:px-5 md:py-4 transition-all duration-150 hover:border-primary/30 hover:shadow-sm">
      {/* Icon + title/metadata block. Card now always stacks vertically
          (icon/text block, then footer) so it reads well at half page
          width in the 2-column grid, not just as a full-width row.
          items-start + the icon's own small margin-top keep the icon
          pinned to the first title line instead of centering against
          the whole title+subtitle+description block. */}
      <div className="flex items-start gap-5 flex-1 min-w-0">
        <div className="flex-shrink-0 mt-0.5 w-[60px] h-[60px] md:w-[72px] md:h-[72px] rounded-[16px] md:rounded-[20px] bg-primary/10 flex flex-col items-center justify-center">
          <FileText className="w-5 h-5 md:w-7 md:h-7 text-primary" />
          <span className="text-[7px] md:text-[9px] font-black text-primary tracking-wide mt-0.5">PDF</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-sm md:text-base font-bold text-foreground leading-snug">{displayResourceTitle(c.titleEn)}</h3>
            <span
              className={`flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full ${c.priceType === "free" ? "" : "bg-secondary text-muted-foreground border border-border"}`}
              style={c.priceType === "free" ? { backgroundColor: "#B7F21D", color: "#1E1F1C" } : {}}
            >
              {c.priceType === "free" ? "Free" : c.price != null ? formatPrice(c.price) : "Premium"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-medium truncate mt-1.5">{displayResourceTitle(c.titleZh)}</p>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">{c.descriptionEn}</p>
        </div>
      </div>

      {/* Footer — divider + scene count on the left, compact pill download
          button on the right (not a full-width button; matches the
          document-library row style, not a call-to-action banner). */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
        <p className="text-[11px] text-muted-foreground">
          {COLLECTION_TYPE_LABELS[c.collectionType] ?? c.collectionType} · {c.sceneCount} scene{c.sceneCount !== 1 ? "s" : ""}
        </p>
        <Btn
          variant="accent"
          size="sm"
          disabled={!canDownload}
          onClick={() => canDownload && window.open(c.pdfUrl!, "_blank", "noopener,noreferrer")}
          className="rounded-full flex-shrink-0"
        >
          <Download size={13} />{canDownload ? "Download" : "Coming soon"}
        </Btn>
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

  // Drop any topic pill (besides "All") with zero matching collections in
  // the currently published data, so essential_services/travel stay hidden
  // until a collection actually uses them — never a hard-coded MVP allowlist.
  const visibleTopicFilters = TOPIC_FILTERS.filter(f => !f.type || collections.some(c => c.collectionType === f.type));

  const filtered = collections.filter(c => {
    const priceType = PRICE_FILTERS.find(f => f.label === priceFilter)?.type;
    if (priceType && c.priceType !== priceType) return false;
    const typeFilter = TOPIC_FILTERS.find(f => f.label === activeFilter);
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
        <p className="text-sm text-muted-foreground mb-1">学习资料下载 · Curated PDF Collections by Topic</p>
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

          {/* Browse by topic */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.13em] mb-2.5" style={{ color: "#184C3A" }}>Browse by Topic · 按主题浏览</p>
            <div className="flex flex-wrap gap-1.5">
              {visibleTopicFilters.map(f => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
