import type {
  PortalApplication,
  PortalCreateJobRequest,
  PortalJob,
  PortalStats,
  PortalUpdateCompanyRequest,
  PortalUpdateJobRequest,
} from '@/models/portal';
import type {
  PortalApplicantDetail,
  PortalUpdateApplicationStatusRequest,
} from '@/models/portalApplicant';
import { apiClient, apiClientBlob } from './client';

export const portalApi = {
  getStats: () => apiClient<PortalStats>('/portal/stats'),

  getJobs: () => apiClient<PortalJob[]>('/portal/jobs'),

  createJob: (data: PortalCreateJobRequest) =>
    apiClient<PortalJob>('/portal/jobs', { method: 'POST', body: data }),

  updateJob: (id: string, data: PortalUpdateJobRequest) =>
    apiClient<PortalJob>(`/portal/jobs/${id}`, { method: 'PUT', body: data }),

  archiveJob: (id: string) =>
    apiClient<void>(`/portal/jobs/${id}/archive`, { method: 'POST' }),

  getApplications: (jobId?: string) => {
    const query = jobId ? `?jobId=${jobId}` : '';
    return apiClient<PortalApplication[]>(`/portal/applications${query}`);
  },

  getApplicant: (applicationId: string) =>
    apiClient<PortalApplicantDetail>(`/portal/applications/${applicationId}`),

  updateApplicationStatus: (applicationId: string, data: PortalUpdateApplicationStatusRequest) =>
    apiClient<PortalApplication>(`/portal/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: data,
    }),

  inviteToInterview: (applicationId: string) =>
    apiClient<import('@/models/messaging').InviteToInterviewResult>(
      `/portal/applications/${applicationId}/invite-interview`,
      { method: 'POST' },
    ),

  shortlistApplication: (applicationId: string) =>
    apiClient<PortalApplication>(`/portal/applications/${applicationId}/shortlist`, {
      method: 'POST',
    }),

  downloadApplicantResume: (applicationId: string) =>
    apiClientBlob(`/portal/applications/${applicationId}/resume`),

  getCompany: () => apiClient<import('@/models/company').Company>('/portal/company'),

  updateCompany: (data: PortalUpdateCompanyRequest) =>
    apiClient<import('@/models/company').Company>('/portal/company', { method: 'PUT', body: data }),
};
