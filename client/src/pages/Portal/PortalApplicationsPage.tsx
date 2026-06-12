import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { ApplicationStatusLabels } from '@/models/enums';
import type { PortalApplication } from '@/models/portal';
import styles from './PortalPage.module.css';

export function PortalApplicationsPage() {
  const [applications, setApplications] = useState<PortalApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.getApplications()
      .then(setApplications)
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={styles.status}>Loading applications...</p>;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Applications</h1>
        <p className={styles.subtitle}>{applications.length} applicants across your jobs</p>
      </header>

      {applications.length === 0 ? (
        <p className={styles.status}>No applications yet.</p>
      ) : (
        <div className={styles.list}>
          {applications.map((app) => (
            <article key={app.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.applicantRow}>
                  <UserAvatar
                    profile={{
                      firstName: app.applicantName.split(' ')[0] ?? '',
                      lastName: app.applicantName.split(' ').slice(1).join(' ') ?? '',
                      email: app.applicantEmail,
                      profileImageUrl: app.applicantProfileImageUrl,
                    }}
                    size="md"
                  />
                  <div>
                    <h2 className={styles.cardTitle}>{app.applicantName || 'Applicant'}</h2>
                    <p className={styles.cardMeta}>{app.applicantEmail}{app.applicantPhone ? ` · ${app.applicantPhone}` : ''}</p>
                  </div>
                </div>
                <span className={styles.badge}>{ApplicationStatusLabels[app.status]}</span>
              </div>
              <p className={styles.cardMeta}>
                Application #{app.applicationNumber} · Applied for <strong>{app.jobTitle}</strong> on {new Date(app.appliedAt).toLocaleDateString()}
              </p>
              <div className={styles.actions}>
                <Link to={`/portal/applications/${app.id}`} className={styles.btnAccent}>Review applicant</Link>
                <Link to={`/jobs/${app.jobId}`} className={styles.btn}>View job</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
