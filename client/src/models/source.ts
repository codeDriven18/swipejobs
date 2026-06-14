import { SourceTrustLevel, SourceType } from './enums';

export interface AdminSourceMetrics {
  messagesScanned: number;
  jobsExtracted: number;
  pendingModeration: number;
  connectionStatus: string;
}
export interface AdminSource {
  id: string;
  name: string;
  type: SourceType;
  externalIdentifier?: string | null;
  channelName?: string | null;
  channelUrl?: string | null;
  logoUrl?: string | null;
  trustScore: number;
  trustLevel: SourceTrustLevel;
  isActive: boolean;
  ingestionEnabled: boolean;
  monitorStatus: number;
  sourceLastCheckedAt?: string | null;
  defaultExpirationDays: number;
  metrics: AdminSourceMetrics;
  createdAt: string;
}

export interface CreateAdminSourceRequest {
  name: string;
  type: SourceType;
  channelUrl?: string;
  channelName?: string;
  externalIdentifier?: string;
  logoUrl?: string;
  trustScore?: number;
  defaultExpirationDays?: number;
  ingestionEnabled?: boolean;
}

export interface UpdateAdminSourceRequest extends CreateAdminSourceRequest {
  isActive: boolean;
}

export interface SourceConnectionTestResult {
  success: boolean;
  connectionStatus: string;
  channelName?: string | null;
  channelId?: string | null;
  recentMessagesCount: number;
  message?: string | null;
}

export interface AdminDashboardIngestion {
  pendingModeration: number;
  sourcesActive: number;
  messagesScannedToday: number;
  jobsExtractedToday: number;
  duplicatesRemoved: number;
  averageAiConfidence: number;
}

export interface AdminSearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  url: string;
}

export interface AdminSearchResult {
  results: AdminSearchResultItem[];
  totalCount: number;
}

export const SourceTypeLabels: Record<SourceType, string> = {
  [SourceType.Manual]: 'Manual',
  [SourceType.Telegram]: 'Telegram',
  [SourceType.ExternalApi]: 'External API',
};
