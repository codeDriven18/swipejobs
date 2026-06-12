export enum ActivityType {
  JobViewed = 0,
  JobSaved = 1,
  JobApplied = 2,
  JobSkipped = 3,
  CompanyViewed = 4,
}

export enum NotificationType {
  NewJobFromFollowedCompany = 0,
  RecommendedJob = 1,
  ProfileCompletenessReminder = 2,
  ApplicationStatusChanged = 3,
  ApplicationReapplied = 4,
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  relatedJobId?: string;
  relatedCompanyId?: string;
  createdAt: string;
}

export interface CompanyFollow {
  id: string;
  userProfileId: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  followedAt: string;
}
