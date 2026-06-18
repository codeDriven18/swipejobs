export enum JobCategory {
  Gig = 0,
  It = 1,
}

export enum JobLevel {
  NotApplicable = 0,
  Internship = 1,
  Junior = 2,
  MidLevel = 3,
}

export enum ApplicationStatus {
  /** @deprecated Normalized to Applied in API responses. */
  Pending = 0,
  Applied = 1,
  UnderReview = 2,
  Shortlisted = 3,
  InterviewInvited = 4,
  Interviewing = 5,
  OfferSent = 6,
  Hired = 7,
  Rejected = 8,
  Withdrawn = 9,
}

export enum PipelineStage {
  Applied = 0,
  Reviewing = 1,
  Shortlisted = 2,
  Interview = 3,
  Offer = 4,
  Hired = 5,
  Rejected = 6,
}

export enum InterviewPhase {
  None = 0,
  Requested = 1,
  Scheduled = 2,
  Completed = 3,
}

export enum ConversationStatus {
  Active = 0,
  ReadOnly = 1,
  Closed = 2,
}

export enum SourceType {
  Manual = 0,
  Telegram = 1,
  ExternalApi = 2,
}

export enum SourceTrustLevel {
  Unknown = 0,
  Community = 1,
  Standard = 2,
  Verified = 3,
  Trusted = 4,
}

export const SourceTrustLevelLabels: Record<SourceTrustLevel, string> = {
  [SourceTrustLevel.Unknown]: 'Unverified source',
  [SourceTrustLevel.Community]: 'Community source',
  [SourceTrustLevel.Standard]: 'Standard source',
  [SourceTrustLevel.Verified]: 'Verified source',
  [SourceTrustLevel.Trusted]: 'Trusted source',
};

export enum CandidateTrustLevel {
  None = 0,
  Verified = 1,
  Strong = 2,
  Complete = 3,
}

export const CandidateTrustLevelLabels: Record<CandidateTrustLevel, string> = {
  [CandidateTrustLevel.None]: 'Unverified',
  [CandidateTrustLevel.Verified]: 'Verified Candidate',
  [CandidateTrustLevel.Strong]: 'Strong Candidate',
  [CandidateTrustLevel.Complete]: 'Complete Candidate',
};

export const JobCategoryLabels: Record<JobCategory, string> = {
  [JobCategory.Gig]: 'Gig',
  [JobCategory.It]: 'IT',
};

export const JobLevelLabels: Record<JobLevel, string> = {
  [JobLevel.NotApplicable]: '—',
  [JobLevel.Internship]: 'Internship',
  [JobLevel.Junior]: 'Junior',
  [JobLevel.MidLevel]: 'Mid-Level',
};

export const ApplicationStatusLabels: Record<ApplicationStatus, string> = {
  [ApplicationStatus.Pending]: 'Pending',
  [ApplicationStatus.Applied]: 'Applied',
  [ApplicationStatus.UnderReview]: 'Under Review',
  [ApplicationStatus.Shortlisted]: 'Shortlisted',
  [ApplicationStatus.InterviewInvited]: 'Interview Invited',
  [ApplicationStatus.Interviewing]: 'Interviewing',
  [ApplicationStatus.OfferSent]: 'Offer Sent',
  [ApplicationStatus.Hired]: 'Hired',
  [ApplicationStatus.Rejected]: 'Rejected',
  [ApplicationStatus.Withdrawn]: 'Withdrawn',
};
