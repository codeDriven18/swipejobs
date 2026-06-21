import { Link } from 'react-router-dom';
import { EmployerPageHeader } from '@/components/employer/EmployerPageHeader';
import ui from '@/components/employer/ui/employerUi.module.css';

interface PortalWorkspacePlaceholderProps {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaTo?: string;
}

export function PortalWorkspacePlaceholder({ title, subtitle, ctaLabel, ctaTo }: PortalWorkspacePlaceholderProps) {
  return (
    <section className={ui.page}>
      <EmployerPageHeader title={title} subtitle={subtitle} />
      <div className={ui.placeholderPanel}>
        <p className={ui.placeholderText}>
          This workspace is being prepared. Core hiring workflows live in Today, Pipeline, Inbox, and Roles.
        </p>
        {ctaLabel && ctaTo && <Link to={ctaTo} className={ui.btnPrimary}>{ctaLabel}</Link>}
      </div>
    </section>
  );
}
