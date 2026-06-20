import { IconChevronLeft } from '@/components/icons/Icons';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { ApiError } from '@/api/client';
import { CandidateTrustBadge } from '@/components/portal/CandidateTrustBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { PageFrame, Panel } from '@/portal/components/PageFrame';
import ws from '@/portal/workspace.module.css';
import { ApplicationStatus, ApplicationStatusLabels } from '@/models/enums';
import type { PortalApplicantDetail } from '@/models/portalApplicant';
import { formatJobSeekingStatus } from '@/lib/jobSeekingStatus';

const PIPELINE_STATUSES = [
  ApplicationStatus.Interviewing,
  ApplicationStatus.OfferSent,
  ApplicationStatus.Hired,
] as const;

/** Surfaces the actual backend error so download failures are diagnosable. */
function resolveResumeDownloadError(err: unknown): string {
  if (err instanceof ApiError) {
    let serverMessage: string | undefined;
    if (typeof err.body === 'string') {
      try {
        serverMessage = (JSON.parse(err.body) as { error?: string }).error;
      } catch {
        serverMessage = err.body || undefined;
      }
    }
    const detail = serverMessage ?? err.message;
    return `Couldn't download resume (${err.status}): ${detail}`;
  }
  if (err instanceof Error && err.message) {
    return `Couldn't download resume: ${err.message}`;
  }
  return 'Couldn\'t download resume. Please try again.';
}

