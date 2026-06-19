import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/profile/UserAvatar';
import ui from '@/components/employer/ui/employerUi.module.css';
import { pipelineStageLabel } from '@/lib/employer/employerWorkspaceData';
import { ApplicationStatusLabels } from '@/models/enums';
import type { PortalApplication } from '@/models/portal';

interface CandidateEntityCardProps {
  application: PortalApplication;
  compact?: boolean;
}

export function CandidateEntityCard({ application, compact = false }: CandidateEntityCardProps) {
  const parts = application.applicantName.trim().split(/\s+/);
  const applied = new Date(application.appliedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className={ui.candidateCard}>
      <div className={ui.candidateRow}>
        <UserAvatar
          profile={{
            firstName: parts[0] ?? '',
            lastName: parts.slice(1).join(' '),
            email: application.applicantEmail,
            profileImageUrl: application.applicantProfileImageUrl,
          }}
          size={compact ? 'md' : 'lg'}
        />
        <div className={ui.candidateIdentity}>
          <h2 className={ui.candidateName}>{application.applicantName || 'Candidate'}</h2>
          <p className={ui.candidateSub}>{application.jobTitle}</p>
          {!compact && (
            <p className={ui.candidateDetail}>
              Applied {applied}
              {application.hasResume ? ' · Resume on file' : ''}
              {application.unreadMessageCount > 0 ? ` · ${application.unreadMessageCount} unread` : ''}
            </p>
          )}
        </div>
        <div className={ui.candidateActions} style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
          <span className={ui.badge}>{ApplicationStatusLabels[application.status]}</span>
          <span className={ui.badgeMuted}>{pipelineStageLabel(application)}</span>
        </div>
      </div>
      <div className={ui.candidateActions}>
        <Link to={`/portal/applications/${application.id}`} className={ui.btnPrimary}>View profile</Link>
        {application.unreadMessageCount > 0 && (
          <Link to="/portal/messages" className={ui.btnSecondary}>Message</Link>
        )}
        <Link to="/portal/pipeline" className={ui.btnGhost}>Move stage</Link>
      </div>
    </article>
  );
}
