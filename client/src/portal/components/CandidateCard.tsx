import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { pipelineStageLabel } from '@/lib/employer/employerWorkspaceData';
import { candidateProfilePath, type HiringOrigin } from '@/lib/employer/hiringNavigation';
import { ApplicationStatusLabels } from '@/models/enums';
import type { PortalApplication } from '@/models/portal';
import { RecruiterMetaRow } from '@/portal/components/RecruiterMetaRow';
import ws from '@/portal/workspace.module.css';

interface CandidateCardProps {
  application: PortalApplication;
  compact?: boolean;
  profileFrom?: HiringOrigin;
  jobId?: string;
}

export function CandidateCard({ application, compact = false, profileFrom = 'pipeline', jobId }: CandidateCardProps) {
  const parts = application.applicantName.trim().split(/\s+/);
  const applied = new Date(application.appliedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className={[ws.candidateCard, ws.candidateCardInteractive].join(' ')}>
      <div className={ws.candidateTop}>
        <UserAvatar
          profile={{
            firstName: parts[0] ?? '',
            lastName: parts.slice(1).join(' '),
            email: application.applicantEmail,
            profileImageUrl: application.applicantProfileImageUrl,
          }}
          size={compact ? 'md' : 'lg'}
        />
        <div className={ws.candidateBody}>
          <h3 className={ws.candidateName}>{application.applicantName || 'Candidate'}</h3>
          <p className={ws.candidateSub}>{application.jobTitle}</p>
          {!compact && (
            <p className={ws.candidateMeta}>
              Applied {applied}
              {application.hasResume ? ' · Resume on file' : ''}
              {application.unreadMessageCount > 0 ? ` · ${application.unreadMessageCount} unread` : ''}
            </p>
          )}
          <RecruiterMetaRow application={application} compact={compact} />
        </div>
        <div className={ws.candidateBadges}>
          <span className={ws.badge}>{ApplicationStatusLabels[application.status]}</span>
          <span className={ws.badgeMuted}>{pipelineStageLabel(application)}</span>
        </div>
      </div>
      {!compact && (
      <div className={ws.candidateActions}>
        <Link to={candidateProfilePath(application.id, { from: profileFrom, jobId })} className={ws.btnPrimary}>View profile</Link>
        {application.unreadMessageCount > 0 && (
          <Link to="/portal/messages" className={ws.btnGhost}>Message</Link>
        )}
        <Link to={jobId ? `/portal/pipeline?jobId=${jobId}` : '/portal/pipeline'} className={ws.btnGhost}>Pipeline</Link>
      </div>
      )}
    </article>
  );
}
