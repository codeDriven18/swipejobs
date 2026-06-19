import { IconChevronLeft } from '@/components/icons/Icons';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { CandidateTrustBadge } from '@/components/portal/CandidateTrustBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserAvatar } from '@/components/profile/UserAvatar';
import ui from '@/components/employer/ui/employerUi.module.css';
import comp from '@/styles/employerComposition.module.css';
import { ApplicationStatus, ApplicationStatusLabels } from '@/models/enums';
import type { PortalApplicantDetail } from '@/models/portalApplicant';
import { formatJobSeekingStatus } from '@/lib/jobSeekingStatus';
import styles from './PortalApplicantPage.module.css';

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

  if (loading) return <p className={ui.statusText}>Loading candidate…</p>;
  if (!applicant) {
    return (
      <section className={ui.page}>
        <EmptyState
          illustration="applications"
          title="Candidate not found"
          description={error ?? 'This application may have been removed.'}
          actions={[
            { label: 'Try again', onClick: () => void loadApplicant(), primary: true },
            { label: 'Back to candidates', to: '/portal/applications' },
          ]}
        />
      </section>
    );
  }

  const fullName = `${applicant.firstName} ${applicant.lastName}`.trim() || 'Candidate';
  const isClosed = applicant.status === ApplicationStatus.Rejected
    || applicant.status === ApplicationStatus.Withdrawn;

  const hasProfileContent = applicant.bio
    || applicant.skills.length > 0
    || applicant.experiences.length > 0
    || applicant.educations.length > 0;

  return (
    <section className={ui.page}>
      <Link to="/portal/applications" className={styles.backLink}>
        <IconChevronLeft size={16} /> Candidates
      </Link>

      <article className={ui.profileHero}>
        <div className={styles.heroBanner} aria-hidden />
        <div className={ui.profileHeroBody}>
          <UserAvatar
            profile={{
              firstName: applicant.firstName,
              lastName: applicant.lastName,
              email: applicant.email,
              profileImageUrl: applicant.profileImageUrl,
            }}
            size="lg"
          />
          <div className={ui.profileHeroContent}>
            <h1 className={ui.profileName}>{fullName}</h1>
            {applicant.headline && <p className={ui.profileHeadline}>{applicant.headline}</p>}
            <div className={styles.heroMeta}>
              <CandidateTrustBadge level={applicant.candidateTrustLevel} signals={applicant.candidateTrustSignals} />
              <span className={ui.badge}>{ApplicationStatusLabels[applicant.status]}</span>
            </div>
            <p className={ui.profileHeadline}>
              {formatJobSeekingStatus(applicant.jobSeekingStatus)} · {applicant.jobTitle}
            </p>
            <div className={ui.profileActions}>
              <button type="button" className={ui.btnPrimary} disabled={updating || isClosed} onClick={() => void handleInvite()}>
                Invite to interview
              </button>
              {applicant.conversationId && (
                <Link to={`/portal/messages/${applicant.conversationId}`} className={ui.btnSecondary}>Message</Link>
              )}
              {applicant.hasResume && (
                <button type="button" className={ui.btnGhost} disabled={downloading} onClick={() => void handleDownloadResume()}>
                  {downloading ? 'Downloading…' : 'Resume'}
                </button>
              )}
              {!isClosed && (
                <details className={styles.stageMenu}>
                  <summary className={ui.btnGhost}>Move stage</summary>
                  <div className={styles.stageActions}>
                    <button type="button" className={ui.btnGhost} disabled={updating || applicant.status === ApplicationStatus.UnderReview} onClick={() => void handleStatusChange(ApplicationStatus.UnderReview)}>Review</button>
                    <button type="button" className={ui.btnGhost} disabled={updating || applicant.status === ApplicationStatus.Shortlisted} onClick={() => void handleShortlist()}>Shortlist</button>
                    <button type="button" className={ui.btnGhost} disabled={updating} onClick={() => void handleStatusChange(ApplicationStatus.Rejected)}>Reject</button>
                    {PIPELINE_STATUSES.map((status) => (
                      <button key={status} type="button" className={ui.btnGhost} disabled={updating || applicant.status === status} onClick={() => void handleStatusChange(status)}>
                        {ApplicationStatusLabels[status]}
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </article>

      {error && <p className={ui.formError} role="alert">{error}</p>}

      {hasProfileContent && (
        <article className={`${ui.profileSection} ${comp.profileBody}`}>
          {applicant.bio && (
            <section className={comp.profileBlock}>
              <h2 className={ui.profileSectionTitle}>About</h2>
              <p className={styles.bodyText}>{applicant.bio}</p>
            </section>
          )}

          {applicant.experiences.length > 0 && (
            <section className={comp.profileBlock}>
              <h2 className={ui.profileSectionTitle}>Experience</h2>
              <div className={styles.timeline}>
                {applicant.experiences.map((exp) => (
                  <div key={exp.id ?? `${exp.company}-${exp.title}`} className={styles.timelineItem}>
                    <strong>{exp.title}</strong>
                    <span className={styles.timelineMeta}> at {exp.company}</span>
                    {exp.description && <p className={styles.bodyText}>{exp.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {applicant.skills.length > 0 && (
            <section className={comp.profileBlock}>
              <h2 className={ui.profileSectionTitle}>Skills</h2>
              <ul className={styles.tagList}>
                {applicant.skills.map((skill) => (
                  <li key={skill.id ?? skill.name} className={styles.tag}>{skill.name}{skill.level ? ` · ${skill.level}` : ''}</li>
                ))}
              </ul>
            </section>
          )}

          {applicant.educations.length > 0 && (
            <section className={comp.profileBlock}>
              <h2 className={ui.profileSectionTitle}>Education</h2>
              <div className={styles.timeline}>
                {applicant.educations.map((edu) => (
                  <div key={edu.id ?? `${edu.institution}-${edu.degree}`} className={styles.timelineItem}>
                    <strong>{edu.degree}</strong>
                    <span className={styles.timelineMeta}> — {edu.institution}</span>
                    {edu.fieldOfStudy && <p className={styles.bodyText}>{edu.fieldOfStudy}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      )}

      {applicant.applicationHistory.length > 1 && (
        <details className={styles.historyDetails}>
          <summary>Previous applications ({applicant.applicationHistory.length - 1})</summary>
          <div className={styles.timeline}>
            {applicant.applicationHistory.map((entry) => (
              <div key={entry.applicationId} className={styles.timelineItem}>
                <strong>Application #{entry.applicationNumber}</strong>
                <span className={styles.timelineMeta}> — {ApplicationStatusLabels[entry.status]}</span>
                <p className={styles.bodyText}>
                  {new Date(entry.appliedAt).toLocaleDateString()}
                  {entry.applicationId === applicant.applicationId && ' (current)'}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
