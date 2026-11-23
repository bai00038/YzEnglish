import { Repeat, Repeat1 } from 'lucide-react';

export function LoopToggle({ enabled, onChange, single = false, overlay = false }: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  single?: boolean;
  overlay?: boolean;
}) {
  const label = single ? '单句循环' : '整集循环';
  const Icon = single ? Repeat1 : Repeat;
  if (overlay) return <button type="button" role="switch" aria-label={label}
    aria-checked={enabled} title={`${label}：${enabled ? '开' : '关'}`}
    onClick={() => onChange(!enabled)} className="scene-loop-switch">
    <span className="scene-loop-thumb"><Icon size={14} strokeWidth={2.3} aria-hidden="true" /></span>
  </button>;
  return <button type="button" aria-label={label} title={`${label}：${enabled ? '开' : '关'}`}
    aria-pressed={enabled} onClick={() => onChange(!enabled)}
    className={`loop-toggle inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
    style={{ color: enabled ? 'var(--primary)' : '#8A918D' }}>
    <Icon size={20} strokeWidth={2} aria-hidden="true" />
  </button>;
}
