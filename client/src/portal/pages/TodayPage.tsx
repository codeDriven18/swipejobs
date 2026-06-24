import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { TodayPageSkeleton } from '@/portal/components/PortalSkeleton';
import { useEmployerWorkspace } from '@/context/EmployerWorkspaceContext';
import { useEmployerWorkspaceData } from '@/hooks/useEmployerWorkspaceData';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import {
  getApplicantsNeedingReview,
  getRecentApplicants,
} from '@/lib/employer/employerWorkspaceData';
import {
  buildConversationByApplication,
  getHiringSnapshot,
  getUpcomingInterviewsGrouped,
} from '@/lib/employer/todayWorkspace';
import { PageFrame } from '@/portal/components/PageFrame';
import { ApplicantWorkRow, ConversationWorkRow } from '@/portal/components/WorkQueueRow';
import { TodayActivityFeed } from '@/portal/components/today/TodayActivityFeed';
import { TodayHiringSnapshot } from '@/portal/components/today/TodayHiringSnapshot';
import { TodayQuickActions } from '@/portal/components/today/TodayQuickActions';
import { TodayRecentApplicants } from '@/portal/components/today/TodayRecentApplicants';
import { TodaySection } from '@/portal/components/today/TodaySection';
import { TodayUpcomingInterviews } from '@/portal/components/today/TodayUpcomingInterviews';
import ws from '@/portal/workspace.module.css';
import { CompanyStatus, CompanyStatusLabels } from '@/models/operations';

export function TodayPage() {
  const { stats, loading: statsLoading, refreshStats } = useEmployerWorkspace();
  const { count: unreadMessages } = useUnreadMessages();
  const {
    applications,
    conversations,
    activity,
    loading: dataLoading,
    failed,
    refresh,
  } = useEmployerWorkspaceData();

  const loading = statsLoading || dataLoading;

  if (loading && !stats) {
    return (
      <PageFrame fill>
        <TodayPageSkeleton />
      </PageFrame>
    );
  }

  if (!stats || failed) {
    return (
      <PageFrame>
        <EmptyState
          illustration="generic"
          title="Could not load workspace"
          description="Check your connection and try again."
          actions={[{ label: 'Retry', onClick: () => { void refreshStats(); void refresh(); }, primary: true }]}
        />
      </PageFrame>
    );
  }

  const isApproved = stats.companyStatus === CompanyStatus.Approved;
  const reviewQueue = getApplicantsNeedingReview(applications, 8);
  const unreadConversations = conversations.filter((c) => c.unreadCount > 0).slice(0, 6);
  const interviewGroups = getUpcomingInterviewsGrouped(applications);
  const recentApplicants = getRecentApplicants(applications, 5);
  const conversationByApplication = buildConversationByApplication(conversations);
  const snapshot = getHiringSnapshot(stats, applications);

  const hasUrgentWork = reviewQueue.length > 0
    || unreadConversations.length > 0
    || interviewGroups.some((g) => g.items.length > 0);

  const todayInterviewCount = interviewGroups.find((g) => g.label === 'Today')?.items.length ?? 0;

  const statusLine = reviewQueue.length > 0
    ? `${reviewQueue.length} candidate${reviewQueue.length === 1 ? '' : 's'} need review`
    : unreadMessages > 0
      ? `${unreadMessages} conversation${unreadMessages === 1 ? '' : 's'} waiting for a reply`
      : todayInterviewCount > 0
        ? `${todayInterviewCount} interview${todayInterviewCount === 1 ? '' : 's'} today`
        : 'You\'re caught up';

  return (
    <PageFrame fill>
      {!isApproved && (
        <div className={ws.notice}>
          <strong>{CompanyStatusLabels[stats.companyStatus]}</strong>
          {' — '}
          {stats.companyStatus === CompanyStatus.Pending
            ? 'Publishing and some hiring actions are paused until approval.'
            : 'Some hiring actions may be limited.'}
        </div>
      )}

      <div className={ws.todayWorkspace}>
        <header className={ws.todayStatusBar}>
          <p className={ws.todayStatusLine}>{statusLine}</p>
        </header>

        {!hasUrgentWork && applications.length === 0 && (
          <div className={ws.todayCaughtUp}>
            <p className={ws.todayCaughtUpTitle}>You&apos;re all caught up.</p>
            <p className={ws.todayCaughtUpSub}>No candidates need attention right now. Post a role to start receiving applicants.</p>
            <div className={ws.todayCaughtUpActions}>
              <Link to="/portal/jobs" className={ws.btnPrimary}>Post a role →</Link>
              <Link to="/portal/company" className={ws.btnGhost}>Build your employer brand</Link>
            </div>
          </div>
        )}

        <div className={ws.todayLayout}>
          <div className={ws.todayMain}>
            <TodaySection
              title="Review queue"
              action={{ label: 'Pipeline', to: '/portal/pipeline' }}
            >
              {reviewQueue.length === 0 ? (
                <p className={ws.todayInlineEmpty}>No candidates waiting for review.</p>
              ) : (
                <div className={ws.todayQueue}>
                  {reviewQueue.map((app) => (
                    <ApplicantWorkRow key={app.id} application={app} from="today" actionLabel="Review" />
                  ))}
                </div>
              )}
            </TodaySection>

            <TodaySection
              title="Unread conversations"
              action={{ label: 'Inbox', to: '/portal/messages' }}
            >
              {unreadConversations.length === 0 ? (
                <p className={ws.todayInlineEmpty}>No unread messages.</p>
              ) : (
                <div className={ws.todayQueue}>
                  {unreadConversations.map((c) => (
                    <ConversationWorkRow key={c.id} conversation={c} actionLabel="Reply" />
                  ))}
                </div>
              )}
            </TodaySection>

            <TodayUpcomingInterviews groups={interviewGroups} />

            <TodayRecentApplicants
              applicants={recentApplicants}
              conversationByApplication={conversationByApplication}
            />
          </div>

          <aside className={ws.todayRail}>
            <TodayActivityFeed activities={activity} />
            <TodayQuickActions />
            <TodayHiringSnapshot snapshot={snapshot} />
          </aside>
        </div>
      </div>
    </PageFrame>
  );
}
