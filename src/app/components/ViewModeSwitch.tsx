export function ViewModeSwitch({ listMode, onChange, variant = 'toggle', count }: {
  listMode: boolean; onChange: (listMode: boolean) => void; variant?: 'toggle' | 'tabs'; count?: number;
}) {
  if (variant === 'tabs') return <div className="learning-view-switch" aria-label="显示模式">
    <button type="button" aria-pressed={!listMode} onClick={() => onChange(false)}>卡片</button>
    <button type="button" aria-pressed={listMode} onClick={() => onChange(true)}>列表{count === undefined ? '' : ` · ${count}`}</button>
  </div>;
  const target = listMode ? '卡片' : '列表';
  return <button type="button" className="kit-mode" aria-label={`切换为${target}模式`} onClick={() => onChange(!listMode)}>{target}</button>;
}
