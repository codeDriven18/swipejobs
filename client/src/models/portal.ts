import type { ApplicationStatus, CandidateTrustLevel, InterviewPhase, JobCategory, JobLevel, PipelineStage } from './enums';
import type { Job } from './job';

export interface PortalStats {
  totalJobs: number;
  activeJobs: number;
  archivedJobs: number;
  totalApplications: number;
  newApplicationsThisWeek: number;
  companyStatus: import('./operations').CompanyStatus;
}

export interface PortalApplication {
  id: string;
  status: ApplicationStatus;
  pipelineStage: PipelineStage;
  appliedAt: string;
  interviewPhase: InterviewPhase;
  interviewScheduledAtUtc?: string;
  jobId: string;
  jobTitle: string;
  userProfileId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  applicantProfileImageUrl?: string;
  reapplicationCount: number;
  applicationNumber: number;
  candidateTrustLevel: CandidateTrustLevel;
  hasResume: boolean;
  unreadMessageCount: number;
  isWithdrawn: boolean;
}

export interface PortalUpdateCompanyRequest {
  description: string;
  industry: string;
  location: string;
  companySize: string;
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  linkedInUrl?: string;
}

export interface PortalCreateJobRequest {
  title: string;
  description: string;
  location?: string;
  city?: string;
  category: JobCategory;
  level: JobLevel;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  expiresAt?: string;
  externalUrl?: string;
  tagIds?: string[];
}

export interface PortalUpdateJobRequest extends PortalCreateJobRequest {
  isActive: boolean;
}

export type PortalJob = Job;
