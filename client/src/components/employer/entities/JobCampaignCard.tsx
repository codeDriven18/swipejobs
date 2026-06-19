import { Link } from 'react-router-dom';
import ui from '@/components/employer/ui/employerUi.module.css';
import type { JobCampaignMetrics } from '@/lib/employer/employerWorkspaceData';
import type { PortalJob } from '@/models/portal';

interface JobCampaignCardProps {
  job: PortalJob;
  metrics: JobCampaignMetrics;
  onEdit?: () => void;
  onArchive?: () => void;
  archiving?: boolean;
  readonly?: boolean;
}

export function JobCampaignCard({ job, metrics, onEdit, onArchive, archiving, readonly = false }: JobCampaignCardProps) {
  const posted = new Date(job.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className={ui.campaignCard}>
      <div className={ui.campaignHeader}>
        <div>
          <h2 className={ui.campaignTitle}>{job.title}</h2>
          <p className={ui.campaignMeta}>
            {job.city ?? job.location ?? 'No location'} · {job.isRemote ? 'Remote' : 'On-site'} · Posted {posted}
          </p>
        </div>
        <span className={job.isActive ? ui.badgeSuccess : ui.badgeMuted}>{job.isActive ? 'Active' : 'Paused'}</span>
      </div>
      <div className={ui.campaignExcerpt} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' }}>
        <div><strong>{metrics.applicants}</strong><br /><span className={ui.candidateSub}>Applicants</span></div>
        <div><strong>{metrics.reviewing}</strong><br /><span className={ui.candidateSub}>Reviewing</span></div>
        <div><strong>{metrics.interviewing}</strong><br /><span className={ui.candidateSub}>Interview</span></div>
        <div><strong>{metrics.offers}</strong><br /><span className={ui.candidateSub}>Offers</span></div>
      </div>
      <div className={ui.campaignActions}>
        <Link to={`/portal/pipeline?jobId=${job.id}`} className={ui.btnPrimary}>Open pipeline</Link>
        <Link to={`/portal/applications?jobId=${job.id}`} className={ui.btnGhost}>View candidates</Link>
        {!readonly && onEdit && (
          <button type="button" className={ui.btnGhost} onClick={onEdit}>Edit</button>
        )}
        {!readonly && job.isActive && onArchive && (
          <button type="button" className={ui.btnDanger} disabled={archiving} onClick={onArchive}>Archive</button>
        )}
      </div>
    </article>
  );
}
