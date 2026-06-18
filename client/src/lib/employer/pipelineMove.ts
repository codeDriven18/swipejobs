import { portalApi } from '@/api/portalApi';
import { ApplicationStatus, PipelineStage } from '@/models/enums';
import type { PortalApplication } from '@/models/portal';

export function canMoveToStage(application: PortalApplication, targetStage: PipelineStage): boolean {
  if (application.pipelineStage === targetStage) return false;
  if (application.isWithdrawn) return false;
  if (targetStage === PipelineStage.Applied) return false;
  return true;
}

export function getMoveBlockedReason(
  application: PortalApplication,
  targetStage: PipelineStage,
): string | null {
  if (application.pipelineStage === targetStage) return 'Already in this stage.';
  if (application.isWithdrawn) return 'Withdrawn applications cannot be moved.';
  if (targetStage === PipelineStage.Applied) return 'Cannot move candidates back to Applied.';
  return null;
}

/** Approximate status for optimistic UI before API confirms. */
export function optimisticStatusForStage(
  targetStage: PipelineStage,
  current: PortalApplication,
): ApplicationStatus {
  switch (targetStage) {
    case PipelineStage.Reviewing:
      return ApplicationStatus.UnderReview;
    case PipelineStage.Shortlisted:
      return ApplicationStatus.Shortlisted;
    case PipelineStage.Interview:
      return current.status === ApplicationStatus.Interviewing
        ? ApplicationStatus.Interviewing
        : ApplicationStatus.InterviewInvited;
    case PipelineStage.Offer:
      return ApplicationStatus.OfferSent;
    case PipelineStage.Hired:
      return ApplicationStatus.Hired;
    case PipelineStage.Rejected:
      return ApplicationStatus.Rejected;
    default:
      return current.status;
  }
}

export function optimisticPatch(
  application: PortalApplication,
  targetStage: PipelineStage,
): PortalApplication {
  return {
    ...application,
    pipelineStage: targetStage,
    status: optimisticStatusForStage(targetStage, application),
  };
}

async function refreshApplication(applicationId: string, jobId?: string): Promise<PortalApplication> {
  const applications = await portalApi.getApplications(jobId);
  const refreshed = applications.find((item) => item.id === applicationId);
  if (!refreshed) throw new Error('Application not found after update.');
  return refreshed;
}

export async function moveApplicationToStage(
  application: PortalApplication,
  targetStage: PipelineStage,
  jobId?: string,
): Promise<PortalApplication> {
  const blocked = getMoveBlockedReason(application, targetStage);
  if (blocked) throw new Error(blocked);

  switch (targetStage) {
    case PipelineStage.Reviewing:
      return portalApi.updateApplicationStatus(application.id, {
        status: ApplicationStatus.UnderReview,
      });

    case PipelineStage.Shortlisted:
      return portalApi.shortlistApplication(application.id);

    case PipelineStage.Interview:
      if (
        application.status === ApplicationStatus.InterviewInvited
        || application.status === ApplicationStatus.Interviewing
      ) {
        return portalApi.updateApplicationStatus(application.id, {
          status: ApplicationStatus.Interviewing,
        });
      }
      await portalApi.inviteToInterview(application.id);
      return refreshApplication(application.id, jobId);

    case PipelineStage.Offer:
      return portalApi.updateApplicationStatus(application.id, {
        status: ApplicationStatus.OfferSent,
      });

    case PipelineStage.Hired:
      return portalApi.updateApplicationStatus(application.id, {
        status: ApplicationStatus.Hired,
      });

    case PipelineStage.Rejected:
      return portalApi.updateApplicationStatus(application.id, {
        status: ApplicationStatus.Rejected,
      });

    default:
      throw new Error('This stage cannot be set directly.');
  }
}

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  [PipelineStage.Applied]: 'Applied',
  [PipelineStage.Reviewing]: 'Reviewing',
  [PipelineStage.Shortlisted]: 'Shortlisted',
  [PipelineStage.Interview]: 'Interview',
  [PipelineStage.Offer]: 'Offer',
  [PipelineStage.Hired]: 'Hired',
  [PipelineStage.Rejected]: 'Rejected',
};
