import { Repeat } from 'lucide-react';

// Same repeat silhouette as the site's icon set, with more room around the centered numeral.
function SingleRepeatIcon({ size = 20, strokeWidth = 1.7 }: { size?: number; strokeWidth?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m17 1 4 4-4 4" />
    <path d="M3 10V9a4 4 0 0 1 4-4h14" />
    <path d="m7 23-4-4 4-4" />
    <path d="M21 14v1a4 4 0 0 1-4 4H3" />
    <path d="m10.75 10.25 1.25-.75v5" />
  </svg>;
}

export function LoopToggle({ enabled, onChange, single = false, overlay = false }: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  single?: boolean;
  overlay?: boolean;
}) {
  const label = single ? '单句循环' : '整集循环';
  const Icon = single ? SingleRepeatIcon : Repeat;
  if (overlay) return <button type="button" role="switch" aria-label={label}
    aria-checked={enabled} title={`${label}：${enabled ? '开' : '关'}`}
    onClick={() => onChange(!enabled)} className="scene-loop-switch">
    <span className="scene-loop-thumb"><Icon size={14} strokeWidth={2.3} aria-hidden="true" /></span>
  </button>;
  return <button type="button" aria-label={label} title={`${label}：${enabled ? '开' : '关'}`}
    aria-pressed={enabled} onClick={() => onChange(!enabled)}
    className={`loop-toggle inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
    style={{ color: enabled ? 'var(--primary)' : '#8A918D' }}>
    <Icon size={20} strokeWidth={single ? 1.7 : 2} aria-hidden="true" />
  </button>;
}
