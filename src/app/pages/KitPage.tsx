import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, ArrowRight, ArrowRightLeft, BookOpen, ChevronLeft, ChevronRight, LoaderCircle, LockKeyhole, Pause, Search, Volume2, X } from "lucide-react";
import { useMembershipAccess } from "@/data/membership";
import { loadKitCatalogue, loadKitClipsIndex, loadKitAudioIndex, matchesKitSearch, type KitCatalogue, type KitEntry, type KitOccurrence } from "@/data/kit";
import { playKitExample, stopKitAudio, useKitAudio } from "@/data/kit-audio";
import { MembershipUnlockModal } from "@/app/components/MembershipUnlockModal";
import { CollectionIcon, CollectionIconDefs, collectionShortcutClass } from "@/app/components/CollectionIcon";
import { PhraseAudioButton } from "@/app/components/PhraseAudioButton";
import "@/styles/kit.css";

function KitSearch({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <form className="kit-search" onSubmit={event => event.preventDefault()}><Search size={18} /><input value={value}
    aria-label={label} placeholder={label} onChange={event => onChange(event.target.value)} />
    {value && <button type="button" className="kit-search-clear" aria-label="清除搜索" onClick={() => onChange("")}><X size={14} /></button>}
    <button type="submit" className="kit-search-submit">搜索</button></form>;
}

function ExampleBlock({ occurrence }: { occurrence: KitOccurrence }) {
  const audio = useKitAudio();
  const hasAnchor = occurrence.anchor_start !== null;
  const id = `source:${occurrence.sceneId}:${occurrence.anchor_start}`;
  const active = audio.id === id && !audio.error;
  return <div className="kit-example">
    {hasAnchor && <button type="button" className="kit-original-audio"
      aria-label={active ? "停止原声" : "播放原声"} title={active ? "停止原声" : "播放／重播原声"}
      aria-pressed={active} aria-busy={active && audio.loading} onClick={() => { void playKitExample(occurrence); }}>
      {active && audio.loading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : active ? <Pause size={17} fill="currentColor" strokeWidth={0} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}
    </button>}
    <div className="kit-example-copy">
    {occurrence.contextLine && <p className="kit-context-line">{occurrence.contextLine}</p>}
    {hasAnchor ? <button type="button" className="kit-example-sentence kit-sentence-play"
      aria-label={`${active ? "停止原声" : "播放原声"}：${occurrence.displayExample}`}
      aria-pressed={active} onClick={() => { void playKitExample(occurrence); }}>
      “{occurrence.displayExample}”
    </button> : <p className="kit-example-sentence">“{occurrence.displayExample}”</p>}
    </div>
    <div className="kit-example-meta"><div className="kit-source-info">
      <span>出自 <b>{occurrence.sceneId}</b></span>{" "}
      <b className="kit-source-title">《{occurrence.titleZh}》</b>
    </div>
      {occurrence.slug && <Link to={`/scenes/${occurrence.slug}`}>去学这集 <ChevronRight size={13} /></Link>}
    </div>
    <p className="kit-tap-hint kit-original-status" role="status">
      {audio.id === id && audio.error
        ? audio.error
        : active ? (audio.loading ? "正在加载原声…" : "原声播放中 · 点击句子或喇叭停止") : ""}
    </p>
  </div>;
}

function EntryCard({ entry, side = false, onNavigate }: { entry: KitEntry; side?: boolean; onNavigate?: () => void }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const occurrences = entry.occurrences;
  const sourceDotsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = sourceDotsRef.current;
    const selected = row?.querySelector<HTMLButtonElement>('[aria-current="true"]');
    if (!row || !selected || side) return;
    row.scrollTo({ left: selected.offsetLeft - (row.clientWidth - selected.offsetWidth) / 2 });
  }, [sourceIndex, side]);
  const moveSource = (next: number) => {
    const nextIndex = Math.max(0, Math.min(occurrences.length - 1, next));
    if (side || nextIndex === sourceIndex) return;
    stopKitAudio();
    setSourceIndex(nextIndex);
    if (occurrences[nextIndex].anchor_start !== null) void playKitExample(occurrences[nextIndex]);
  };
  return <article className={side ? "kit-entry-card is-side" : "kit-entry-card"} onClick={side ? onNavigate : undefined} aria-hidden={side || undefined}>
    <div className="kit-entry-top"><div><div className="kit-entry-name"><h2>{entry.text}</h2>{entry.chunkType && <span className="kit-chunk-type">{entry.chunkType}</span>}</div>
      {entry.phonetic && <p className="kit-phonetic">{entry.phonetic}</p>}
      <p className="kit-meaning">{entry.meaningZh}</p></div>
      <PhraseAudioButton text={entry.text} audioUrl={entry.audioUrl} />
    </div>
    {entry.kind === "expression" && entry.explanation && <p className="kit-explanation"><span>讲解</span>{entry.explanation}</p>}
    <div className="kit-example-slider" onTouchStart={event => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={event => {
        if (touchStart.current === null) return;
        const delta = event.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(delta) > 45) moveSource(sourceIndex + (delta < 0 ? 1 : -1));
      }}>
      <ExampleBlock occurrence={occurrences[sourceIndex]} />
    </div>
    {occurrences.length > 1 && <div className="kit-source-controls kit-source-pager">
      <button type="button" className="kit-source-arrow" aria-label="上一条原句" disabled={sourceIndex === 0} onClick={() => moveSource(sourceIndex - 1)}><ChevronLeft size={18} /></button>
      <div className="kit-source-dots" ref={sourceDotsRef} role="group" aria-label="切换原句">
        {occurrences.map((source, index) => <button type="button" key={`${source.sceneId}-${index}`}
          aria-label={`第 ${index + 1} 条原句，共 ${occurrences.length} 条`} aria-current={sourceIndex === index ? "true" : undefined}
          onClick={() => moveSource(index)}><span /></button>)}
      </div>
      <button type="button" className="kit-source-arrow" aria-label="下一条原句" disabled={sourceIndex === occurrences.length - 1} onClick={() => moveSource(sourceIndex + 1)}><ChevronRight size={18} /></button>
    </div>}
  </article>;
}

