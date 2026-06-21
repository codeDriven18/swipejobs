import { ApplicationStatus, ApplicationStatusLabels } from '@/models/enums';
import type { PortalApplicantDetail } from '@/models/portalApplicant';
import ws from '@/portal/workspace.module.css';

const FUNNEL: { label: string; statuses: ApplicationStatus[] }[] = [
  { label: 'Applied', statuses: [ApplicationStatus.Pending, ApplicationStatus.Applied] },
  { label: 'Review', statuses: [ApplicationStatus.UnderReview, ApplicationStatus.Shortlisted] },
  { label: 'Interview', statuses: [ApplicationStatus.InterviewInvited, ApplicationStatus.Interviewing] },
  { label: 'Offer', statuses: [ApplicationStatus.OfferSent, ApplicationStatus.Hired] },
];

function stepIndexForStatus(status: ApplicationStatus): number {
  if (status === ApplicationStatus.Rejected || status === ApplicationStatus.Withdrawn) return -1;
  const idx = FUNNEL.findIndex((step) => step.statuses.includes(status));
  return idx >= 0 ? idx : 0;
}

interface CandidateHiringProgressProps {
  applicant: PortalApplicantDetail;
}

export function CandidateHiringProgress({ applicant }: CandidateHiringProgressProps) {
  const isClosed = applicant.status === ApplicationStatus.Rejected
    || applicant.status === ApplicationStatus.Withdrawn;
  const activeIndex = stepIndexForStatus(applicant.status);

  if (isClosed) {
    return (
      <div className={ws.candidateProgress} role="status">
        <p className={ws.candidateProgressClosed}>
          {ApplicationStatusLabels[applicant.status]}
          {applicant.rejectionReason ? ` — ${applicant.rejectionReason}` : ''}
        </p>
      </div>
    );
  }

  return (
    <nav className={ws.candidateProgress} aria-label="Hiring progress">
      {FUNNEL.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <div
            key={step.label}
            className={[
              ws.candidateProgressStep,
              done ? ws.candidateProgressDone : '',
              active ? ws.candidateProgressActive : '',
            ].filter(Boolean).join(' ')}
          >
            <span className={ws.candidateProgressDot}>{done ? '✓' : index + 1}</span>
            <span className={ws.candidateProgressLabel}>{step.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
