import '@/styles/headings.css';
import type { ReactNode } from 'react';

export function PageHeading({ children, subtitle, as: Tag = 'h1', className = '' }: {
  children: ReactNode; subtitle?: string; as?: 'h1' | 'h2'; className?: string;
}) {
  return <div className="site-heading">
    {subtitle && <p className="site-heading-kicker">{subtitle}</p>}
    <Tag className={`site-page-heading ${className}`.trim()}>{children}</Tag>
  </div>;
}
