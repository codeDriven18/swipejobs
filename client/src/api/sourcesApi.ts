import { apiClient } from './client';
import type {
  AdminDashboardIngestion,
  AdminSource,
  CreateAdminSourceRequest,
  SourceConnectionTestResult,
  UpdateAdminSourceRequest,
} from '@/models/source';

export const sourcesApi = {
  list: () => apiClient<AdminSource[]>('/admin/sources'),

  get: (id: string) => apiClient<AdminSource>(`/admin/sources/${id}`),

  create: (data: CreateAdminSourceRequest) =>
    apiClient<AdminSource>('/admin/sources', { method: 'POST', body: data }),

  update: (id: string, data: UpdateAdminSourceRequest) =>
    apiClient<AdminSource>(`/admin/sources/${id}`, { method: 'PUT', body: data }),

  setEnabled: (id: string, enabled: boolean) =>
    apiClient<void>(`/admin/sources/${id}/enabled`, { method: 'PATCH', body: enabled }),

  remove: (id: string) =>
    apiClient<void>(`/admin/sources/${id}`, { method: 'DELETE' }),

  testConnection: (id: string) =>
    apiClient<SourceConnectionTestResult>(`/admin/sources/${id}/test-connection`, { method: 'POST' }),

  getDashboardIngestion: () =>
    apiClient<AdminDashboardIngestion>('/admin/sources/dashboard/ingestion'),
};
