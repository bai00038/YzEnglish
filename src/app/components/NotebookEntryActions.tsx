import { setEntryLearned, useMemberLearning } from '@/data/member-learning';

// Both review cards and the full notebook list invoke the same actions.
export function NotebookEntryActions({ entryId, label }: { entryId: string; label: string }) {
  const { ready } = useMemberLearning();
  return <div className="kit-learning-actions notebook-entry-actions">
    <button type="button" disabled={!ready} aria-label={`标记为已学会 ${label}`} onClick={() => setEntryLearned(entryId, true)}>已学会</button>
  </div>;
}
