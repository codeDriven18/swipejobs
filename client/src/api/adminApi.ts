import { apiClient } from './client';
import type { UserRole } from '@/models/auth';
import type {
  AdminAnalytics,
  AdminNotification,
  AdminPagedResult,
  AdminStats,
  AdminSystemHealth,
  AdminUser,
  AuditLogEntry,
  CreateAdminNotificationRequest,
} from '@/models/admin';
import type { Company } from '@/models/company';
import type { JobApplication } from '@/models/application';
import type { Job } from '@/models/job';
import type { JobCategory, JobLevel } from '@/models/enums';
import type { AuditAction, AuditEntityType, CompanyStatus } from '@/models/operations';

export interface AdminCreateJobRequest {
  title: string;
  description: string;
  companyId: string;
  location?: string;
  city?: string;
  category: JobCategory;
  level: JobLevel;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
}

export interface AdminUpdateJobRequest extends AdminCreateJobRequest {
  isActive: boolean;
}

export interface AuditLogQuery {
  search?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export const adminApi = {
  getStats: () => apiClient<AdminStats>('/admin/stats'),

  getUsers: () => apiClient<AdminUser[]>('/admin/users'),

  updateUserRole: (id: string, role: UserRole) =>
    apiClient<void>(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),

  getCompanies: () => apiClient<Company[]>('/admin/companies'),

  setCompanyActive: (id: string, isActive: boolean) =>
    apiClient<void>(`/admin/companies/${id}/active`, { method: 'PATCH', body: isActive }),

  setCompanyStatus: (id: string, status: CompanyStatus) =>
    apiClient<void>(`/admin/companies/${id}/status`, { method: 'PATCH', body: { status } }),

  getJobs: () => apiClient<Job[]>('/admin/jobs'),

  createJob: (data: AdminCreateJobRequest) =>
    apiClient<Job>('/admin/jobs', { method: 'POST', body: data }),

  updateJob: (id: string, data: AdminUpdateJobRequest) =>
    apiClient<Job>(`/admin/jobs/${id}`, { method: 'PUT', body: data }),

  setJobActive: (id: string, isActive: boolean) =>
    apiClient<void>(`/admin/jobs/${id}/active`, { method: 'PATCH', body: isActive }),

  archiveJob: (id: string) =>
    apiClient<void>(`/admin/jobs/${id}/archive`, { method: 'POST' }),

  unarchiveJob: (id: string) =>
    apiClient<void>(`/admin/jobs/${id}/unarchive`, { method: 'POST' }),

  getApplications: () => apiClient<JobApplication[]>('/admin/applications'),

  getNotifications: (limit = 50) =>
    apiClient<AdminNotification[]>(`/admin/notifications?limit=${limit}`),

  createNotification: (data: CreateAdminNotificationRequest) =>
    apiClient<AdminNotification>('/admin/notifications', { method: 'POST', body: data }),

  deleteNotification: (id: string) =>
    apiClient<void>(`/admin/notifications/${id}`, { method: 'DELETE' }),

  getAuditLogs: (query: AuditLogQuery = {}) =>
    apiClient<AdminPagedResult<AuditLogEntry>>(`/admin/audit${buildQuery({
      search: query.search,
      action: query.action,
      entityType: query.entityType,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
    })}`),

  getAnalytics: (days = 30) =>
    apiClient<AdminAnalytics>(`/admin/analytics?days=${days}`),

  getSystemHealth: () => apiClient<AdminSystemHealth>('/admin/system'),

  search: (q: string) =>
    apiClient<import('@/models/source').AdminSearchResult>(`/admin/search?q=${encodeURIComponent(q)}`),
};
