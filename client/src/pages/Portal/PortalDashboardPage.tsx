import { Link } from 'react-router-dom';
import { CandidateEntityCard } from '@/components/employer/entities/CandidateEntityCard';
import { ConversationEntityCard } from '@/components/employer/entities/ConversationEntityCard';
import { JobCampaignCard } from '@/components/employer/entities/JobCampaignCard';
import ui from '@/components/employer/ui/employerUi.module.css';
import { useEmployerWorkspaceData } from '@/hooks/useEmployerWorkspaceData';
import { useEmployerWorkspace } from '@/context/EmployerWorkspaceContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { buildEmployerAttentionItems } from '@/lib/employer/employerAttention';
import {
  countPipelineStages,
  getApplicantsNeedingReview,
  getInterviewQueue,
  getJobCampaignMetrics,
  getRecentApplicants,
} from '@/lib/employer/employerWorkspaceData';
import layout from '@/styles/employerComposition.module.css';
import { EmptyState } from '@/components/ui/EmptyState';
import { CompanyStatus, CompanyStatusLabels } from '@/models/operations';

export function PortalDashboardPage() {
  const { stats, loading: statsLoading, refreshStats } = useEmployerWorkspace();
  const { count: unreadMessages } = useUnreadMessages();
  const { applications, activeJobs, conversations, loading: dataLoading, failed, refresh } = useEmployerWorkspaceData();

  const loading = statsLoading || dataLoading;

  if (loading && !stats) {
    return <p className={ui.statusText}>Loading command center…</p>;
  }

  if (!stats || failed) {
    return (
      <section className={ui.page}>
        <EmptyState
          illustration="generic"
          title="Could not load workspace"
          description="Check your connection and try again."
          actions={[{ label: 'Retry', onClick: () => { void refreshStats(); void refresh(); }, primary: true }]}
        />
      </section>
    );
  }

  const isApproved = stats.companyStatus === CompanyStatus.Approved;
  const attentionItems = buildEmployerAttentionItems({ stats, unreadMessages });
  const pipelineCounts = countPipelineStages(applications);
  const recentApplicants = getRecentApplicants(applications, 6);
  const reviewQueue = getApplicantsNeedingReview(applications, 4);
  const interviewQueue = getInterviewQueue(applications, 4);
  const unreadConversations = conversations.filter((c) => c.unreadCount > 0).slice(0, 5);

  return (
    <section className={ui.page}>
      {!isApproved && (
        <div className={ui.notice}>
          <strong>Blocked — {CompanyStatusLabels[stats.companyStatus]}</strong>
          {stats.companyStatus === CompanyStatus.Pending && ' Publishing and some hiring actions are paused until approval.'}
        </div>
      )}

      <header className={layout.workspaceSectionHeader}>
        <div>
          <h1 className={ui.workboardToolbarTitle}>Hiring command center</h1>
          <p className={ui.workboardToolbarMeta}>
            {stats.newApplicationsThisWeek} new applicants this week · {unreadMessages} unread messages · {stats.activeJobs} open roles
          </p>
        </div>
        <Link to="/portal/pipeline" className={ui.btnPrimary}>Open pipeline</Link>
      </header>

      <div className={layout.commandCenter}>
        <div className={layout.workspaceSection}>
          <section className={ui.surface} style={{ padding: 'var(--employer-space-block)' }}>
            <div className={layout.workspaceSectionHeader}>
              <h2 className={layout.workspaceSectionTitle}>Requires attention</h2>
              <span className={ui.workboardToolbarMeta}>{attentionItems.length} items</span>
            </div>
            <div className={layout.entityGrid}>
              {attentionItems.map((item) => (
                <Link key={item.id} to={item.to} className={ui.candidateCard} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3 className={ui.candidateName}>{item.title}</h3>
                  <p className={ui.candidateDetail}>{item.description}</p>
                  <div className={ui.candidateActions}>
                    {item.count != null && <span className={ui.badge}>{item.count}</span>}
                    <span className={ui.btnGhost}>Open →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className={layout.workspaceSection}>
            <div className={layout.workspaceSectionHeader}>
              <h2 className={layout.workspaceSectionTitle}>Recent applicants</h2>
              <Link to="/portal/applications" className={ui.btnGhost}>View all</Link>
            </div>
            {recentApplicants.length === 0 ? (
              <p className={ui.statusText}>No applicants yet. Publish a role to start hiring.</p>
            ) : (
              <div className={layout.entityGrid}>
                {recentApplicants.map((app) => (
                  <CandidateEntityCard key={app.id} application={app} compact />
                ))}
              </div>
            )}
          </section>

          <section className={ui.surface} style={{ padding: 'var(--employer-space-block)' }}>
            <div className={layout.workspaceSectionHeader}>
              <h2 className={layout.workspaceSectionTitle}>Pipeline overview</h2>
              <Link to="/portal/pipeline" className={ui.btnGhost}>Open board</Link>
            </div>
            <div className={layout.pipelineOverview}>
              {pipelineCounts.map((stage) => (
                <Link key={stage.stage} to="/portal/pipeline" className={`${ui.surfaceMuted} ${layout.pipelineStageChip}`}>
                  <strong>{stage.count}</strong>
                  <span className={ui.candidateSub}>{stage.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {reviewQueue.length > 0 && (
            <section className={layout.workspaceSection}>
              <div className={layout.workspaceSectionHeader}>
                <h2 className={layout.workspaceSectionTitle}>Awaiting review</h2>
                <Link to="/portal/pipeline" className={ui.btnGhost}>Review in pipeline</Link>
              </div>
              <div className={layout.entityGrid}>
                {reviewQueue.map((app) => (
                  <CandidateEntityCard key={app.id} application={app} compact />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className={layout.workspaceSection}>
          <section className={layout.workspaceSection}>
            <div className={layout.workspaceSectionHeader}>
              <h2 className={layout.workspaceSectionTitle}>Unread conversations</h2>
              <Link to="/portal/messages" className={ui.btnGhost}>Inbox</Link>
            </div>
            {unreadConversations.length === 0 ? (
              <p className={ui.candidateDetail}>No unread messages.</p>
            ) : (
              unreadConversations.map((conversation) => (
                <ConversationEntityCard key={conversation.id} conversation={conversation} />
              ))
            )}
          </section>

          <section className={layout.workspaceSection}>
            <div className={layout.workspaceSectionHeader}>
              <h2 className={layout.workspaceSectionTitle}>Upcoming interviews</h2>
              <Link to="/portal/pipeline" className={ui.btnGhost}>Pipeline</Link>
            </div>
            {interviewQueue.length === 0 ? (
              <p className={ui.candidateDetail}>No interviews scheduled yet.</p>
            ) : (
              <div className={layout.entityGrid} style={{ gridTemplateColumns: '1fr' }}>
                {interviewQueue.map((app) => (
                  <CandidateEntityCard key={app.id} application={app} compact />
                ))}
              </div>
            )}
          </section>

          <section className={layout.workspaceSection}>
            <div className={layout.workspaceSectionHeader}>
              <h2 className={layout.workspaceSectionTitle}>Open roles</h2>
              <Link to="/portal/jobs" className={ui.btnGhost}>Manage roles</Link>
            </div>
            {activeJobs.length === 0 ? (
              <p className={ui.candidateDetail}>No active roles. Post a role to start hiring.</p>
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
          </section>

          <section className={ui.surfaceMuted} style={{ padding: 'var(--employer-space-block)' }}>
            <h2 className={layout.workspaceSectionTitle}>Hiring activity</h2>
            <p className={ui.candidateDetail}>
              {stats.totalApplications} total candidates across {stats.activeJobs} active roles.
              {' '}
              {stats.newApplicationsThisWeek > 0
                ? `${stats.newApplicationsThisWeek} applied this week.`
                : 'No new applications this week.'}
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
