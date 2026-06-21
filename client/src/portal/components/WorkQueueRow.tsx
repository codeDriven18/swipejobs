import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { pipelineStageLabel } from '@/lib/employer/employerWorkspaceData';
import { candidateProfilePath, type HiringOrigin } from '@/lib/employer/hiringNavigation';
import type { PortalApplication } from '@/models/portal';
import type { ConversationSummary } from '@/models/messaging';
import type { PortalJob } from '@/models/portal';
import ws from '@/portal/workspace.module.css';

interface ApplicantWorkRowProps {
  application: PortalApplication;
  from?: HiringOrigin;
  actionLabel?: string;
}

export function ApplicantWorkRow({ application, from, actionLabel = 'Review' }: ApplicantWorkRowProps) {
  const parts = application.applicantName.trim().split(/\s+/);
  const applied = new Date(application.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const interviewAt = application.interviewScheduledAtUtc
    ? new Date(application.interviewScheduledAtUtc).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : null;

  return (
    <Link
      to={candidateProfilePath(application.id, { from, jobId: application.jobId })}
      className={ws.workRow}
    >
      <UserAvatar
        profile={{
          firstName: parts[0] ?? '',
          lastName: parts.slice(1).join(' '),
          email: application.applicantEmail,
          profileImageUrl: application.applicantProfileImageUrl,
        }}
        size="sm"
      />
      <div className={ws.workRowBody}>
        <span className={ws.workRowTitle}>{application.applicantName || 'Candidate'}</span>
        <span className={ws.workRowMeta}>
          {interviewAt ? `${application.jobTitle} · Interview ${interviewAt}` : `${application.jobTitle} · Applied ${applied}`}
        </span>
      </div>
      <span className={ws.workRowAction}>{actionLabel}</span>
      <span className={ws.badgeMuted}>{pipelineStageLabel(application)}</span>
    </Link>
  );
}

interface ConversationWorkRowProps {
  conversation: ConversationSummary;
  actionLabel?: string;
}

export function ConversationWorkRow({ conversation, actionLabel = 'Reply' }: ConversationWorkRowProps) {
  return (
    <Link to={`/portal/messages/${conversation.id}`} className={ws.workRow}>
      <div className={ws.workRowBody}>
        <span className={ws.workRowTitle}>{conversation.candidateName}</span>
        <span className={ws.workRowMeta}>{conversation.jobTitle}</span>
      </div>
      <span className={ws.workRowAction}>{actionLabel}</span>
      {conversation.unreadCount > 0 && <span className={ws.badge}>{conversation.unreadCount}</span>}
    </Link>
  );
}

export function RoleWorkRow({ job, applicantCount }: { job: PortalJob; applicantCount: number }) {
  return (
    <Link to={`/portal/pipeline?jobId=${job.id}`} className={ws.workRow}>
      <div className={ws.workRowBody}>
        <span className={ws.workRowTitle}>{job.title}</span>
        <span className={ws.workRowMeta}>
          {job.city ?? job.location ?? 'No location'} · {applicantCount} applicants
        </span>
      </div>
      <span className={ws.badgeOk}>Active</span>
    </Link>
  );
}
