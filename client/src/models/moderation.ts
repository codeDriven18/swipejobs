import { JobCategory, JobLevel } from './enums';

export enum CandidateJobStatus {
  PendingReview = 0,
  Approved = 1,
  Rejected = 2,
  Published = 3,
  Archived = 4,
}

export enum ApplyMethodType {
  Unknown = 0,
  Url = 1,
  Email = 2,
  Telegram = 3,
  Phone = 4,
}

export interface JobCandidateSource {
  messageId: string;
  sourceName: string;
  channelName?: string;
  telegramMessageUrl?: string;
  postedAt?: string;
}

export interface IngestionMessage {
  id: string;
  sourceId: string;
  sourceName: string;
  externalSourceKey: string;
  telegramMessageId?: string;
  telegramMessageUrl?: string;
  channelName?: string;
  channelUrl?: string;
  postedAt?: string;
  rawMessageText: string;
  rawMediaUrls: string[];
  status: number;
  createdAt: string;
}

export interface JobCandidate {
  id: string;
  sourceId: string;
  sourceName: string;
  status: CandidateJobStatus;
  title?: string;
  companyName?: string;
  description?: string;
  location?: string;
  city?: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  category: JobCategory;
  level: JobLevel;
  employmentType?: string;
  skills: string[];
  applyMethod: ApplyMethodType;
  applyUrl?: string;
  applyEmail?: string;
  applyTelegram?: string;
  applyPhone?: string;
  extractionConfidence: number;
  completenessScore: number;
  trustScore: number;
  spamScore: number;
  duplicateGroupId: string;
  sourceCount: number;
  sources: JobCandidateSource[];
  primaryMessage?: IngestionMessage;
  publishedJobId?: string;
  rejectedReason?: string;
  createdAt: string;
}

export interface ModerationQueue {
  items: JobCandidate[];
  totalCount: number;
  pendingCount: number;
}

export interface IngestionAnalytics {
  messagesScanned: number;
  jobsDetected: number;
  duplicatesMerged: number;
  approved: number;
  rejected: number;
  published: number;
  expired: number;
  filled: number;
  averageConfidence: number;
  averageTrustScore: number;
  sourceLeaderboard: SourceLeaderboardEntry[];
}

export interface SourceLeaderboardEntry {
  sourceId: string;
  sourceName: string;
  messagesScanned: number;
  published: number;
  approved: number;
  rejected: number;
  averageConfidence: number;
  trustScore: number;
}

export interface EditJobCandidateRequest {
  title?: string;
  companyName?: string;
  description?: string;
  location?: string;
  city?: string;
  isRemote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  category?: JobCategory;
  level?: JobLevel;
  employmentType?: string;
  skills?: string[];
  applyMethod?: ApplyMethodType;
  applyUrl?: string;
  applyEmail?: string;
  applyTelegram?: string;
  applyPhone?: string;
}

export interface SourcePipelineDiagnostics {
  sourceId: string;
  sourceName: string;
  channelUrl?: string;
  latestChannelMessageId?: string;
  lastScannedMessageId?: string;
  messagesDiscovered: number;
  messagesSkipped: number;
  messagesImported: number;
  pendingModeration: number;
  lastError?: string;
  lastSyncStatus?: string;
}

export interface IngestionPipelineDiagnostics {
  telegramSourcesActive: number;
  messagesTotal: number;
  messagesProcessed: number;
  messagesFailed: number;
  messagesProcessing: number;
  candidatesTotal: number;
  candidatesPending: number;
  candidatesApproved: number;
  candidatesPublished: number;
  candidatesRejected: number;
  jobsPublished: number;
  sources: SourcePipelineDiagnostics[];
}
