import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { ApplicationStatusLabels } from '@/models/enums';
import type { PortalApplicantDetail } from '@/models/portalApplicant';
import { RecruiterStarRating } from '@/portal/components/RecruiterStarRating';
import { candidateProfilePath } from '@/lib/employer/hiringNavigation';
import ws from '@/portal/workspace.module.css';

interface ConversationContextPanelProps {
  applicationId: string;
  onUpdated?: () => void;
}

function formatInterview(when?: string, location?: string) {
  if (!when) return null;
  const date = new Date(when).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return location ? `${date} · ${location}` : date;
}

export function ConversationContextPanel({ applicationId, onUpdated }: ConversationContextPanelProps) {
  const [applicant, setApplicant] = useState<PortalApplicantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await portalApi.getApplicant(applicationId);
      setApplicant(detail);
    } catch {
      setApplicant(null);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRating = async (rating: number | null) => {
    await portalApi.setRecruiterRating(applicationId, rating);
    await load();
    onUpdated?.();
  };

  const handleResume = async () => {
    if (!applicant?.hasResume) return;
    setDownloading(true);
    try {
      const blob = await portalApi.downloadApplicantResume(applicationId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = applicant.resumeFileName ?? 'resume.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <aside className={ws.msgContext} aria-label="Candidate context">
        <div className={ws.msgContextSkeleton} aria-busy="true">
          <span className={ws.msgContextSkeletonAvatar} />
          <span className={ws.msgContextSkeletonLine} />
          <span className={ws.msgContextSkeletonLineShort} />
        </div>
      </aside>
    );
  }

  if (!applicant) {
    return (
      <aside className={ws.msgContext} aria-label="Candidate context">
        <p className={ws.msgContextEmpty}>Could not load candidate details.</p>
        <Link to={candidateProfilePath(applicationId, { from: 'inbox' })} className={ws.btnGhost}>Open profile</Link>
      </aside>
    );
  }

  const name = `${applicant.firstName} ${applicant.lastName}`.trim();
  const interview = formatInterview(applicant.interviewScheduledAtUtc, applicant.interviewLocation);
  const tags = applicant.recruiterTags ?? [];

  return (
    <aside className={ws.msgContext} aria-label="Candidate context">
      <div className={ws.msgContextProfile}>
        <UserAvatar
          profile={{
            firstName: applicant.firstName,
            lastName: applicant.lastName,
            email: applicant.email,
            profileImageUrl: applicant.profileImageUrl,
          }}
          size="md"
        />
        <div className={ws.msgContextIdentity}>
          <strong>{name || 'Candidate'}</strong>
          <span className={ws.msgContextSub}>{applicant.jobTitle}</span>
          {applicant.headline && <span className={ws.msgContextMuted}>{applicant.headline}</span>}
        </div>
      </div>

      <dl className={ws.msgContextFacts}>
        <div>
          <dt>Stage</dt>
          <dd><span className={ws.msgContextStage}>{ApplicationStatusLabels[applicant.status]}</span></dd>
        </div>
        {interview && (
          <div>
            <dt>Interview</dt>
            <dd>{interview}</dd>
          </div>
        )}
        {applicant.location && (
          <div>
            <dt>Location</dt>
            <dd>{applicant.location}</dd>
          </div>
        )}
      </dl>

      <div className={ws.msgContextBlock}>
        <p className={ws.msgContextLabel}>Rating</p>
        <RecruiterStarRating
          value={applicant.recruiterRating}
          onChange={(rating) => void handleRating(rating)}
        />
      </div>

      {tags.length > 0 && (
        <div className={ws.msgContextBlock}>
          <p className={ws.msgContextLabel}>Tags</p>
          <div className={ws.msgContextTags}>
            {tags.map((tag) => (
              <span key={tag.id} className={ws.recruiterTagPill}>{tag.name}</span>
            ))}
          </div>
        </div>
      )}

      <div className={ws.msgContextActions}>
        {applicant.hasResume && (
          <button
            type="button"
            className={ws.btnGhost}
            disabled={downloading}
            onClick={() => void handleResume()}
          >
            {downloading ? 'Downloading…' : 'Download resume'}
          </button>
        )}
        <Link to={candidateProfilePath(applicationId, { from: 'inbox' })} className={ws.btnPrimary}>
          Full profile
        </Link>
      </div>
    </aside>
  );
}
