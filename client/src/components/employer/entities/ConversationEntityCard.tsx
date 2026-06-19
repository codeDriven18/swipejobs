import { Link, useLocation } from 'react-router-dom';
import { formatMessageTime } from '@/lib/messagingHelpers';
import { resolvePipelineStage } from '@/lib/employer/pipelineArchitecture';
import { PIPELINE_STAGE_LABELS } from '@/lib/employer/pipelineMove';
import type { ConversationSummary } from '@/models/messaging';
import ui from '@/components/employer/ui/employerUi.module.css';

interface ConversationEntityCardProps {
  conversation: ConversationSummary;
  basePath?: string;
}

export function ConversationEntityCard({ conversation, basePath = '/portal/messages' }: ConversationEntityCardProps) {
  const location = useLocation();
  const href = `${basePath}/${conversation.id}`;
  const isActive = location.pathname === href;
  const stage = PIPELINE_STAGE_LABELS[resolvePipelineStage(conversation.applicationStatus)];
  const preview = conversation.latestMessageText?.trim() || `Re: ${conversation.jobTitle}`;
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Link
      to={href}
      className={ui.candidateCard}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        outline: isActive ? '2px solid var(--employer-brand)' : undefined,
      }}
    >
      <div className={ui.candidateRow}>
        <div className={ui.candidateIdentity}>
          <h2 className={ui.candidateName}>{conversation.candidateName}</h2>
          <p className={ui.candidateSub}>{conversation.jobTitle}</p>
          <p className={ui.candidateDetail}>{preview}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
          {conversation.latestMessageAt && (
            <span className={ui.candidateSub}>{formatMessageTime(conversation.latestMessageAt)}</span>
          )}
          {hasUnread && <span className={ui.badge}>{conversation.unreadCount}</span>}
          <span className={ui.badgeMuted}>{stage}</span>
        </div>
      </div>
    </Link>
  );
}
