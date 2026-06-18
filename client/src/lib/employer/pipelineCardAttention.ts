import { InterviewPhase } from '@/models/enums';
import type { PortalApplication } from '@/models/portal';

export type PipelineCardAttention = 'unread' | 'recent' | 'interview';

const RECENT_DAYS = 3;
const UPCOMING_INTERVIEW_DAYS = 7;

export function getPipelineCardAttention(application: PortalApplication): PipelineCardAttention[] {
  const flags: PipelineCardAttention[] = [];

  if (application.unreadMessageCount > 0) {
    flags.push('unread');
  }

  const appliedAt = new Date(application.appliedAt);
  const daysSinceApplied = (Date.now() - appliedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceApplied <= RECENT_DAYS && application.pipelineStage <= 1) {
    flags.push('recent');
  }

  if (application.interviewScheduledAtUtc) {
    const interviewAt = new Date(application.interviewScheduledAtUtc);
    const daysUntil = (interviewAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil >= 0 && daysUntil <= UPCOMING_INTERVIEW_DAYS) {
      flags.push('interview');
    }
  } else if (
    application.interviewPhase === InterviewPhase.Scheduled
    || application.interviewPhase === InterviewPhase.Requested
  ) {
    flags.push('interview');
  }

  return flags;
}

export function formatAppliedDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
