import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { companiesApi } from '@/api/companiesApi';
import { companyFollowsApi } from '@/api/companyFollowsApi';
import { jobsApi } from '@/api/jobsApi';
import { JobCard } from '@/components/jobs/JobCard';
import { CompanyAvatar } from '@/components/profile/CompanyAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import type { Company } from '@/models/company';
import type { Job } from '@/models/job';
import styles from './CompanyPage.module.css';

export function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { trackCompanyView } = useActivityTracking();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);

    Promise.all([
      companiesApi.getBySlug(slug),
      jobsApi.search({ companySlug: slug, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' }),
    ])
      .then(([c, result]) => {
        setCompany(c);
        setJobs(result.items);
        if (isAuthenticated && c) {
          void trackCompanyView(c.id);
          companyFollowsApi.isFollowing(c.id)
            .then((r) => setFollowing(r.following))
            .catch(() => setFollowing(false));
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug, isAuthenticated, trackCompanyView]);

  const toggleFollow = async () => {
    if (!isAuthenticated || !company) {
      navigate('/login', { state: { from: `/companies/${slug}` } });
      return;
    }
    setFollowLoading(true);
    try {
      if (following) {
        await companyFollowsApi.unfollow(company.id);
        setFollowing(false);
      } else {
        await companyFollowsApi.follow(company.id);
        setFollowing(true);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return <p className={styles.status}>Loading company...</p>;
  if (error || !company) {
    return (
      <section className={styles.page}>
        <p className={styles.error}>Company not found.</p>
        <EmptyState
          icon="⌂"
          title="Unknown company"
          description="This company page doesn't exist or was removed."
          actions={[{ label: 'Browse jobs', to: '/jobs', primary: true }]}
        />
      </section>
    );
  }

  return (
    <motion.section
      className={styles.page}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div
        className={styles.banner}
        style={company.bannerUrl ? { backgroundImage: `url(${company.bannerUrl})` } : undefined}
        aria-hidden
      />

      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <CompanyAvatar company={company} size="lg" className={styles.logo} />
          <div>
            <h1 className={styles.heroTitle}>{company.name}</h1>
            <p className={styles.heroIndustry}>{company.industry}</p>
          </div>
        </div>

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Location</span>
            <span className={styles.metaValue}>{company.location || '—'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Company size</span>
            <span className={styles.metaValue}>{company.companySize || '—'}</span>
          </div>
        </div>

        <button
          type="button"
          className={following ? styles.followBtnActive : styles.followBtn}
          disabled={followLoading}
          onClick={() => void toggleFollow()}
        >
          {following ? 'Following ✓' : '+ Follow company'}
        </button>
      </div>

      <div className={styles.description}>
        <h2>About</h2>
        <p>{company.description || 'This company has not added a description yet.'}</p>
        <div className={styles.links}>
          {company.website && (
            <a href={company.website} className={styles.website} target="_blank" rel="noopener noreferrer">
              Visit website →
            </a>
          )}
          {company.linkedInUrl && (
            <a href={company.linkedInUrl} className={styles.website} target="_blank" rel="noopener noreferrer">
              LinkedIn →
            </a>
          )}
        </div>
      </div>

      <div className={styles.jobsSection}>
        <div className={styles.jobsHeader}>
          <h2 className={styles.jobsTitle}>Open jobs</h2>
          <span className={styles.jobsCount}>{jobs.length} listing{jobs.length !== 1 ? 's' : ''}</span>
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            icon="☰"
            title="No open jobs"
            description="This company has no active listings right now. Check back later."
            actions={[{ label: 'Browse all jobs', to: '/jobs', primary: true }]}
          />
        ) : (
          <div className={styles.jobList}>
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onClick={() => navigate(`/jobs/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
