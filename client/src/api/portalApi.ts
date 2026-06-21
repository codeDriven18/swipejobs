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
  PortalScheduleInterviewRequest,
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

  scheduleInterview: (applicationId: string, data: PortalScheduleInterviewRequest) =>
    apiClient<PortalApplication>(`/portal/applications/${applicationId}/interview`, {
      method: 'POST',
      body: data,
    }),

  downloadApplicantResume: (applicationId: string) =>
    apiClientBlob(`/portal/applications/${applicationId}/resume`),

  getCompany: () => apiClient<import('@/models/company').Company>('/portal/company'),

  updateCompany: (data: PortalUpdateCompanyRequest) =>
    apiClient<import('@/models/company').Company>('/portal/company', { method: 'PUT', body: data }),

  getRecruiterTags: () => apiClient<import('@/models/recruiter').RecruiterTag[]>('/portal/recruiter-tags'),

  createRecruiterTag: (name: string) =>
    apiClient<import('@/models/recruiter').RecruiterTag>('/portal/recruiter-tags', {
      method: 'POST',
      body: { name },
    }),

  updateRecruiterTag: (tagId: string, name: string) =>
    apiClient<import('@/models/recruiter').RecruiterTag>(`/portal/recruiter-tags/${tagId}`, {
      method: 'PUT',
      body: { name },
    }),

  deleteRecruiterTag: (tagId: string) =>
    apiClient<void>(`/portal/recruiter-tags/${tagId}`, { method: 'DELETE' }),

  addRecruiterNote: (applicationId: string, text: string) =>
    apiClient<import('@/models/recruiter').PortalRecruiterNote>(
      `/portal/applications/${applicationId}/notes`,
      { method: 'POST', body: { text } },
    ),

  deleteRecruiterNote: (applicationId: string, noteId: string) =>
    apiClient<void>(`/portal/applications/${applicationId}/notes/${noteId}`, { method: 'DELETE' }),

  setRecruiterRating: (applicationId: string, rating: number | null) =>
    apiClient<PortalApplication>(`/portal/applications/${applicationId}/rating`, {
      method: 'PATCH',
      body: { rating },
    }),

  setFavorite: (applicationId: string, isFavorite: boolean) =>
    apiClient<PortalApplication>(`/portal/applications/${applicationId}/favorite`, {
      method: 'PATCH',
      body: { isFavorite },
    }),

  setApplicationTags: (applicationId: string, tagIds: string[]) =>
    apiClient<PortalApplication>(`/portal/applications/${applicationId}/tags`, {
      method: 'PUT',
      body: { tagIds },
    }),
};
