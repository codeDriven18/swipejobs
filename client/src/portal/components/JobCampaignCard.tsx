import { Link } from 'react-router-dom';
import type { JobCampaignMetrics } from '@/lib/employer/employerWorkspaceData';
import type { PortalJob } from '@/models/portal';
import ws from '@/portal/workspace.module.css';

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
    <article className={ws.campaignCard}>
      <div>
        <h3 className={ws.campaignTitle}>{job.title}</h3>
        <p className={ws.campaignMeta}>
          {job.city ?? job.location ?? 'No location'} · {job.isRemote ? 'Remote' : 'On-site'} · Posted {posted}
        </p>
      </div>
      <div className={ws.metricsRow}>
        <div className={ws.metric}><strong>{metrics.applicants}</strong>Applicants</div>
        <div className={ws.metric}><strong>{metrics.reviewing}</strong>Reviewing</div>
        <div className={ws.metric}><strong>{metrics.interviewing}</strong>Interviews</div>
        <div className={ws.metric}><strong>{metrics.offers}</strong>Offers</div>
        <div className={ws.metric}><strong>{metrics.hires}</strong>Hires</div>
      </div>
      <div className={ws.campaignActions}>
        <Link to={`/portal/pipeline?jobId=${job.id}`} className={ws.btnPrimary}>Open pipeline</Link>
        <Link to={`/portal/applications?jobId=${job.id}`} className={ws.btnGhost}>Candidates</Link>
        {!readonly && onEdit && (
          <button type="button" className={ws.btnGhost} onClick={onEdit}>Edit</button>
        )}
        {!readonly && job.isActive && onArchive && (
          <button type="button" className={ws.btnDanger} disabled={archiving} onClick={onArchive}>Archive</button>
        )}
        <span className={job.isActive ? ws.badgeOk : ws.badgeMuted}>{job.isActive ? 'Active' : 'Paused'}</span>
      </div>
    </article>
  );
}
