import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '@/api/adminApi';
import { sourcesApi } from '@/api/sourcesApi';
import type { AdminAnalytics, AdminStats } from '@/models/admin';
import type { AdminDashboardIngestion } from '@/models/source';
import { AdminTrendChart, ANALYTICS_RANGES } from './AdminCharts';
import styles from './AdminPage.module.css';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [ingestion, setIngestion] = useState<AdminDashboardIngestion | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.getStats(),
      sourcesApi.getDashboardIngestion(),
      adminApi.getAnalytics(days),
    ])
      .then(([s, i, a]) => {
        setStats(s);
        setIngestion(i);
        setAnalytics(a);
      })
      .catch(() => {
        setStats(null);
        setIngestion(null);
      })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p className={styles.status}>Loading dashboard...</p>;
  if (!stats || !ingestion) return <p className={styles.error}>Failed to load dashboard.</p>;

  const ingestionCards = [
    { label: 'Pending moderation', value: ingestion.pendingModeration, to: '/admin/moderation' },
    { label: 'Sources active', value: ingestion.sourcesActive, to: '/admin/sources' },
    { label: 'Messages scanned today', value: ingestion.messagesScannedToday, to: '/admin/sources' },
    { label: 'Jobs extracted today', value: ingestion.jobsExtractedToday, to: '/admin/moderation' },
    { label: 'Duplicates removed', value: ingestion.duplicatesRemoved, to: '/admin/moderation' },
    { label: 'Avg AI confidence', value: `${Math.round(ingestion.averageAiConfidence)}%`, to: '/admin/moderation' },
  ];

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.pageEyebrow}>Overview</p>
          <h2 className={styles.pageTitle}>Ingestion dashboard</h2>
          <p className={styles.pageSubtitle}>
            Monitor pipeline health before jobs reach the marketplace.
          </p>
        </div>
        <div className={styles.actions}>
          <Link to="/admin/moderation" className={styles.btnPrimary}>Open moderation</Link>
          <Link to="/admin/sources" className={styles.btn}>Manage sources</Link>
        </div>
      </header>

      <div className={styles.ingestionGrid}>
        {ingestionCards.map((card) => (
          <Link key={card.label} to={card.to} className={styles.ingestionCard}>
            <span className={styles.ingestionValue}>{card.value}</span>
            <span className={styles.ingestionLabel}>{card.label}</span>
          </Link>
        ))}
      </div>

      {analytics && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Platform trends</h3>
            <div className={styles.filterGroup}>
              {ANALYTICS_RANGES.map((range) => (
                <button
                  key={range.label}
                  type="button"
                  className={`${styles.filterBtn} ${days === range.days ? styles.filterBtnActive : ''}`}
                  onClick={() => setDays(range.days)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.chartGrid}>
            <AdminTrendChart title="Jobs posted" data={analytics.jobsPerDay} />
            <AdminTrendChart title="Applications" data={analytics.applicationsPerDay} />
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Platform snapshot</h3>
        <div className={styles.metricsRowCompact}>
          <div className={styles.metricCard}><span className={styles.metricValue}>{stats.totalUsers}</span><span className={styles.metricLabel}>Users</span></div>
          <div className={styles.metricCard}><span className={styles.metricValue}>{stats.totalCompanies}</span><span className={styles.metricLabel}>Companies</span></div>
          <div className={styles.metricCard}><span className={styles.metricValue}>{stats.totalJobs}</span><span className={styles.metricLabel}>Jobs</span></div>
          <div className={styles.metricCard}><span className={styles.metricValue}>{stats.totalApplications}</span><span className={styles.metricLabel}>Applications</span></div>
        </div>
      </div>
    </section>
  );
}
