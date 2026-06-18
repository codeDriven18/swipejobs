import { Link } from 'react-router-dom';
import { MetricCard } from '@/components/employer/MetricCard';
import { EmployerPageHeader } from '@/components/employer/EmployerPageHeader';
import ui from '@/components/employer/ui/employerUi.module.css';
import { useEmployerWorkspace } from '@/context/EmployerWorkspaceContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { buildEmployerAttentionItems } from '@/lib/employer/employerAttention';
import { EmptyState } from '@/components/ui/EmptyState';
import { CompanyStatus, CompanyStatusLabels } from '@/models/operations';
import dashStyles from './PortalDashboardPage.module.css';

export function PortalDashboardPage() {
  const { stats, loading, refreshStats } = useEmployerWorkspace();
  const { count: unreadMessages } = useUnreadMessages();

  if (loading && !stats) {
    return <p className={ui.statusText}>Loading workspace…</p>;
  }

  if (!stats) {
    return (
      <section className={ui.page}>
        <EmptyState
          illustration="generic"
          title="Could not load workspace"
          description="Check your connection and try again."
          actions={[{ label: 'Retry', onClick: () => void refreshStats(), primary: true }]}
        />
      </section>
    );
  }

  const isApproved = stats.companyStatus === CompanyStatus.Approved;
  const attentionItems = buildEmployerAttentionItems({ stats, unreadMessages });

  return (
    <section className={ui.page}>
      <EmployerPageHeader
        title="Good morning"
        subtitle="Your hiring command center — what needs action right now."
        actions={(
          <Link to="/portal/pipeline" className={ui.btnPrimary}>
            Open pipeline
          </Link>
        )}
      />

      {!isApproved && (
        <div className={stats.companyStatus === CompanyStatus.Rejected ? ui.noticeDanger : ui.notice}>
          <span className={ui.noticeTitle}>Company status: {CompanyStatusLabels[stats.companyStatus]}</span>
          {stats.companyStatus === CompanyStatus.Pending && ' Publishing is paused until your company is approved.'}
          {stats.companyStatus === CompanyStatus.Rejected && ' Contact support if you believe this is an error.'}
          {stats.companyStatus === CompanyStatus.Suspended && ' Your company account is suspended.'}
        </div>
      )}

      <div className={ui.section}>
        <div className={ui.sectionHeader}>
          <div>
            <h2 className={ui.sectionTitle}>Requires attention</h2>
            <p className={ui.sectionSubtitle}>Candidates, messages, and hiring actions waiting on you.</p>
          </div>
        </div>
        <div className={ui.grid2}>
          {attentionItems.map((item) => (
            <Link key={item.id} to={item.to} className={dashStyles.attentionCard}>
              <span className={dashStyles.attentionTitle}>{item.title}</span>
              <span className={dashStyles.attentionDesc}>{item.description}</span>
              {item.count != null && item.count > 0 && (
                <span className={dashStyles.attentionCount}>{item.count}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className={ui.section}>
        <h2 className={dashStyles.glanceTitle}>At a glance</h2>
        <div className={dashStyles.metricsRow}>
          <MetricCard label="Active jobs" value={stats.activeJobs} accent />
          <MetricCard label="New applications" value={stats.newApplicationsThisWeek} trend="This week" />
          <MetricCard label="Total applications" value={stats.totalApplications} />
          <MetricCard label="Unread messages" value={unreadMessages} />
        </div>
      </div>
    </section>
  );
}
