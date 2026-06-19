import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEmployerWorkspace } from '@/context/EmployerWorkspaceContext';
import { useEmployerWorkspaceData } from '@/hooks/useEmployerWorkspaceData';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { buildEmployerAttentionItems } from '@/lib/employer/employerAttention';
import {
  countPipelineStages,
  getApplicantsNeedingReview,
  getInterviewQueue,
  getJobCampaignMetrics,
  getRecentApplicants,
} from '@/lib/employer/employerWorkspaceData';
import { CandidateCard } from '@/portal/components/CandidateCard';
import { ConversationRow } from '@/portal/components/ConversationRow';
import { JobCampaignCard } from '@/portal/components/JobCampaignCard';
import { PageFrame, Panel } from '@/portal/components/PageFrame';
import ws from '@/portal/workspace.module.css';
import { CompanyStatus, CompanyStatusLabels } from '@/models/operations';

export function CommandCenterPage() {
  const { stats, loading: statsLoading, refreshStats } = useEmployerWorkspace();
  const { count: unreadMessages } = useUnreadMessages();
  const { applications, activeJobs, conversations, loading: dataLoading, failed, refresh } = useEmployerWorkspaceData();

  const loading = statsLoading || dataLoading;

  if (loading && !stats) {
    return <p className={ws.statusText}>Loading command center…</p>;
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
  const interviewQueue = getInterviewQueue(applications, 4);
  const attentionItems = buildEmployerAttentionItems({
    stats,
    unreadMessages,
    upcomingInterviews: interviewQueue.length,
    candidatesWaitingReview: getApplicantsNeedingReview(applications).length,
  });
  const pipelineCounts = countPipelineStages(applications);
  const recentApplicants = getRecentApplicants(applications, 6);
  const reviewQueue = getApplicantsNeedingReview(applications, 4);
  const unreadConversations = conversations.filter((c) => c.unreadCount > 0).slice(0, 5);

  return (
    <PageFrame
      meta={(
        <>
          {stats.newApplicationsThisWeek} new this week · {unreadMessages} unread · {stats.activeJobs} open roles
        </>
      )}
      actions={<Link to="/portal/pipeline" className={ws.btnPrimary}>Open pipeline</Link>}
    >
      {!isApproved && (
        <div className={ws.notice}>
          <strong>Blocked — {CompanyStatusLabels[stats.companyStatus]}</strong>
          {stats.companyStatus === CompanyStatus.Pending && ' Publishing and some hiring actions are paused until approval.'}
        </div>
      )}

      <div className={ws.commandGrid}>
        <div className={ws.stack}>
          <Panel title="Requires attention" action={<span className={ws.candidateSub}>{attentionItems.length} items</span>}>
            <div className={ws.cardGrid}>
              {attentionItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className={[ws.attentionItem, item.priority === 'high' ? ws.attentionItemPrimary : ''].filter(Boolean).join(' ')}
                >
                  <strong>{item.title}</strong>
                  <span className={ws.candidateSub}>{item.description}</span>
                  {item.count != null && <span className={ws.badge}>{item.count}</span>}
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Recent applicants" action={<Link to="/portal/applications" className={ws.btnGhost}>View all</Link>}>
            {recentApplicants.length === 0 ? (
              <p className={ws.statusText}>No applicants yet. Publish a role to start hiring.</p>
            ) : (
              <div className={ws.cardGrid}>
                {recentApplicants.map((app) => (
                  <CandidateCard key={app.id} application={app} compact />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Pipeline overview" action={<Link to="/portal/pipeline" className={ws.btnGhost}>Open board</Link>}>
            <div className={ws.pipelineBar}>
              {pipelineCounts.map((stage) => (
                <Link key={stage.stage} to="/portal/pipeline" className={ws.stageChip}>
                  <strong>{stage.count}</strong>
                  {stage.label}
                </Link>
              ))}
            </div>
          </Panel>

          {reviewQueue.length > 0 && (
            <Panel title="Awaiting review" action={<Link to="/portal/pipeline" className={ws.btnGhost}>Review</Link>}>
              <div className={ws.cardGrid}>
                {reviewQueue.map((app) => (
                  <CandidateCard key={app.id} application={app} compact />
                ))}
              </div>
            </Panel>
          )}
        </div>

        <aside className={ws.stack}>
          <Panel title="Unread conversations" action={<Link to="/portal/messages" className={ws.btnGhost}>Inbox</Link>}>
            {unreadConversations.length === 0 ? (
              <p className={ws.candidateSub}>No unread messages.</p>
            ) : (
              unreadConversations.map((conversation) => (
                <ConversationRow key={conversation.id} conversation={conversation} />
              ))
            )}
          </Panel>

          <Panel title="Upcoming interviews" action={<Link to="/portal/pipeline" className={ws.btnGhost}>Pipeline</Link>}>
            {interviewQueue.length === 0 ? (
              <p className={ws.candidateSub}>No interviews scheduled yet.</p>
            ) : (
              <div className={ws.stack}>
                {interviewQueue.map((app) => (
                  <CandidateCard key={app.id} application={app} compact />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Open roles" action={<Link to="/portal/jobs" className={ws.btnGhost}>Manage</Link>}>
            {activeJobs.length === 0 ? (
              <p className={ws.candidateSub}>No active roles. Post a role to start hiring.</p>
            ) : (
              activeJobs.slice(0, 3).map((job) => (
                <JobCampaignCard
                  key={job.id}
                  job={job}
                  metrics={getJobCampaignMetrics(job.id, applications)}
                  readonly
                />
              ))
            )}
          </Panel>

          <Panel title="Hiring activity" muted>
            <p className={ws.bodyText}>
              {stats.totalApplications} total candidates across {stats.activeJobs} active roles.
              {' '}
              {stats.newApplicationsThisWeek > 0
                ? `${stats.newApplicationsThisWeek} applied this week.`
                : 'No new applications this week.'}
            </p>
          </Panel>
        </aside>
      </div>
    </PageFrame>
  );
}
