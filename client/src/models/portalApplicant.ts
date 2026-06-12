import type { ApplicationStatus } from './enums';
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
  profileImageUrl?: string;
  hasResume: boolean;
  resumeFileName?: string;
  resumeFileSize?: number;
  resumeUploadedAt?: string;
  reapplicationCount: number;
  applicationNumber: number;
  statusHistory: ApplicationStatusHistoryEntry[];
  applicationHistory: PortalApplicationSummary[];
  skills: Skill[];
  experiences: Experience[];
  educations: Education[];
}

export interface PortalUpdateApplicationStatusRequest {
  status: ApplicationStatus;
}
