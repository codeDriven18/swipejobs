import type { MouseEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { formatMessageTime } from '@/lib/messagingHelpers';
import { resolvePipelineStage } from '@/lib/employer/pipelineArchitecture';
import { PIPELINE_STAGE_LABELS } from '@/lib/employer/pipelineMove';
import type { ConversationSummary } from '@/models/messaging';
import ws from '@/portal/workspace.module.css';

interface ConversationRowProps {
  conversation: ConversationSummary;
  onOpenSplit?: (conversationId: string) => void;
  isSplitActive?: boolean;
}

export function ConversationRow({ conversation, onOpenSplit, isSplitActive }: ConversationRowProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const href = `/portal/messages/${conversation.id}`;
  const splitId = searchParams.get('split');
  const isActive = location.pathname === href;
  const isInSplit = splitId === conversation.id;
  const stage = PIPELINE_STAGE_LABELS[resolvePipelineStage(conversation.applicationStatus)];
  const preview = conversation.latestMessageText?.trim() || `Re: ${conversation.jobTitle}`;
  const parts = conversation.candidateName.trim().split(/\s+/);

  const handleSplit = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenSplit?.(conversation.id);
  };

  return (
    <Link
      to={href}
      className={[
        ws.conversationRow,
        isActive ? ws.conversationRowActive : '',
        isInSplit || isSplitActive ? ws.conversationRowSplit : '',
        conversation.unreadCount > 0 ? ws.conversationRowUnread : '',
      ].filter(Boolean).join(' ')}
    >
      <div className={ws.conversationRowMain}>
        <UserAvatar
          profile={{
            firstName: parts[0] ?? '',
            lastName: parts.slice(1).join(' '),
            email: '',
          }}
          size="sm"
        />
        <div className={ws.conversationRowBody}>
          <div className={ws.conversationTop}>
            <div className={ws.conversationRowHead}>
              <strong>{conversation.candidateName}</strong>
              <span className={ws.conversationRowRole}>{conversation.jobTitle}</span>
            </div>
            <div className={ws.conversationRowMeta}>
              {conversation.latestMessageAt && (
                <time className={ws.conversationRowTime} dateTime={conversation.latestMessageAt}>
                  {formatMessageTime(conversation.latestMessageAt)}
                </time>
              )}
              {conversation.unreadCount > 0 && (
                <span className={ws.conversationUnreadBadge}>{conversation.unreadCount}</span>
              )}
            </div>
          </div>
          <p className={ws.conversationPreview}>{preview}</p>
          <div className={ws.conversationRowFoot}>
            <span className={ws.conversationStagePill}>{stage}</span>
            {onOpenSplit && !isActive && (
              <button
                type="button"
                className={ws.conversationSplitBtn}
                onClick={handleSplit}
                aria-label={`Open ${conversation.candidateName} in split view`}
                title="Open in split view"
              >
                Split
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
