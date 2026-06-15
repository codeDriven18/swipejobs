import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMessageTime } from '@/lib/messagingHelpers';
import type { ConversationSummary } from '@/models/messaging';
import styles from './ConversationList.module.css';

interface ConversationListProps {
  conversations: ConversationSummary[];
  basePath: string;
  showCandidate?: boolean;
}

export function ConversationList({
  conversations,
  basePath,
  showCandidate = false,
}: ConversationListProps) {
  return (
    <ul className={styles.list}>
      {conversations.map((conversation) => {
        const title = showCandidate ? conversation.candidateName : conversation.companyName;
        const subtitle = showCandidate
          ? conversation.jobTitle
          : (conversation.latestMessageText ?? conversation.jobTitle);

        return (
          <li key={conversation.id}>
            <Link to={`${basePath}/${conversation.id}`} className={styles.item}>
              {conversation.companyLogoUrl && !showCandidate ? (
                <img src={conversation.companyLogoUrl} alt="" className={styles.logo} />
              ) : (
                <span className={styles.logoFallback}>{title.slice(0, 1)}</span>
              )}
              <div className={styles.body}>
                <div className={styles.row}>
                  <strong>{title}</strong>
                  {conversation.latestMessageAt && (
                    <time dateTime={conversation.latestMessageAt}>
                      {formatMessageTime(conversation.latestMessageAt)}
                    </time>
                  )}
                </div>
                <p className={styles.preview}>{subtitle}</p>
                <div className={styles.meta}>
                  <StatusBadge status={conversation.applicationStatus} />
                  {conversation.unreadCount > 0 && (
                    <span className={styles.unread}>{conversation.unreadCount}</span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
