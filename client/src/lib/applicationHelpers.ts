import { ApplicationStatus } from '@/models/enums';
import type { JobApplication } from '@/models/application';

export function getApplicationsForJob(
  applications: JobApplication[],
  jobId: string,
): JobApplication[] {
  return applications
    .filter((a) => a.jobId === jobId)
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
}

export function getLatestApplicationForJob(
  applications: JobApplication[],
  jobId: string,
): JobApplication | undefined {
  return getApplicationsForJob(applications, jobId)[0];
}

export function canReapplyToJob(latest: JobApplication | undefined): boolean {
  if (!latest) return true;
  return latest.status === ApplicationStatus.Rejected
    || latest.status === ApplicationStatus.Withdrawn;
}

export function blocksNewApplication(latest: JobApplication | undefined): boolean {
  if (!latest) return false;
  return !canReapplyToJob(latest);
}

export function canWithdrawApplication(status: ApplicationStatus): boolean {
  return status !== ApplicationStatus.Withdrawn
    && status !== ApplicationStatus.Hired
    && status !== ApplicationStatus.Rejected;
}
