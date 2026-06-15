import { IconChevronLeft } from '@/components/icons/Icons';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { CandidateTrustBadge } from '@/components/portal/CandidateTrustBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { ApplicationStatus, ApplicationStatusLabels } from '@/models/enums';
import type { PortalApplicantDetail } from '@/models/portalApplicant';
import styles from './PortalPage.module.css';

const PIPELINE_STATUSES = [
  ApplicationStatus.Interviewing,
  ApplicationStatus.OfferSent,
  ApplicationStatus.Hired,
] as const;

export function PortalApplicantPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [applicant, setApplicant] = useState<PortalApplicantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApplicant = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await portalApi.getApplicant(applicationId);
      setApplicant(detail);
    } catch {
      setApplicant(null);
      setError('Unable to load applicant details.');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadApplicant();
  }, [loadApplicant]);

  const handleStatusChange = async (status: ApplicationStatus) => {
    if (!applicationId || !applicant) return;
    setUpdating(true);
    setError(null);
    try {
      await portalApi.updateApplicationStatus(applicationId, { status });
      await loadApplicant();
    } catch {
      setError('Failed to update application status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleShortlist = async () => {
    if (!applicationId) return;
    setUpdating(true);
    setError(null);
    try {
      await portalApi.shortlistApplication(applicationId);
      await loadApplicant();
    } catch {
      setError('Failed to shortlist applicant.');
    } finally {
      setUpdating(false);
    }
  };

  const handleInvite = async () => {
    if (!applicationId) return;
    setUpdating(true);
    setError(null);
    try {
      await portalApi.inviteToInterview(applicationId);
      await loadApplicant();
    } catch {
      setError('Failed to invite applicant to interview.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!applicationId || !applicant?.hasResume) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = await portalApi.downloadApplicantResume(applicationId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = applicant.resumeFileName ?? 'resume.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download resume.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <p className={styles.status}>Loading applicant…</p>;
  if (!applicant) {
    return (
      <section className={styles.page}>
        <EmptyState
          illustration="applications"
          title="Applicant not found"
          description={error ?? 'This application may have been removed.'}
          actions={[
            { label: 'Try again', onClick: () => void loadApplicant(), primary: true },
            { label: 'Back to applications', to: '/portal/applications' },
          ]}
        />
      </section>
    );
  }

  const fullName = `${applicant.firstName} ${applicant.lastName}`.trim() || 'Applicant';
  const isClosed = applicant.status === ApplicationStatus.Rejected
    || applicant.status === ApplicationStatus.Withdrawn;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <Link to="/portal/applications" className={styles.btn}>
          <IconChevronLeft size={16} /> Applications
        </Link>
        <h1 className={styles.title}>{fullName}</h1>
        <CandidateTrustBadge
          level={applicant.candidateTrustLevel}
          signals={applicant.candidateTrustSignals}
        />
        <p className={styles.subtitle}>
          Application #{applicant.applicationNumber} · Applied for {applicant.jobTitle} on {new Date(applicant.appliedAt).toLocaleDateString()}
        </p>
      </header>

      {error && <p className={styles.formError}>{error}</p>}

      <article className={styles.card}>
        <div className={styles.applicantRow}>
          <UserAvatar
            profile={{
              firstName: applicant.firstName,
              lastName: applicant.lastName,
              email: applicant.email,
              profileImageUrl: applicant.profileImageUrl,
            }}
            size="lg"
          />
          <div>
            <h2 className={styles.cardTitle}>{fullName}</h2>
            {applicant.headline && <p className={styles.cardMeta}>{applicant.headline}</p>}
            <p className={styles.cardMeta}>
              {applicant.email}
              {applicant.phone ? ` · ${applicant.phone}` : ''}
              {applicant.location ? ` · ${applicant.location}` : ''}
            </p>
            <span className={styles.badge}>{ApplicationStatusLabels[applicant.status]}</span>
          </div>
        </div>

        {applicant.bio && <p className={`${styles.cardMeta} copyable-content`}>{applicant.bio}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            disabled={updating || isClosed || applicant.status === ApplicationStatus.UnderReview}
            onClick={() => void handleStatusChange(ApplicationStatus.UnderReview)}
          >
            Review
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={updating || isClosed || applicant.status === ApplicationStatus.Shortlisted}
            onClick={() => void handleShortlist()}
          >
            Shortlist
          </button>
          <button
            type="button"
            className={styles.btnAccent}
            disabled={updating || isClosed}
            onClick={() => void handleInvite()}
          >
            Invite to Interview
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={updating || isClosed}
            onClick={() => void handleStatusChange(ApplicationStatus.Rejected)}
          >
            Reject
          </button>
          {applicant.conversationId && (
            <Link to={`/portal/messages/${applicant.conversationId}`} className={styles.btn}>
              Open messages
            </Link>
          )}
          {applicant.hasResume && (
            <button
              type="button"
              className={styles.btn}
              disabled={downloading}
              onClick={() => void handleDownloadResume()}
            >
              {downloading ? 'Downloading…' : 'Download resume'}
            </button>
          )}
        </div>

        {!isClosed && (
          <div className={styles.actions}>
            {PIPELINE_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={applicant.status === status ? styles.btnAccent : styles.btn}
                disabled={updating || applicant.status === status}
                onClick={() => void handleStatusChange(status)}
              >
                {ApplicationStatusLabels[status]}
              </button>
            ))}
          </div>
        )}
      </article>

      {applicant.applicationHistory.length > 1 && (
        <article className={styles.card}>
          <h3 className={styles.cardTitle}>Application history</h3>
          <div className={styles.list}>
            {applicant.applicationHistory.map((entry) => (
              <div key={entry.applicationId} className={styles.cardMeta}>
                <strong>Application #{entry.applicationNumber}</strong>
                {' — '}
                {ApplicationStatusLabels[entry.status]}
                {' · '}
                {new Date(entry.appliedAt).toLocaleDateString()}
                {entry.applicationId === applicant.applicationId && ' (current)'}
              </div>
            ))}
          </div>
        </article>
      )}

      {applicant.skills.length > 0 && (
        <article className={styles.card}>
          <h3 className={styles.cardTitle}>Skills</h3>
          <ul className={styles.tagList}>
            {applicant.skills.map((skill) => (
              <li key={skill.id ?? skill.name} className={styles.tag}>
                {skill.name}{skill.level ? ` (${skill.level})` : ''}
              </li>
            ))}
          </ul>
        </article>
      )}

      {applicant.experiences.length > 0 && (
        <article className={styles.card}>
          <h3 className={styles.cardTitle}>Experience</h3>
          <div className={styles.list}>
            {applicant.experiences.map((exp) => (
              <div key={exp.id ?? `${exp.company}-${exp.title}`}>
                <strong>{exp.title}</strong> at {exp.company}
                {exp.description && <p className={styles.cardMeta}>{exp.description}</p>}
              </div>
            ))}
          </div>
        </article>
      )}

      {applicant.educations.length > 0 && (
        <article className={styles.card}>
          <h3 className={styles.cardTitle}>Education</h3>
          <div className={styles.list}>
            {applicant.educations.map((edu) => (
              <div key={edu.id ?? `${edu.institution}-${edu.degree}`}>
                <strong>{edu.degree}</strong> — {edu.institution}
                {edu.fieldOfStudy && <span className={styles.cardMeta}> ({edu.fieldOfStudy})</span>}
              </div>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}
