import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '@/api/adminApi';
import type { AdminSystemHealth } from '@/models/admin';
import styles from './AdminPage.module.css';

export function AdminSystemPage() {
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getSystemHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={styles.status}>Loading platform health...</p>;
  if (!health) return <p className={styles.error}>Failed to load platform health.</p>;

  const isHealthy = (status: string) => status.toLowerCase() === 'healthy';

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Platform Health</h1>
          <p className={styles.pageSubtitle}>
            Last checked {new Date(health.checkedAt).toLocaleString()}
          </p>
        </div>
        <Link to="/admin/system/ai" className={styles.btnPrimary}>
          AI Diagnostics
        </Link>
      </header>

      <div className={styles.healthGrid}>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>API</div>
          <div className={`${styles.healthValue} ${isHealthy(health.apiStatus) ? styles.healthOk : styles.healthBad}`}>
            {health.apiStatus}
          </div>
        </div>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Database</div>
          <div className={`${styles.healthValue} ${isHealthy(health.databaseStatus) ? styles.healthOk : styles.healthBad}`}>
            {health.databaseStatus}
          </div>
        </div>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Total users</div>
          <div className={styles.healthValue}>{health.totalUsers}</div>
        </div>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Total companies</div>
          <div className={styles.healthValue}>{health.totalCompanies}</div>
        </div>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Total jobs</div>
          <div className={styles.healthValue}>{health.totalJobs}</div>
        </div>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Total applications</div>
          <div className={styles.healthValue}>{health.totalApplications}</div>
        </div>
      </div>
    </section>
  );
}
