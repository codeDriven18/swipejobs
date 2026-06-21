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

  const statItems = [
    { label: 'Applicants', value: metrics.applicants },
    { label: 'Reviewing', value: metrics.reviewing },
    { label: 'Interviews', value: metrics.interviewing },
    { label: 'Offers', value: metrics.offers },
    { label: 'Hires', value: metrics.hires },
  ];

  return (
    <article className={ws.campaignCard}>
      <div className={ws.campaignCardHead}>
        <div>
          <h3 className={ws.campaignTitle}>{job.title}</h3>
          <p className={ws.campaignMeta}>
            {job.city ?? job.location ?? 'No location'} · {job.isRemote ? 'Remote' : 'On-site'} · Posted {posted}
          </p>
        </div>
        <span className={job.isActive ? ws.badgeOk : ws.badgeMuted}>{job.isActive ? 'Active' : 'Paused'}</span>
      </div>
      <div className={ws.metricsRow}>
        {statItems.map((item) => (
          <div key={item.label} className={ws.metric}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className={ws.campaignActions}>
        <Link to={`/portal/pipeline?jobId=${job.id}`} className={ws.btnPrimary}>Open pipeline</Link>
        <Link to={`/portal/pipeline?view=list&jobId=${job.id}`} className={ws.btnGhost}>View candidates</Link>
        {!readonly && onEdit && (
          <button type="button" className={ws.btnGhost} onClick={onEdit}>Edit</button>
        )}
        {!readonly && job.isActive && onArchive && (
          <button type="button" className={ws.btnDanger} disabled={archiving} onClick={onArchive}>Archive</button>
        )}
      </div>
    </article>
  );
}
