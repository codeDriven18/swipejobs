import type { ApplicationStatus, CandidateTrustLevel, InterviewPhase } from './enums';
import type { PortalRecruiterActivity, PortalRecruiterNote, RecruiterTag } from './recruiter';
import type { Education, Experience, Skill } from './userProfile';

export interface ApplicationStatusHistoryEntry {
  status: ApplicationStatus;
  changedAt: string;
}

export interface PortalApplicationSummary {
  applicationId: string;
  status: ApplicationStatus;
  appliedAt: string;
  applicationNumber: number;
}

export interface PortalApplicantDetail {
  applicationId: string;
  status: ApplicationStatus;
  appliedAt: string;
  jobId: string;
  jobTitle: string;
  userProfileId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  headline?: string;
  bio?: string;
  location?: string;
  jobSeekingStatus?: string;
  profileImageUrl?: string;
  linkedInUrl?: string;
  gitHubUrl?: string;
  websiteUrl?: string;
  hasResume: boolean;
  resumeFileName?: string;
  resumeFileSize?: number;
  resumeUploadedAt?: string;
  reapplicationCount: number;
  applicationNumber: number;
  interviewPhase: InterviewPhase;
  interviewScheduledAtUtc?: string;
  interviewLocation?: string;
  interviewNotes?: string;
  statusHistory: ApplicationStatusHistoryEntry[];
  applicationHistory: PortalApplicationSummary[];
  skills: Skill[];
  experiences: Experience[];
  educations: Education[];
  candidateTrustLevel: CandidateTrustLevel;
  candidateTrustSignals: number;
  conversationId?: string;
  messagingUnlocked: boolean;
  recruiterRating?: number;
  isFavorite: boolean;
  rejectionReason?: string;
  recruiterTags: RecruiterTag[];
  recruiterNotes: PortalRecruiterNote[];
  activityTimeline: PortalRecruiterActivity[];
}

export interface PortalUpdateApplicationStatusRequest {
  status: ApplicationStatus;
  rejectionReason?: string;
}

export interface PortalScheduleInterviewRequest {
  scheduledAtUtc: string;
  location?: string;
  notes?: string;
}
