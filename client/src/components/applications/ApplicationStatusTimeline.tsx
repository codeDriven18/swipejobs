import { ApplicationStatus, ApplicationStatusLabels } from '@/models/enums';
import type { ApplicationStatusHistoryEntry } from '@/models/application';
import { isMessagingUnlocked } from '@/lib/messagingHelpers';
import styles from './ApplicationStatusTimeline.module.css';

type TimelineKey = ApplicationStatus | 'chatUnlocked';

interface TimelineStep {
  key: TimelineKey;
  label: string;
}

const HIRING_TIMELINE: TimelineStep[] = [
  { key: ApplicationStatus.Applied, label: 'Applied' },
  { key: ApplicationStatus.UnderReview, label: 'Under Review' },
  { key: ApplicationStatus.InterviewInvited, label: 'Interview Invited' },
  { key: 'chatUnlocked', label: 'Chat Unlocked' },
  { key: ApplicationStatus.Interviewing, label: 'Interviewing' },
  { key: ApplicationStatus.OfferSent, label: 'Offer' },
  { key: ApplicationStatus.Hired, label: 'Hired' },
];

const STATUS_ORDER: Record<ApplicationStatus, number> = {
  [ApplicationStatus.Pending]: 0,
  [ApplicationStatus.Applied]: 0,
  [ApplicationStatus.UnderReview]: 1,
  [ApplicationStatus.Shortlisted]: 1,
  [ApplicationStatus.InterviewInvited]: 2,
  [ApplicationStatus.Interviewing]: 4,
  [ApplicationStatus.OfferSent]: 5,
  [ApplicationStatus.Hired]: 6,
  [ApplicationStatus.Rejected]: -1,
  [ApplicationStatus.Withdrawn]: -1,
};

interface ApplicationStatusTimelineProps {
  currentStatus: ApplicationStatus;
  statusHistory: ApplicationStatusHistoryEntry[];
  appliedAt: string;
}

function formatStepDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function timelineIndexForStatus(status: ApplicationStatus): number {
  if (status === ApplicationStatus.Shortlisted) return 1;
  if (isMessagingUnlocked(status) && status === ApplicationStatus.InterviewInvited) return 3;
  return STATUS_ORDER[status] ?? 0;
}

function resolveSteps(
  currentStatus: ApplicationStatus,
  statusHistory: ApplicationStatusHistoryEntry[],
  appliedAt: string,
): { label: string; date?: string; state: 'done' | 'current' | 'pending' | 'rejected' | 'withdrawn' }[] {
  const historyByStatus = new Map<ApplicationStatus, string>();
  for (const entry of [...statusHistory].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
  )) {
    historyByStatus.set(entry.status, entry.changedAt);
  }
  if (!historyByStatus.has(ApplicationStatus.Applied)) {
    historyByStatus.set(ApplicationStatus.Applied, appliedAt);
  }

  if (currentStatus === ApplicationStatus.Rejected) {
    return [
      { label: 'Applied', date: historyByStatus.get(ApplicationStatus.Applied), state: 'done' },
      {
        label: ApplicationStatusLabels[ApplicationStatus.UnderReview],
        date: historyByStatus.get(ApplicationStatus.UnderReview),
        state: historyByStatus.has(ApplicationStatus.UnderReview) ? 'done' : 'pending',
      },
      {
        label: ApplicationStatusLabels[ApplicationStatus.Rejected],
        date: historyByStatus.get(ApplicationStatus.Rejected),
        state: 'rejected',
      },
    ];
  }

  if (currentStatus === ApplicationStatus.Withdrawn) {
    return [
      { label: 'Applied', date: historyByStatus.get(ApplicationStatus.Applied), state: 'done' },
      {
        label: ApplicationStatusLabels[ApplicationStatus.Withdrawn],
        date: historyByStatus.get(ApplicationStatus.Withdrawn),
        state: 'withdrawn',
      },
    ];
  }

  const currentIndex = timelineIndexForStatus(currentStatus);

  return HIRING_TIMELINE.map((step, index) => {
    let state: 'done' | 'current' | 'pending';
    if (index < currentIndex) state = 'done';
    else if (index === currentIndex) state = 'current';
    else state = 'pending';

    const date = step.key === 'chatUnlocked'
      ? historyByStatus.get(ApplicationStatus.InterviewInvited)
      : historyByStatus.get(step.key as ApplicationStatus);

    return { label: step.label, date, state };
  });
}

export function ApplicationStatusTimeline({
  currentStatus,
  statusHistory,
  appliedAt,
}: ApplicationStatusTimelineProps) {
  const normalizedStatus = currentStatus === ApplicationStatus.Pending
    ? ApplicationStatus.Applied
    : currentStatus;
  const steps = resolveSteps(normalizedStatus, statusHistory, appliedAt);

  return (
    <ol className={styles.timeline} aria-label="Application status">
      {steps.map((step, index) => (
        <li
          key={`${step.label}-${index}`}
          className={`${styles.step} ${styles[step.state]}`}
        >
          <span className={styles.dot} aria-hidden />
          <div className={styles.stepBody}>
            <span className={styles.label}>{step.label}</span>
            {step.date && <span className={styles.date}>{formatStepDate(step.date)}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}
