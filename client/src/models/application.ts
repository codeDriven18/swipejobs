import type { ApplicationStatus } from './enums';
import type { Job } from './job';

export interface ApplicationStatusHistoryEntry {
  status: ApplicationStatus;
  changedAt: string;
}

export interface JobApplication {
  id: string;
  status: ApplicationStatus;
  appliedAt: string;
  notes?: string;
  userProfileId: string;
  jobId: string;
  job?: Job;
  reapplicationCount: number;
  applicationNumber: number;
  statusHistory: ApplicationStatusHistoryEntry[];
  conversationId?: string;
}

export interface CreateApplicationRequest {
  jobId: string;
}
