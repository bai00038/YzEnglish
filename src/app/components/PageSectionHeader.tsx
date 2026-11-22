import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PageHeading } from './PageHeading';
import '@/styles/page-section-header.css';

// Identical markup and spacing in card/list modes; only the content below varies.
export function PageSectionHeader({ title, subtitle, description, back, headingAside, action, controls }: {
  title: ReactNode; subtitle?: string; description?: ReactNode;
  back?: { to: string; label: string }; headingAside?: ReactNode; action?: ReactNode; controls?: ReactNode;
}) {
  return <header className="page-section-header">
    {back && <Link className="page-section-back" to={back.to}><ArrowLeft size={16} aria-hidden="true" />{back.label}</Link>}
    <div className="page-section-title-row">
      <div className="page-section-title-copy">
        <div className="page-section-heading-row"><PageHeading subtitle={subtitle}>{title}</PageHeading>{headingAside}</div>
        {description && <p className="page-section-description">{description}</p>}
      </div>
      {action && <div className="page-section-header-action">{action}</div>}
    </div>
    {controls && <div className="page-section-controls">{controls}</div>}
  </header>;
}
