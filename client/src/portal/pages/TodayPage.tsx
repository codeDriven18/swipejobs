import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEmployerWorkspace } from '@/context/EmployerWorkspaceContext';
import { useEmployerWorkspaceData } from '@/hooks/useEmployerWorkspaceData';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import {
  getApplicantsNeedingReview,
  getInterviewQueue,
  getRecentApplicants,
} from '@/lib/employer/employerWorkspaceData';
import { ApplicantWorkRow, ConversationWorkRow } from '@/portal/components/WorkQueueRow';
import { PageFrame } from '@/portal/components/PageFrame';
import ws from '@/portal/workspace.module.css';
import { CompanyStatus, CompanyStatusLabels } from '@/models/operations';

export function TodayPage() {
  const { stats, loading: statsLoading, refreshStats } = useEmployerWorkspace();
  const { count: unreadMessages } = useUnreadMessages();
  const { applications, conversations, loading: dataLoading, failed, refresh } = useEmployerWorkspaceData();

  const loading = statsLoading || dataLoading;

  if (loading && !stats) {
    return <p className={ws.statusText}>Loading your hiring workspace…</p>;
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
  const interviewQueue = getInterviewQueue(applications, 6);
  const unreadConversations = conversations.filter((c) => c.unreadCount > 0).slice(0, 6);
  const reviewIds = new Set(reviewQueue.map((a) => a.id));
  const interviewIds = new Set(interviewQueue.map((a) => a.id));
  const recentlyActive = getRecentApplicants(applications, 12)
    .filter((a) => !reviewIds.has(a.id) && !interviewIds.has(a.id))
    .slice(0, 5);

  const headline = reviewQueue.length > 0
    ? `${reviewQueue.length} candidate${reviewQueue.length === 1 ? '' : 's'} need review`
    : unreadMessages > 0
      ? `${unreadMessages} conversation${unreadMessages === 1 ? '' : 's'} need a reply`
      : interviewQueue.length > 0
        ? `${interviewQueue.length} upcoming interview${interviewQueue.length === 1 ? '' : 's'}`
        : 'You\'re caught up';

  const subline = reviewQueue.length > 0
    ? 'Start with the newest applications in your queue.'
    : unreadMessages > 0
      ? 'Candidates are waiting to hear back from you.'
      : interviewQueue.length > 0
        ? 'Prepare for your next conversations.'
        : 'Open the pipeline when you\'re ready for your next hire.';

  const allClear = reviewQueue.length === 0
    && unreadConversations.length === 0
    && interviewQueue.length === 0;

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

      <div className={ws.todayShell}>
        <header className={ws.todayHeader}>
          <h2 className={ws.todayHeadline}>{headline}</h2>
          <p className={ws.todaySubline}>{subline}</p>
        </header>

        {allClear && (
          <div className={ws.todayClear}>
            <p>No urgent hiring actions right now.</p>
            <Link to="/portal/pipeline" className={ws.btnPrimary}>Open pipeline</Link>
          </div>
        )}

        {reviewQueue.length > 0 && (
          <section className={ws.todaySection} aria-label="Candidates awaiting review">
            <div className={ws.todaySectionHead}>
              <h3 className={ws.todaySectionTitle}>Awaiting review</h3>
              <Link to="/portal/pipeline" className={ws.workSectionLink}>Open pipeline</Link>
            </div>
            <div className={ws.todayQueue}>
              {reviewQueue.map((app) => (
                <ApplicantWorkRow key={app.id} application={app} from="today" actionLabel="Review candidate" />
              ))}
            </div>
          </section>
        )}

        {unreadConversations.length > 0 && (
          <section className={ws.todaySection} aria-label="Unread conversations">
            <div className={ws.todaySectionHead}>
              <h3 className={ws.todaySectionTitle}>Unread conversations</h3>
              <Link to="/portal/messages" className={ws.workSectionLink}>Open inbox</Link>
            </div>
            <div className={ws.todayQueue}>
              {unreadConversations.map((c) => (
                <ConversationWorkRow key={c.id} conversation={c} actionLabel="Open conversation" />
              ))}
            </div>
          </section>
        )}

        {interviewQueue.length > 0 && (
          <section className={ws.todaySection} aria-label="Upcoming interviews">
            <div className={ws.todaySectionHead}>
              <h3 className={ws.todaySectionTitle}>Upcoming interviews</h3>
              <Link to="/portal/pipeline?column=interview" className={ws.workSectionLink}>View in pipeline</Link>
            </div>
            <div className={ws.todayQueue}>
              {interviewQueue.map((app) => (
                <ApplicantWorkRow
                  key={app.id}
                  application={app}
                  from="today"
                  actionLabel="Prepare for interview"
                />
              ))}
            </div>
          </section>
        )}

        {recentlyActive.length > 0 && (
          <section className={ws.todaySection} aria-label="Recently active candidates">
            <div className={ws.todaySectionHead}>
              <h3 className={ws.todaySectionTitle}>Recently active</h3>
              <Link to="/portal/pipeline?view=list" className={ws.workSectionLink}>View all</Link>
            </div>
            <div className={ws.todayQueue}>
              {recentlyActive.map((app) => (
                <ApplicantWorkRow key={app.id} application={app} from="today" actionLabel="Continue hiring" />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageFrame>
  );
}
