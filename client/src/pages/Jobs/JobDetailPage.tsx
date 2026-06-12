import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';
import { applicationsApi } from '@/api/applicationsApi';
import { jobsApi } from '@/api/jobsApi';
import { savedJobsApi } from '@/api/savedJobsApi';
import { formatSalary } from '@/lib/jobFormat';
import { CompanyLink } from '@/components/jobs/CompanyLink';
import { CompanyInitial } from '@/components/jobs/CompanyInitial';
import { Button } from '@/components/ui/Button';
import { JobDetailSkeleton } from '@/components/ui/Skeleton';
import { useProfile } from '@/hooks/useProfile';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { JobCategoryLabels, JobLevelLabels } from '@/models/enums';
import { TrendingBadges } from '@/components/ui/TrendingBadge';
import type { Job } from '@/models/job';
import styles from './JobDetailPage.module.css';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const { trackJobView } = useActivityTracking();
  const [job, setJob] = useState<Job | null>(null);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    jobsApi.getById(id).then(setJob).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !id || !job) return;
    void trackJobView(id);
  }, [isAuthenticated, id, job, trackJobView]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    savedJobsApi.getMine().then((list) => {
      setSaved(list.some((s) => s.jobId === id));
    });
    applicationsApi.getMine().then((list) => {
      setApplied(list.some((a) => a.jobId === id));
    });
  }, [isAuthenticated, id]);

  const requireAuth = () => {
    navigate('/login', { state: { from: `/jobs/${id}` } });
  };

  const handleSave = async () => {
    if (!isAuthenticated) { requireAuth(); return; }
    if (!id) return;
    setActionError(null);
    try {
      if (saved) {
        await savedJobsApi.unsaveByJob(id);
        setSaved(false);
        setActionMsg('Removed from saved');
      } else {
        await savedJobsApi.save(id);
        setSaved(true);
        setActionMsg('Saved to your list');
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated) { requireAuth(); return; }
    if (!profile) { navigate('/profile'); return; }
    if (!id || applied) return;
    setActionError(null);
    setActionMsg(null);
    setApplying(true);
    try {
      await applicationsApi.apply(id);
      setApplied(true);
      setActionMsg('Application submitted!');
    } catch (e: unknown) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'error' in e.body) {
        setActionError(String((e.body as { error: string }).error));
        const msg = (e.body as { error: string }).error;
        if (msg.includes('Profile incomplete') || msg.includes('Profile not found')) {
          navigate('/profile');
        }
        return;
      }
      setActionError(e instanceof Error ? e.message : 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <section className={styles.page}>
        <JobDetailSkeleton />
      </section>
    );
  }

  if (!job) {
    return (
      <section className={styles.page}>
        <p className={styles.status}>Job not found.</p>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <CompanyInitial name={job.company} size="lg" />
          <div className={styles.heroText}>
            <h1 className={styles.title}>{job.title}</h1>
            <CompanyLink name={job.company} slug={job.companySlug} className={styles.companyLink} />
          </div>
        </div>

        <TrendingBadges badges={job.trendingBadges} />

        <div className={styles.heroMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Salary</span>
            <span className={styles.metaValue}>
              {formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl)}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Location</span>
            <span className={styles.metaValue}>{job.city ?? job.location ?? 'Flexible'}</span>
          </div>
        </div>

        <div className={styles.badges}>
          <span className={styles.badge}>{JobCategoryLabels[job.category]}</span>
          {job.isRemote && <span className={styles.badgeMuted}>Remote</span>}
          {job.level > 0 && <span className={styles.badgeMuted}>{JobLevelLabels[job.level]}</span>}
        </div>
      </header>

      {job.tags.length > 0 && (
        <div className={styles.tags}>
          {job.tags.map((t) => <span key={t.id} className={styles.tag}>{t.name}</span>)}
        </div>
      )}

      <article className={styles.description}>
        <h2 className={styles.sectionTitle}>About this role</h2>
        <p className={styles.descriptionText}>{job.description}</p>
        {job.sourceName && (
          <p className={styles.source}>Source: {job.sourceName}</p>
        )}
      </article>

      <AnimatePresence>
        {actionMsg && (
          <motion.p
            className={styles.success}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {actionMsg}
          </motion.p>
        )}
      </AnimatePresence>
      {actionError && <p className={styles.error}>{actionError}</p>}

      <div className={styles.stickySpacer} aria-hidden />

      <footer className={styles.stickyBar}>
        <motion.button
          type="button"
          className={saved ? styles.saveIconActive : styles.saveIcon}
          onClick={() => void handleSave()}
          aria-label={saved ? 'Unsave job' : 'Save job'}
          whileTap={{ scale: 1.15 }}
        >
          <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
        <Button
          variant="primary"
          size="large"
          fullWidth
          loading={applying}
          disabled={applied}
          onClick={() => void handleApply()}
        >
          {applied ? 'Applied ✓' : 'Quick Apply'}
        </Button>
      </footer>
    </section>
  );
}
