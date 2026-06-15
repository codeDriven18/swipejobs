import type { UserRole } from './auth';
import type { Company } from './company';
import type { Job } from './job';
import type { NotificationType } from './personalization';
import type { AuditAction, AuditEntityType } from './operations';

import type { MessagingMetrics } from './messaging';

export interface AdminStats {
  totalUsers: number;
  totalCompanies: number;
  totalJobs: number;
  activeJobs: number;
  archivedJobs: number;
  totalApplications: number;
  unreadNotifications: number;
  messaging: MessagingMetrics;
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt?: string;
  profileId?: string;
  companyId?: string;
  companyName?: string;
  applicationCount: number;
}

export interface AdminNotification {
  id: string;
  userProfileId: string;
  userEmail: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface CreateAdminNotificationRequest {
  userProfileId: string;
  title: string;
  message: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  details?: string;
}

export interface AdminPagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface AdminAnalytics {
  jobsPerDay: DailyCount[];
  applicationsPerDay: DailyCount[];
  usersPerDay: DailyCount[];
  companiesPerDay: DailyCount[];
  topCompanies: NamedCount[];
  topCities: NamedCount[];
  topTags: NamedCount[];
}

export interface AdminSystemHealth {
  apiStatus: string;
  databaseStatus: string;
  totalUsers: number;
  totalCompanies: number;
  totalJobs: number;
  totalApplications: number;
  checkedAt: string;
}

export type { Company as AdminCompany, Job as AdminJob };
