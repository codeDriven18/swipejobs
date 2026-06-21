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
import { ApplicantWorkRow, ConversationWorkRow, RoleWorkRow } from '@/portal/components/WorkQueueRow';
import { PageFrame } from '@/portal/components/PageFrame';
import ws from '@/portal/workspace.module.css';
import { CompanyStatus, CompanyStatusLabels } from '@/models/operations';
import { PipelineStage } from '@/models/enums';

export function CommandCenterPage() {
  const { stats, loading: statsLoading, refreshStats } = useEmployerWorkspace();
  const { count: unreadMessages } = useUnreadMessages();
  const { applications, activeJobs, conversations, loading: dataLoading, failed, refresh } = useEmployerWorkspaceData();

  const loading = statsLoading || dataLoading;

  if (loading && !stats) {
    return <p className={ws.statusText}>Loading workspace…</p>;
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
  const interviewQueue = getInterviewQueue(applications, 5);
  const reviewCount = getApplicantsNeedingReview(applications).length;
  const attentionItems = buildEmployerAttentionItems({
    stats,
    unreadMessages,
    upcomingInterviews: interviewQueue.length,
    candidatesWaitingReview: reviewCount,
  });
  const pipelineCounts = countPipelineStages(applications);
  const recentApplicants = getRecentApplicants(applications, 5);
  const unreadConversations = conversations.filter((c) => c.unreadCount > 0).slice(0, 5);
  const totalInPipeline = pipelineCounts.reduce((sum, s) => sum + s.count, 0);
  const progressStages = pipelineCounts.filter((s) =>
    [PipelineStage.Interview, PipelineStage.Offer, PipelineStage.Hired].includes(s.stage),
  );
  const offerCount = pipelineCounts.find((s) => s.stage === PipelineStage.Offer)?.count ?? 0;

  const rolesNeedingAttention = activeJobs.filter((job) => {
    const m = getJobCampaignMetrics(job.id, applications);
    return m.applicants > 0 && m.reviewing > 0;
  }).slice(0, 3);

  const hiringHealth = reviewCount === 0 && unreadMessages === 0
    ? 'healthy'
    : reviewCount >= 5 || unreadMessages >= 3
      ? 'attention'
      : 'active';

  const healthLabel = hiringHealth === 'healthy'
    ? 'On track'
    : hiringHealth === 'attention'
      ? 'Needs focus'
      : 'Active';

  const headline = attentionItems[0]?.priority === 'high'
    ? attentionItems[0].title
    : 'Your hiring workspace is ready';

  const kpiCards = [
    {
      id: 'review',
      label: 'Awaiting review',
      value: reviewCount,
      hint: reviewCount > 0 ? 'Decisions needed' : 'Queue clear',
      to: '/portal/pipeline',
      live: reviewCount > 0,
    },
    {
      id: 'messages',
      label: 'Unread messages',
      value: unreadMessages,
      hint: unreadMessages > 0 ? 'Reply to stay engaged' : 'Inbox clear',
      to: '/portal/messages',
      live: unreadMessages > 0,
    },
    {
      id: 'interviews',
      label: 'Interviews',
      value: interviewQueue.length,
      hint: interviewQueue.length > 0 ? 'Scheduled on calendar' : 'None scheduled',
      to: '/portal/pipeline?column=interview',
      live: interviewQueue.length > 0,
    },
    {
      id: 'new',
      label: 'New this week',
      value: stats.newApplicationsThisWeek,
      hint: 'Fresh applicants',
      to: '/portal/applications',
      live: stats.newApplicationsThisWeek > 0,
    },
    {
      id: 'roles',
      label: 'Active roles',
      value: stats.activeJobs,
      hint: stats.activeJobs > 0 ? 'Open campaigns' : 'Post a role',
      to: '/portal/jobs',
      live: false,
    },
    {
      id: 'pipeline',
      label: 'In pipeline',
      value: totalInPipeline,
      hint: offerCount > 0 ? `${offerCount} at offer stage` : 'Across all stages',
      to: '/portal/pipeline',
      live: totalInPipeline > 0,
    },
  ];

  return (
    <PageFrame fill>
      {!isApproved && (
        <div className={ws.notice}>
          <strong>Blocked — {CompanyStatusLabels[stats.companyStatus]}</strong>
          {stats.companyStatus === CompanyStatus.Pending && ' Publishing and some hiring actions are paused until approval.'}
        </div>
      )}

      <div className={ws.ccShell}>
        <header className={ws.ccTopbar}>
          <div className={ws.ccTopbarMain}>
            <p className={ws.homeEyebrow}>Command center</p>
            <h2 className={ws.homeTitle}>{headline}</h2>
            <p className={ws.homeMeta}>
              {stats.activeJobs} active roles · {totalInPipeline} in pipeline
              {stats.newApplicationsThisWeek > 0 && ` · ${stats.newApplicationsThisWeek} new this week`}
            </p>
          </div>
          <div className={ws.ccTopbarActions}>
            <span className={ws.ccStatusPill} aria-label={`Hiring health: ${healthLabel}`}>
              <span className={[ws.ccStatusDot, hiringHealth === 'healthy' ? ws.ccStatusDotMuted : ''].filter(Boolean).join(' ')} />
              {healthLabel}
            </span>
            <Link to="/portal/pipeline" className={ws.btnPrimary}>Review pipeline</Link>
            {reviewCount > 0 && (
              <Link to="/portal/applications" className={ws.btnGhost}>Review {reviewCount}</Link>
            )}
            <Link to="/portal/jobs" className={ws.btnGhost}>Post role</Link>
          </div>
        </header>

        <section className={ws.ccKpiGrid} aria-label="Hiring metrics">
          {kpiCards.map((kpi) => (
            <Link
              key={kpi.id}
              to={kpi.to}
              className={[ws.ccKpiCard, kpi.live ? ws.ccKpiCardLive : ''].filter(Boolean).join(' ')}
            >
              <p className={ws.ccKpiLabel}>{kpi.label}</p>
              <p className={ws.ccKpiValue}>{kpi.value}</p>
              <p className={ws.ccKpiHint}>{kpi.hint}</p>
            </Link>
          ))}
        </section>

        <section className={ws.ccPipelineOverview} aria-label="Pipeline overview">
          <div className={ws.ccPipelineOverviewHeader}>
            <h3 className={ws.ccPipelineOverviewTitle}>Pipeline · {totalInPipeline} candidates</h3>
            <Link to="/portal/pipeline" className={ws.workSectionLink}>Open board</Link>
          </div>
          {totalInPipeline > 0 && (
            <div className={ws.ccPipelineBar} aria-hidden="true">
              {pipelineCounts.map((stage) => {
                const widthPct = (stage.count / totalInPipeline) * 100;
                const isLateStage = [PipelineStage.Interview, PipelineStage.Offer, PipelineStage.Hired].includes(stage.stage);
                return (
                  <div
                    key={stage.stage}
                    className={[ws.ccPipelineBarSegment, isLateStage ? ws.ccPipelineBarSegmentActive : ''].filter(Boolean).join(' ')}
                    style={{ width: `${Math.max(widthPct, stage.count > 0 ? 2 : 0)}%` }}
                  />
                );
              })}
            </div>
          )}
          <div className={ws.ccPipelineStages}>
            {pipelineCounts.map((stage) => (
              <Link key={stage.stage} to="/portal/pipeline" className={ws.ccPipelineStage}>
                <strong>{stage.count}</strong>
                <span>{stage.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="Requires attention">
          <p className={ws.ccSectionEyebrow}>Priority actions</p>
          <div className={ws.ccPriorityGrid}>
            {attentionItems.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className={[ws.ccPriorityCard, item.priority === 'high' ? ws.ccPriorityCardUrgent : ''].filter(Boolean).join(' ')}
              >
                <div className={ws.ccPriorityCardHead}>
                  <strong>{item.title}</strong>
                  {item.count != null && <span>{item.count}</span>}
                </div>
                <p>{item.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className={ws.homeGrid}>
          <div className={ws.homeMain}>
            <section className={ws.workSection}>
              <div className={ws.workSectionHeader}>
                <h3 className={ws.workSectionTitle}>Upcoming interviews</h3>
                <Link to="/portal/pipeline?column=interview" className={ws.workSectionLink}>Pipeline</Link>
              </div>
              {interviewQueue.length === 0 ? (
                <div className={ws.workEmpty}>
                  <p>No interviews scheduled. Invite candidates from the pipeline.</p>
                  <Link to="/portal/pipeline" className={ws.btnGhost}>Review pipeline</Link>
                </div>
              ) : (
                interviewQueue.map((app) => <ApplicantWorkRow key={app.id} application={app} />)
              )}
            </section>

            <section className={ws.workSection}>
              <div className={ws.workSectionHeader}>
                <h3 className={ws.workSectionTitle}>Recent applicants</h3>
                <Link to="/portal/applications" className={ws.workSectionLink}>View all</Link>
              </div>
              {recentApplicants.length === 0 ? (
                <div className={ws.workEmpty}>
                  <p>No applicants yet.</p>
                  <Link to="/portal/jobs" className={ws.btnPrimary}>Publish a role</Link>
                </div>
              ) : (
                recentApplicants.map((app) => <ApplicantWorkRow key={app.id} application={app} />)
              )}
            </section>

            <section className={ws.workSection}>
              <div className={ws.workSectionHeader}>
                <h3 className={ws.workSectionTitle}>Roles needing attention</h3>
                <Link to="/portal/jobs" className={ws.workSectionLink}>All roles</Link>
              </div>
              {rolesNeedingAttention.length === 0 ? (
                <p className={ws.workEmptyInline}>All roles are up to date — no pending reviews.</p>
              ) : (
                rolesNeedingAttention.map((job) => (
                  <RoleWorkRow
                    key={job.id}
                    job={job}
                    applicantCount={getJobCampaignMetrics(job.id, applications).reviewing}
                  />
                ))
              )}
            </section>
          </div>

          <aside className={ws.homeAside}>
            <section className={ws.workSection}>
              <div className={ws.workSectionHeader}>
                <h3 className={ws.workSectionTitle}>Unread messages</h3>
                <Link to="/portal/messages" className={ws.workSectionLink}>Inbox</Link>
              </div>
              {unreadConversations.length === 0 ? (
                <p className={ws.workEmptyInline}>Inbox clear — no unread threads.</p>
              ) : (
                unreadConversations.map((c) => <ConversationWorkRow key={c.id} conversation={c} />)
              )}
            </section>

            <section className={ws.workSection}>
              <div className={ws.workSectionHeader}>
                <h3 className={ws.workSectionTitle}>Hiring progress</h3>
                <Link to="/portal/pipeline" className={ws.workSectionLink}>Pipeline</Link>
              </div>
              <div className={ws.progressFunnel}>
                {progressStages.map((stage) => {
                  const pct = totalInPipeline > 0 ? Math.round((stage.count / totalInPipeline) * 100) : 0;
                  return (
                    <div key={stage.label} className={ws.progressStep}>
                      <div className={ws.progressStepHead}>
                        <span>{stage.label}</span>
                        <strong>{stage.count}</strong>
                      </div>
                      <div className={ws.progressTrack}>
                        <div className={ws.progressFill} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <dl className={ws.activityStats}>
                <div><dt>New this week</dt><dd>{stats.newApplicationsThisWeek}</dd></div>
                <div><dt>Active roles</dt><dd>{stats.activeJobs}</dd></div>
              </dl>
            </section>

            <section className={ws.workSection}>
              <div className={ws.workSectionHeader}>
                <h3 className={ws.workSectionTitle}>Open roles</h3>
                <Link to="/portal/jobs" className={ws.workSectionLink}>Manage</Link>
              </div>
              {activeJobs.length === 0 ? (
                <div className={ws.workEmpty}>
                  <p>No active roles.</p>
                  <Link to="/portal/jobs" className={ws.btnPrimary}>Post role</Link>
                </div>
              ) : (
                activeJobs.slice(0, 4).map((job) => (
                  <RoleWorkRow
                    key={job.id}
                    job={job}
                    applicantCount={getJobCampaignMetrics(job.id, applications).applicants}
                  />
                ))
              )}
            </section>
          </aside>
        </div>
      </div>
    </PageFrame>
  );
}