export function KitPage() {
  const { isUnlocked } = useMembershipAccess();
  const [catalogue, setCatalogue] = useState<KitCatalogue | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingKind, setPendingKind] = useState<KitEntry["kind"] | null>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const rememberedCollection = useRef<string | null>(null);
  const [chipEdges, setChipEdges] = useState({ left: false, right: false });
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const kind = params.get("kind") === "word" ? "word" : params.get("kind") === "chunk" ? "chunk" : "expression";
  const collectionId = kind === "expression" ? null : params.get("collection");
  const listMode = params.get("view") === "list";
  const isHome = !params.has("kind") && !collectionId && !params.has("entry");

  useEffect(() => {
    if (kind !== "expression") rememberedCollection.current = collectionId;
  }, [kind, collectionId]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    void loadKitClipsIndex().catch(() => {});
    void loadKitAudioIndex().catch(() => {});
    loadKitCatalogue().then(data => { if (!cancelled) setCatalogue(data); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [attempt]);

  useEffect(() => {
    stopKitAudio();
    setQuery("");
    return stopKitAudio;
  }, [location.key, isUnlocked]);

  useEffect(() => {
    if (!isUnlocked || !pendingKind) return;
    setParams({ kind: pendingKind });
    setPendingKind(null);
    setModalOpen(false);
  }, [isUnlocked, pendingKind, setParams]);

  useEffect(() => {
    chipsRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [collectionId, kind, catalogue]);

  useEffect(() => {
    const row = chipsRef.current;
    if (!row) return;
    const updateEdges = () => {
      // Ignore the row's 2px inset when the last chip is already fully visible.
      const left = row.scrollLeft > 3;
      const right = row.scrollWidth - row.clientWidth - row.scrollLeft > 3;
      setChipEdges(previous => previous.left === left && previous.right === right ? previous : { left, right });
    };
    updateEdges();
    row.addEventListener("scroll", updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(row);
    for (const chip of row.children) observer.observe(chip);
    return () => { row.removeEventListener("scroll", updateEdges); observer.disconnect(); };
  }, [catalogue, kind, isHome, isUnlocked, listMode]);

  const entries = useMemo(() => {
    const source = kind === "word" ? catalogue?.words : kind === "chunk" ? catalogue?.chunks : catalogue?.expressions;
    return (source ?? []).filter(entry => !collectionId || entry.occurrences.some(item => item.collectionId === collectionId));
  }, [catalogue, kind, collectionId]);
  const selectedIndex = Math.max(0, entries.findIndex(entry => entry.id === params.get("entry")));
  const current = entries[selectedIndex];
  const collection = catalogue?.collections.find(item => item.id === collectionId);
  const kindLabel = kind === "word" ? "词汇" : kind === "chunk" ? "词伙" : "表达";
  const kindEnglish = kind === "word" ? "Vocabulary" : kind === "chunk" ? "Chunks" : "Expressions";
  const title = collection ? `${collection.name}·${kindLabel}` : `全部${kindLabel}`;

  function openCategory(nextKind: KitEntry["kind"]) {
    if (!isUnlocked) { setPendingKind(nextKind); setModalOpen(true); return; }
    setParams({ kind: nextKind });
  }
  function changeFilter(nextKind: KitEntry["kind"], nextCollection: string | null) {
    const next = new URLSearchParams({ kind: nextKind });
    if (nextKind !== "expression" && nextCollection) next.set("collection", nextCollection);
    if (listMode) next.set("view", "list");
    setParams(next);
    setSlideDir(0);
  }

  const [slideDir, setSlideDir] = useState(0);
  const wheelLock = useRef(0);
  const wheelAcc = useRef(0);
  function openEntry(entry: KitEntry, scope = collectionId) {
    const next = new URLSearchParams({ kind: entry.kind, entry: entry.id });
    if (scope && entry.kind !== "expression") next.set("collection", scope);
    setParams(next);
  }
  function moveEntry(delta: number) {
    const next = entries[selectedIndex + delta];
    if (next) { setSlideDir(delta); openEntry(next); }
  }
  useEffect(() => {
    if (isHome || listMode || !isUnlocked) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const next = entries[selectedIndex + (event.key === "ArrowRight" ? 1 : -1)];
      if (!next) return;
      event.preventDefault();
      setSlideDir(event.key === "ArrowRight" ? 1 : -1);
      const nextParams = new URLSearchParams(params);
      nextParams.set("entry", next.id);
      setParams(nextParams);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entries, selectedIndex, params, setParams, isHome, listMode, isUnlocked]);
  useEffect(() => {
    if (isHome || listMode || !isUnlocked) return;
    const onWheel = (event: WheelEvent) => {
      if (!(event.target instanceof HTMLElement) || !event.target.closest(".kit-carousel")) return;
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      const now = Date.now();
      if (now < wheelLock.current) return;
      wheelAcc.current += event.deltaX;
      if (Math.abs(wheelAcc.current) < 50) return;
      const step = wheelAcc.current > 0 ? 1 : -1;
      wheelAcc.current = 0;
      wheelLock.current = now + 450;
      moveEntry(step);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [entries, selectedIndex, isHome, listMode, isUnlocked]);

  if (!isUnlocked && !isHome) return <section className="kit-page kit-locked">
    <LockKeyhole size={34} /><h1>锦囊库</h1>
    <p>从真实场景里提炼表达和核心词，听原句，随时回到课程。</p>
    <button type="button" className="kit-primary is-pill" onClick={() => setModalOpen(true)}>输入会员码，打开锦囊库</button>
    <MembershipUnlockModal open={modalOpen} onOpenChange={setModalOpen} />
  </section>;
  if (loadError) return <section className="kit-page"><p role="alert">锦囊库加载失败，请重试。</p>
    <button className="kit-primary is-pill" onClick={() => setAttempt(value => value + 1)}>重新加载</button></section>;
  if (!catalogue) return <section className="kit-page" role="status">正在加载锦囊库…</section>;

  const toggleView = () => {
    const next = new URLSearchParams(params);
    if (listMode) next.delete("view"); else next.set("view", "list");
    setParams(next);
  };
  return <section className={`kit-page ${isHome ? "kit-home" : !listMode ? "kit-card-page" : ""}`}>
    <header className="kit-page-header">
      {!isHome && <button type="button" className="kit-back" onClick={() => navigate("/kit")}><ArrowLeft size={16} />返回锦囊库</button>}
      <div className="kit-page-title-row">
        <div><div className="kit-heading-line"><h1>{isHome ? "锦囊库" : title}{isHome && <em>Survival Kit</em>}</h1>
          {!isHome && <div className="kit-kind-links" aria-label="切换内容类型">
            {([{ kind: "expression", label: "表达" }, { kind: "chunk", label: "词伙" }, { kind: "word", label: "词汇" }] as const)
              .filter(item => item.kind !== kind).map(item => <button key={item.kind} type="button" className="kit-kind-link"
                onClick={() => changeFilter(item.kind, kind === "expression" ? rememberedCollection.current : collectionId)}>
                <ArrowRightLeft size={15} aria-hidden="true" />{item.label}
              </button>)}
          </div>}
          </div>
          {!isHome && <p className="kit-subtitle">{collection?.titleEn}{collection ? " · " : ""}{kindEnglish}</p>}</div>
        {!isHome && entries.length > 0 && <button type="button" className="kit-mode" onClick={toggleView}>{listMode ? "卡片" : "全部"}</button>}
      </div>
    </header>
    {isHome ? <>
      <div className="kit-category-grid">
        <CategoryCard label="表达" english="Expressions" kind="expression" entries={catalogue.expressions}
          description="开口就能用的句型。" isUnlocked={isUnlocked} onClick={() => openCategory("expression")} />
        <CategoryCard label="词伙" english="Chunks" kind="chunk" entries={catalogue.chunks}
          description="经常一起说的固定搭配。" isUnlocked={isUnlocked} onClick={() => openCategory("chunk")} />
        <CategoryCard label="词汇" english="Vocabulary" kind="word" entries={catalogue.words}
          description="场景里真正会用到的词。" isUnlocked={isUnlocked} onClick={() => openCategory("word")}
          collectionTotal={catalogue.collections.length} />
      </div>
      <MembershipUnlockModal open={modalOpen} onOpenChange={setModalOpen} />
    </> : <>
      {kind !== "expression" && <div className="kit-filters">
        <CollectionIconDefs />
        <div className="kit-filter-wrap">
        <div className="kit-filter-chips" ref={chipsRef} aria-label="按合集筛选">
          <button type="button" className={collectionShortcutClass} aria-pressed={!collectionId} onClick={() => changeFilter(kind, null)}>全部</button>
          {catalogue.collections.map(item => <button type="button" key={item.id} className={collectionShortcutClass} aria-pressed={collectionId === item.id}
            onClick={() => changeFilter(kind, item.id)}><CollectionIcon id={item.id} size={15} />{item.name}</button>)}
        </div>
        {chipEdges.left && <div aria-hidden="true" className="kit-filter-fade is-left" />}
        {chipEdges.right && <div aria-hidden="true" className="kit-filter-fade is-right" />}
        </div>
      </div>}
      {entries.length === 0 ? <div className="kit-pending"><BookOpen size={32} />
        <h2>{kindLabel}提炼中</h2>
        <p>{kind === "word" ? "各集讲义中的核心词会逐合集整理到这里。" : `这个合集的${kindLabel}还在提炼中`}</p>
      </div>
      : listMode ? <>
      <KitSearch value={query} onChange={setQuery} label={collection ? "搜这个合集的条目，中英文都可以" : "搜索全部条目，中英文都可以"} />
      <EntryList entries={entries.filter(entry => matchesKitSearch(entry, query))} onSelect={entry => openEntry(entry)} />
    </> : <>
      <div className="kit-progress"><span>第 {selectedIndex + 1} 个 · 共 {entries.length} 个</span></div>
      <div key={current.id} className={`kit-stage kit-carousel ${slideDir > 0 ? "kit-anim-next" : slideDir < 0 ? "kit-anim-prev" : ""}`}>
        {selectedIndex > 0
          ? <EntryCard key={entries[selectedIndex - 1].id} entry={entries[selectedIndex - 1]} side onNavigate={() => moveEntry(-1)} />
          : <div className="kit-peek-spacer" aria-hidden="true" />}
        <EntryCard key={current.id} entry={current} />
        {selectedIndex < entries.length - 1
          ? <EntryCard key={entries[selectedIndex + 1].id} entry={entries[selectedIndex + 1]} side onNavigate={() => moveEntry(1)} />
          : <div className="kit-peek-spacer" aria-hidden="true" />}
      </div>
      <div className="kit-card-navigation">
        <button type="button" disabled={selectedIndex === 0} onClick={() => moveEntry(-1)}>‹ 上一个</button>
        <button type="button" className="kit-primary" disabled={selectedIndex === entries.length - 1} onClick={() => moveEntry(1)}>下一个 ›</button>
      </div>
      </>}
    </>}
  </section>;
}

function CategoryCard({ label, english, kind, entries, description, isUnlocked, onClick, collectionTotal = 0 }: {
  label: string; english: string; kind: KitEntry["kind"]; entries: KitEntry[]; description: string;
  isUnlocked: boolean; onClick: () => void; collectionTotal?: number;
}) {
  const completedCollections = new Set(entries.flatMap(entry => entry.occurrences.map(source => source.collectionId))).size;
  return <button type="button" className={`kit-category-card is-${kind}`} onClick={onClick}
    aria-label={`${label}，${entries.length ? `${entries.length} 条` : '提炼中'}，${isUnlocked ? '开始练习' : '输入会员码解锁'}`}>
    <div className="kit-category-heading"><h2>{label}<em>{english}</em></h2>
      {!isUnlocked && <span className="kit-member-label"><LockKeyhole size={11} />会员专属</span>}
    </div>
    <p className="kit-category-description">{description}</p>
    {kind === "word" && entries.length === 0
      ? <div className="kit-word-progress"><p>提炼进度 {completedCollections} / {collectionTotal} 个合集</p>
          <progress value={completedCollections} max={collectionTotal} />
          <p>从每集讲义的词表逐条提炼，只收片子里真正出现过的词。</p></div>
      : <div className="kit-category-examples"><span className="kit-example-label">比如</span>
          {entries.slice(0, 2).map(entry => <div key={entry.id}><strong>{entry.text}</strong><small>{entry.meaningZh.length > 24 ? entry.meaningZh.split(/[；;。]/)[0] : entry.meaningZh}</small></div>)}
        </div>}
    <div className="kit-category-footer">
      <span className="kit-category-total">{entries.length > 0 ? <><b>{entries.length}</b><span>条</span></> : '提炼中'}</span>
      <span className="kit-category-cta" aria-hidden="true">{isUnlocked ? '开始练习' : '解锁练习'}<ArrowRight size={16} /></span>
    </div>
  </button>;
}

function EntryList({ entries, onSelect }: { entries: KitEntry[]; onSelect: (entry: KitEntry) => void }) {
  if (entries.length === 0) return <p className="kit-empty">没有找到匹配的条目。</p>;
  return <div className="kit-entry-list">{entries.map(entry =>
    <button type="button" key={entry.id} onClick={() => onSelect(entry)}>
      <span><strong>{entry.text}</strong><small>{entry.meaningZh}</small></span><ChevronRight size={16} />
    </button>)}</div>;
}
