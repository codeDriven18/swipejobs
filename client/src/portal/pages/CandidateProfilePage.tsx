import { IconChevronLeft, IconChevronRight, IconFileText } from '@/components/icons/Icons';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageFrame } from '@/portal/components/PageFrame';
import { InterviewScheduler } from '@/portal/components/InterviewScheduler';
import { CandidateRecruiterPanel } from '@/portal/components/CandidateRecruiterPanel';
import { CandidateProfileHero } from '@/portal/components/CandidateProfileHero';
import { CandidateHiringProgress } from '@/portal/components/CandidateHiringProgress';
import { RejectCandidateDialog } from '@/portal/components/RejectCandidateDialog';
import {
  formatEducationRange,
  formatExperienceRange,
  formatResumeSize,
  getApplicantCompleteness,
  getApplicantProofLinks,
} from '@/lib/candidateProfileMeta';
import ws from '@/portal/workspace.module.css';
import { ApplicationStatus, ApplicationStatusLabels } from '@/models/enums';
import type { PortalApplicantDetail } from '@/models/portalApplicant';

const PIPELINE_STATUSES = [
  ApplicationStatus.Interviewing,
  ApplicationStatus.OfferSent,
  ApplicationStatus.Hired,
] as const;

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
  const [evalBusy, setEvalBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

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

  const handleStatusChange = async (status: ApplicationStatus, rejectionReason?: string) => {
    if (!applicationId || !applicant) return;
    setUpdating(true);
    setError(null);
    try {
      await portalApi.updateApplicationStatus(applicationId, { status, rejectionReason });
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

  const runEvalAction = async (action: () => Promise<unknown>) => {
    if (!applicationId) return;
    setEvalBusy(true);
    try {
      await action();
      await loadApplicant();
    } catch {
      setError('Failed to update evaluation.');
    } finally {
      setEvalBusy(false);
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

  const isClosed = applicant.status === ApplicationStatus.Rejected
    || applicant.status === ApplicationStatus.Withdrawn;
  const appliedDate = new Date(applicant.appliedAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const completeness = getApplicantCompleteness(applicant);
  const proofLinks = getApplicantProofLinks(applicant);
  const resumeSize = formatResumeSize(applicant.resumeFileSize);

  return (
    <PageFrame>
      <Link to="/portal/applications" className={ws.backLink}>
        <IconChevronLeft size={16} /> Candidates
      </Link>

      <CandidateProfileHero
        applicant={applicant}
        ratingBusy={evalBusy}
        onRatingChange={(rating) => void runEvalAction(() => portalApi.setRecruiterRating(applicant.applicationId, rating))}
        onFavoriteToggle={() => void runEvalAction(() => portalApi.setFavorite(applicant.applicationId, !applicant.isFavorite))}
      />

      <CandidateHiringProgress applicant={applicant} />

      {error && <p className={ws.formError} role="alert">{error}</p>}

      <div className={ws.candidateProfileGrid}>
        <div className={ws.candidateProfileMain}>
          {applicant.bio && (
            <section className={ws.candidateSection}>
              <h2 className={ws.candidateSectionTitle}>About</h2>
              <p className={ws.candidateSectionBody}>{applicant.bio}</p>
            </section>
          )}

          {applicant.experiences.length > 0 && (
            <section className={ws.candidateSection}>
              <h2 className={ws.candidateSectionTitle}>Experience</h2>
              <ol className={ws.candidateTimeline}>
                {applicant.experiences.map((exp) => (
                  <li key={exp.id ?? `${exp.company}-${exp.title}`} className={ws.candidateTimelineItem}>
                    <div className={ws.candidateTimelineMarker} aria-hidden />
                    <div className={ws.candidateTimelineContent}>
                      <div className={ws.candidateTimelineHead}>
                        <strong>{exp.title}</strong>
                        <span className={ws.candidateTimelineDates}>{formatExperienceRange(exp)}</span>
                      </div>
                      <p className={ws.candidateTimelineCompany}>{exp.company}</p>
                      {exp.description && <p className={ws.candidateSectionBody}>{exp.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {applicant.educations.length > 0 && (
            <section className={ws.candidateSection}>
              <h2 className={ws.candidateSectionTitle}>Education</h2>
              <ol className={ws.candidateTimeline}>
                {applicant.educations.map((edu) => (
                  <li key={edu.id ?? `${edu.institution}-${edu.degree}`} className={ws.candidateTimelineItem}>
                    <div className={ws.candidateTimelineMarker} aria-hidden />
                    <div className={ws.candidateTimelineContent}>
                      <div className={ws.candidateTimelineHead}>
                        <strong>{edu.degree}</strong>
                        {formatEducationRange(edu) && (
                          <span className={ws.candidateTimelineDates}>{formatEducationRange(edu)}</span>
                        )}
                      </div>
                      <p className={ws.candidateTimelineCompany}>{edu.institution}</p>
                      {edu.fieldOfStudy && <p className={ws.candidateSectionBody}>{edu.fieldOfStudy}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {applicant.skills.length > 0 && (
            <section className={ws.candidateSection}>
              <h2 className={ws.candidateSectionTitle}>Skills</h2>
              <ul className={ws.candidateSkillGrid}>
                {applicant.skills.map((skill) => (
                  <li key={skill.id ?? skill.name} className={ws.candidateSkillPill}>
                    {skill.name}
                    {skill.level ? <span className={ws.candidateSkillLevel}>{skill.level}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {proofLinks.length > 0 && (
            <section className={ws.candidateSection}>
              <h2 className={ws.candidateSectionTitle}>Proof of work</h2>
              <div className={ws.candidateProofCards}>
                {proofLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={ws.candidateProofCard}
                  >
                    <span className={ws.candidateProofCardLabel}>{link.label}</span>
                    <span className={ws.candidateProofCardUrl}>{link.url.replace(/^https?:\/\//, '')}</span>
                    <IconChevronRight size={16} />
                  </a>
                ))}
              </div>
            </section>
          )}

          {applicant.hasResume && (
            <section className={ws.candidateSection}>
              <h2 className={ws.candidateSectionTitle}>Resume</h2>
              <div className={ws.candidateResumeCard}>
                <div className={ws.candidateResumeIcon} aria-hidden>
                  <IconFileText size={22} />
                </div>
                <div className={ws.candidateResumeInfo}>
                  <strong>{applicant.resumeFileName ?? 'Resume'}</strong>
                  <span className={ws.candidateSub}>
                    {[resumeSize, applicant.resumeUploadedAt
                      ? `Uploaded ${new Date(applicant.resumeUploadedAt).toLocaleDateString()}`
                      : null].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <button
                  type="button"
                  className={ws.btnPrimary}
                  disabled={downloading}
                  onClick={() => void handleDownloadResume()}
                >
                  {downloading ? 'Downloading…' : 'Download'}
                </button>
              </div>
            </section>
          )}

          <section className={ws.candidateSection}>
            <h2 className={ws.candidateSectionTitle}>Contact</h2>
            <dl className={ws.candidateContactList}>
              <div><dt>Email</dt><dd>{applicant.email}</dd></div>
              {applicant.phone && <div><dt>Phone</dt><dd>{applicant.phone}</dd></div>}
              {applicant.location && <div><dt>Location</dt><dd>{applicant.location}</dd></div>}
            </dl>
          </section>

          {applicant.applicationHistory.length > 1 && (
            <section className={ws.candidateSection}>
              <h2 className={ws.candidateSectionTitle}>Application history</h2>
              <ul className={ws.candidateHistoryList}>
                {applicant.applicationHistory.map((entry) => (
                  <li key={entry.applicationId}>
                    <span>#{entry.applicationNumber}</span>
                    <span>{ApplicationStatusLabels[entry.status]}</span>
                    <span>{new Date(entry.appliedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className={ws.candidateWorkspace}>
          <div className={ws.candidateWorkspaceBlock}>
            <p className={ws.railTitle}>This application</p>
            <p className={ws.candidateWorkspaceJob}>{applicant.jobTitle}</p>
            <p className={ws.candidateSub}>Applied {appliedDate}</p>
            <span className={ws.badgeOk}>{ApplicationStatusLabels[applicant.status]}</span>
          </div>

          {!isClosed && (
            <div className={ws.candidateWorkspaceBlock}>
              <p className={ws.railTitle}>Quick actions</p>
              <div className={ws.railActions}>
                <button type="button" className={ws.btnPrimary} disabled={updating} onClick={() => void handleInvite()}>
                  Invite to interview
                </button>
                {applicant.conversationId && (
                  <Link to={`/portal/messages/${applicant.conversationId}`} className={ws.btnGhost}>Message</Link>
                )}
                <Link to={`/portal/pipeline?jobId=${applicant.jobId}`} className={ws.btnGhost}>Open pipeline</Link>
              </div>
            </div>
          )}

          {!isClosed && (
            <div className={ws.candidateWorkspaceBlock}>
              <p className={ws.railTitle}>Interview</p>
              {applicant.interviewScheduledAtUtc ? (
                <div className={ws.interviewCallout}>
                  <span className={ws.interviewCalloutTime}>
                    {new Date(applicant.interviewScheduledAtUtc).toLocaleString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </span>
                  {applicant.interviewLocation && (
                    <span className={ws.interviewCalloutMeta}>{applicant.interviewLocation}</span>
                  )}
                  {applicant.interviewNotes && (
                    <span className={ws.interviewCalloutMeta}>{applicant.interviewNotes}</span>
                  )}
                </div>
              ) : (
                <p className={ws.candidateSub}>No interview scheduled yet.</p>
              )}
              {schedulerOpen ? (
                <InterviewScheduler
                  applicationId={applicationId!}
                  initialDate={applicant.interviewScheduledAtUtc}
                  initialLocation={applicant.interviewLocation}
                  initialNotes={applicant.interviewNotes}
                  onScheduled={() => {
                    setSchedulerOpen(false);
                    void loadApplicant();
                  }}
                  onCancel={() => setSchedulerOpen(false)}
                />
              ) : (
                <button type="button" className={ws.btnGhost} onClick={() => setSchedulerOpen(true)}>
                  {applicant.interviewScheduledAtUtc ? 'Reschedule' : 'Schedule interview'}
                </button>
              )}
            </div>
          )}

          {!isClosed && (
            <div className={ws.candidateWorkspaceBlock}>
              <p className={ws.railTitle}>Move stage</p>
              <div className={ws.candidateStageGrid}>
                <button type="button" className={ws.btnGhost} disabled={updating || applicant.status === ApplicationStatus.UnderReview} onClick={() => void handleStatusChange(ApplicationStatus.UnderReview)}>Review</button>
                <button type="button" className={ws.btnGhost} disabled={updating || applicant.status === ApplicationStatus.Shortlisted} onClick={() => void handleShortlist()}>Shortlist</button>
                {PIPELINE_STATUSES.map((status) => (
                  <button key={status} type="button" className={ws.btnGhost} disabled={updating || applicant.status === status} onClick={() => void handleStatusChange(status)}>
                    {ApplicationStatusLabels[status]}
                  </button>
                ))}
                <button type="button" className={ws.btnDanger} disabled={updating} onClick={() => setRejectOpen(true)}>Reject</button>
              </div>
            </div>
          )}

          <div className={ws.candidateWorkspaceBlock}>
            <p className={ws.railTitle}>Profile completeness</p>
            <div className={ws.campaignReadinessBar} aria-hidden>
              <span className={ws.campaignReadinessFill} style={{ width: `${completeness.score}%` }} />
            </div>
            <ul className={ws.campaignChecklist}>
              {completeness.items.map((item) => (
                <li key={item.label} className={item.done ? ws.campaignCheckDone : ws.campaignCheckPending}>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className={ws.candidateWorkspaceBlock}>
            <p className={ws.railTitle}>Recruiter workspace</p>
            <CandidateRecruiterPanel applicant={applicant} onUpdated={() => void loadApplicant()} hideEvaluation />
          </div>
        </aside>
      </div>

      <RejectCandidateDialog
        open={rejectOpen}
        busy={updating}
        onCancel={() => setRejectOpen(false)}
        onConfirm={(reason) => {
          setRejectOpen(false);
          void handleStatusChange(ApplicationStatus.Rejected, reason);
        }}
      />
    </PageFrame>
  );
}
