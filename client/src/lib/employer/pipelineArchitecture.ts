import { ApplicationStatus, InterviewPhase, PipelineStage } from '@/models/enums';

export interface PipelineColumnDefinition {
  id: PipelineStage;
  label: string;
  statuses: ApplicationStatus[];
  interviewPhases?: InterviewPhase[];
}

export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  PipelineStage.Applied,
  PipelineStage.Reviewing,
  PipelineStage.Shortlisted,
  PipelineStage.Interview,
  PipelineStage.Offer,
  PipelineStage.Hired,
  PipelineStage.Rejected,
];

/** Pending normalizes to Applied — not a distinct pipeline column. */
export function normalizeApplicationStatus(status: ApplicationStatus): ApplicationStatus {
  return status === ApplicationStatus.Pending ? ApplicationStatus.Applied : status;
}

export const PIPELINE_COLUMNS: PipelineColumnDefinition[] = [
  {
    id: PipelineStage.Applied,
    label: 'Applied',
    statuses: [ApplicationStatus.Applied],
  },
  {
    id: PipelineStage.Reviewing,
    label: 'Reviewing',
    statuses: [ApplicationStatus.UnderReview],
  },
  {
    id: PipelineStage.Shortlisted,
    label: 'Shortlisted',
    statuses: [ApplicationStatus.Shortlisted],
  },
  {
    id: PipelineStage.Interview,
    label: 'Interview',
    statuses: [ApplicationStatus.InterviewInvited, ApplicationStatus.Interviewing],
    interviewPhases: [InterviewPhase.Requested, InterviewPhase.Scheduled, InterviewPhase.Completed],
  },
  {
    id: PipelineStage.Offer,
    label: 'Offer',
    statuses: [ApplicationStatus.OfferSent],
  },
  {
    id: PipelineStage.Hired,
    label: 'Hired',
    statuses: [ApplicationStatus.Hired],
  },
  {
    id: PipelineStage.Rejected,
    label: 'Rejected',
    statuses: [ApplicationStatus.Rejected, ApplicationStatus.Withdrawn],
  },
];

export const INTERVIEW_PHASE_LABELS: Record<InterviewPhase, string> = {
  [InterviewPhase.None]: 'Interview',
  [InterviewPhase.Requested]: 'Interview requested',
  [InterviewPhase.Scheduled]: 'Interview scheduled',
  [InterviewPhase.Completed]: 'Interview completed',
};

export function resolvePipelineStage(status: ApplicationStatus): PipelineStage {
  const normalized = normalizeApplicationStatus(status);
  const match = PIPELINE_COLUMNS.find((column) => column.statuses.includes(normalized));
  return match?.id ?? PipelineStage.Applied;
}