export function CandidateProfilePage() {
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
    } catch (err) {
      setError(resolveResumeDownloadError(err));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <p className={ws.statusText}>Loading candidate…</p>;

  if (!applicant) {
    return (
      <PageFrame>
        <EmptyState
          illustration="applications"
          title="Candidate not found"
          description={error ?? 'This application may have been removed.'}
          actions={[
            { label: 'Try again', onClick: () => void loadApplicant(), primary: true },
            { label: 'Back to candidates', to: '/portal/applications' },
          ]}
        />
      </PageFrame>
    );
  }

  const fullName = `${applicant.firstName} ${applicant.lastName}`.trim() || 'Candidate';
  const isClosed = applicant.status === ApplicationStatus.Rejected
    || applicant.status === ApplicationStatus.Withdrawn;
  const appliedDate = new Date(applicant.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <PageFrame>
      <Link to="/portal/applications" className={ws.backLink}>
        <IconChevronLeft size={16} /> Candidates
      </Link>

      <div className={ws.profileLayout}>
        <div className={ws.stack}>
          <Panel>
            <div className={ws.profileHeaderRow}>
              <UserAvatar
                profile={{
                  firstName: applicant.firstName,
                  lastName: applicant.lastName,
                  email: applicant.email,
                  profileImageUrl: applicant.profileImageUrl,
                }}
                size="lg"
              />
              <div className={ws.profileHeaderBody}>
                <h2 className={ws.profileName}>{fullName}</h2>
                {applicant.headline && <p className={ws.profileHeadline}>{applicant.headline}</p>}
                <CandidateTrustBadge level={applicant.candidateTrustLevel} signals={applicant.candidateTrustSignals} />
                <p className={ws.profileHeadline}>
                  {formatJobSeekingStatus(applicant.jobSeekingStatus)}
                  {applicant.location ? ` · ${applicant.location}` : ''}
                </p>
                <p className={ws.profileHeadline}>{applicant.email}{applicant.phone ? ` · ${applicant.phone}` : ''}</p>
              </div>
            </div>
          </Panel>

          {error && <p className={ws.formError} role="alert">{error}</p>}

          <Panel>
            {applicant.bio && (
              <section className={ws.profileBlock}>
                <h3 className={ws.profileSectionTitle}>About</h3>
                <p className={ws.bodyText}>{applicant.bio}</p>
              </section>
            )}

            {applicant.experiences.length > 0 && (
              <section className={ws.profileBlock}>
                <h3 className={ws.profileSectionTitle}>Experience</h3>
                <div className={ws.timeline}>
                  {applicant.experiences.map((exp) => (
                    <div key={exp.id ?? `${exp.company}-${exp.title}`} className={ws.timelineItem}>
                      <strong>{exp.title}</strong>
                      <span className={ws.candidateSub}> at {exp.company}</span>
                      {exp.description && <p className={ws.bodyText}>{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {applicant.skills.length > 0 && (
              <section className={ws.profileBlock}>
                <h3 className={ws.profileSectionTitle}>Skills</h3>
                <ul className={ws.tagList}>
                  {applicant.skills.map((skill) => (
                    <li key={skill.id ?? skill.name} className={ws.tag}>{skill.name}{skill.level ? ` · ${skill.level}` : ''}</li>
                  ))}
                </ul>
              </section>
            )}

            {applicant.educations.length > 0 && (
              <section className={ws.profileBlock}>
                <h3 className={ws.profileSectionTitle}>Education</h3>
                <div className={ws.timeline}>
                  {applicant.educations.map((edu) => (
                    <div key={edu.id ?? `${edu.institution}-${edu.degree}`} className={ws.timelineItem}>
                      <strong>{edu.degree}</strong>
                      <span className={ws.candidateSub}> — {edu.institution}</span>
                      {edu.fieldOfStudy && <p className={ws.bodyText}>{edu.fieldOfStudy}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {applicant.hasResume && (
              <section className={ws.profileBlock}>
                <h3 className={ws.profileSectionTitle}>Resume</h3>
                <button type="button" className={ws.btnGhost} disabled={downloading} onClick={() => void handleDownloadResume()}>
                  {downloading ? 'Downloading…' : `Download ${applicant.resumeFileName ?? 'resume'}`}
                </button>
              </section>
            )}
          </Panel>

          {applicant.statusHistory.length > 0 && (
            <Panel title="Activity">
              <div className={ws.timeline}>
                {[...applicant.statusHistory].reverse().map((entry, index) => (
                  <div key={`${entry.status}-${entry.changedAt}-${index}`} className={ws.timelineItem}>
                    <strong>{ApplicationStatusLabels[entry.status]}</strong>
                    <p className={ws.bodyText}>{new Date(entry.changedAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <aside className={ws.rail}>
          <div>
            <p className={ws.railTitle}>Current stage</p>
            <span className={ws.badge}>{ApplicationStatusLabels[applicant.status]}</span>
          </div>
          <div>
            <p className={ws.railTitle}>Applying for</p>
            <p className={ws.bodyText}>{applicant.jobTitle}</p>
            <p className={ws.candidateSub}>Applied {appliedDate}</p>
          </div>

          <div className={ws.railActions}>
            <button type="button" className={ws.btnPrimary} disabled={updating || isClosed} onClick={() => void handleInvite()}>
              Invite to interview
            </button>
            {applicant.conversationId && (
              <Link to={`/portal/messages/${applicant.conversationId}`} className={ws.btnGhost}>Message</Link>
            )}
            <Link to="/portal/pipeline" className={ws.btnGhost}>Open pipeline</Link>
          </div>

          {!isClosed && (
            <div>
              <p className={ws.railTitle}>Move stage</p>
              <div className={ws.railActions}>
                <button type="button" className={ws.btnGhost} disabled={updating || applicant.status === ApplicationStatus.UnderReview} onClick={() => void handleStatusChange(ApplicationStatus.UnderReview)}>Review</button>
                <button type="button" className={ws.btnGhost} disabled={updating || applicant.status === ApplicationStatus.Shortlisted} onClick={() => void handleShortlist()}>Shortlist</button>
                {PIPELINE_STATUSES.map((status) => (
                  <button key={status} type="button" className={ws.btnGhost} disabled={updating || applicant.status === status} onClick={() => void handleStatusChange(status)}>
                    {ApplicationStatusLabels[status]}
                  </button>
                ))}
                <button type="button" className={ws.btnDanger} disabled={updating} onClick={() => void handleStatusChange(ApplicationStatus.Rejected)}>Reject</button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </PageFrame>
  );
}
