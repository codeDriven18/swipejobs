import type { ApplicationStatus, ConversationStatus } from './enums';

export interface ConversationSummary {
  id: string;
  applicationId: string;
  applicationStatus: ApplicationStatus;
  conversationStatus: ConversationStatus;
  candidateProfileId: string;
  candidateName: string;
  companyId: string;
  companyName: string;
  companyLogoUrl?: string;
  jobId: string;
  jobTitle: string;
  latestMessageText?: string;
  latestMessageAt?: string;
  unreadCount: number;
  canSendMessages: boolean;
}

export interface ConversationDetail {
  id: string;
  applicationId: string;
  applicationStatus: ApplicationStatus;
  conversationStatus: ConversationStatus;
  candidateProfileId: string;
  candidateName: string;
  companyId: string;
  companyName: string;
  companyLogoUrl?: string;
  jobId: string;
  jobTitle: string;
  canSendMessages: boolean;
  isReadOnly: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  isMine: boolean;
  messageText: string;
  attachmentUrl?: string;
  attachmentFileName?: string;
  attachmentContentType?: string;
  sentAt: string;
  readAt?: string;
}

export interface MessagingMetrics {
  conversationsCreated: number;
  messagesSent: number;
  interviewInvitations: number;
  offersSent: number;
  hires: number;
}

export interface InviteToInterviewResult {
  applicationId: string;
  status: ApplicationStatus;
  conversationId: string;
}
