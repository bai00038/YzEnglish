import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import '@/styles/kit.css';

export interface KitListItem { id: string; text: string; meaningZh: string }

// One grid/tile implementation for Kit and the personal learning lists.
// A tile either opens a card or exposes a separate learning action.
export function KitEntryList<T extends KitListItem>({ entries, onSelect, renderAction }: {
  entries: T[]; onSelect?: (entry: T) => void; renderAction?: (entry: T) => ReactNode;
}) {
  if (!entries.length) return <p className="kit-empty">没有找到匹配的条目。</p>;
  return <div className="kit-entry-list">{entries.map(entry => {
    const copy = <span className="kit-entry-list-copy"><strong>{entry.text}</strong><small>{entry.meaningZh}</small></span>;
    return onSelect ? <button className="kit-entry-tile" type="button" key={entry.id} onClick={() => onSelect(entry)}>{copy}<ChevronRight size={16} /></button>
      : <div className="kit-entry-tile" key={entry.id}>{copy}{renderAction?.(entry)}</div>;
  })}</div>;
}
