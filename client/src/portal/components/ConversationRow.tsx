import { Link, useLocation } from 'react-router-dom';
import { formatMessageTime } from '@/lib/messagingHelpers';
import { resolvePipelineStage } from '@/lib/employer/pipelineArchitecture';
import { PIPELINE_STAGE_LABELS } from '@/lib/employer/pipelineMove';
import type { ConversationSummary } from '@/models/messaging';
import ws from '@/portal/workspace.module.css';

interface ConversationRowProps {
  conversation: ConversationSummary;
}

export function ConversationRow({ conversation }: ConversationRowProps) {
  const location = useLocation();
  const href = `/portal/messages/${conversation.id}`;
  const isActive = location.pathname === href;
  const stage = PIPELINE_STAGE_LABELS[resolvePipelineStage(conversation.applicationStatus)];
  const preview = conversation.latestMessageText?.trim() || `Re: ${conversation.jobTitle}`;

  return (
    <Link
      to={href}
      className={[ws.conversationRow, isActive ? ws.conversationRowActive : ''].filter(Boolean).join(' ')}
    >
      <div className={ws.conversationTop}>
        <div>
          <strong>{conversation.candidateName}</strong>
          <p className={ws.candidateSub}>{conversation.jobTitle}</p>
        </div>
        <div className={ws.candidateBadges}>
          {conversation.latestMessageAt && (
            <span className={ws.candidateSub}>{formatMessageTime(conversation.latestMessageAt)}</span>
          )}
          {conversation.unreadCount > 0 && <span className={ws.badge}>{conversation.unreadCount}</span>}
          <span className={ws.badgeMuted}>{stage}</span>
        </div>
      </div>
      <p className={ws.conversationPreview}>{preview}</p>
    </Link>
  );
}
