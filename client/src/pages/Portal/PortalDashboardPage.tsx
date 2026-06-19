import { Link } from 'react-router-dom';
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
  const [primaryAction, ...otherActions] = attentionItems;

  return (
    <section className={ui.page}>
      {!isApproved && (
        <div className={stats.companyStatus === CompanyStatus.Rejected ? dashStyles.blockedBannerDanger : dashStyles.blockedBanner}>
          <strong>Blocked — {CompanyStatusLabels[stats.companyStatus]}</strong>
          {stats.companyStatus === CompanyStatus.Pending && ' You cannot publish roles until your company is approved.'}
          {stats.companyStatus === CompanyStatus.Rejected && ' Contact support if you believe this is an error.'}
          {stats.companyStatus === CompanyStatus.Suspended && ' Your company account is suspended.'}
        </div>
      )}

      <Link to={primaryAction.to} className={dashStyles.primaryFocus}>
        {primaryAction.count != null && primaryAction.count > 0 && (
          <span className={dashStyles.primaryCount}>{primaryAction.count}</span>
        )}
        <span className={dashStyles.primaryLabel}>Do this next</span>
        <span className={dashStyles.primaryTitle}>{primaryAction.title}</span>
        <span className={dashStyles.primaryDesc}>{primaryAction.description}</span>
        <span className={ui.btnPrimary}>Continue</span>
      </Link>

      {otherActions.length > 0 && (
        <div className={dashStyles.secondaryList}>
          {otherActions.map((item) => (
            <Link key={item.id} to={item.to} className={dashStyles.secondaryRow}>
              {item.count != null && item.count > 0 ? (
                <span className={dashStyles.secondaryCount}>{item.count}</span>
              ) : (
                <span className={dashStyles.secondaryCount} aria-hidden>·</span>
              )}
              <span className={dashStyles.secondaryTitle}>{item.title}</span>
            </Link>
          ))}
        </div>
      )}

      <p className={dashStyles.contextLine}>
        {stats.activeJobs} active {stats.activeJobs === 1 ? 'role' : 'roles'}
        {' · '}
        {stats.totalApplications} {stats.totalApplications === 1 ? 'candidate' : 'candidates'}
        {' — '}
        <Link to="/portal/pipeline">Open pipeline</Link>
      </p>
    </section>
  );
}
