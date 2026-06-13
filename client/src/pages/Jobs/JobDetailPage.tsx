import { useEffect, useMemo, useState } from 'react';
import { IconChevronLeft } from '@/components/icons/Icons';
import { JobShareMenu } from '@/components/jobs/JobShareMenu';
import { JobHeroImage } from '@/components/jobs/JobHeroImage';
import { SourceBadge } from '@/components/jobs/SourceBadge';
import { CompanyIdentityStrip } from '@/components/jobs/CompanyIdentityStrip';
import { resolveJobImage } from '@/lib/resolveJobImage';
import { getJobCanonicalUrl, resolveShareImageUrl } from '@/lib/shareUrls';
import { getFriendlyErrorMessage } from '@/lib/friendlyError';
import { usePageMeta } from '@/hooks/usePageMeta';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';
import { applicationsApi } from '@/api/applicationsApi';
import { jobsApi } from '@/api/jobsApi';
import { savedJobsApi } from '@/api/savedJobsApi';
import { formatSalary } from '@/lib/jobFormat';
import {
  blocksNewApplication,
  canReapplyToJob,
  getLatestApplicationForJob,
} from '@/lib/applicationHelpers';
import { CompanyLink } from '@/components/jobs/CompanyLink';
import { CompanyLogo } from '@/components/jobs/CompanyLogo';
import { Button } from '@/components/ui/Button';
import { JobDetailSkeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useProfile } from '@/hooks/useProfile';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { ApplicationStatus, JobCategoryLabels, JobLevelLabels } from '@/models/enums';
import { TrendingBadges } from '@/components/ui/TrendingBadge';
import type { JobApplication } from '@/models/application';
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
  const [latestApplication, setLatestApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [applying, setApplying] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const canReapply = canReapplyToJob(latestApplication ?? undefined);
  const isBlocked = blocksNewApplication(latestApplication ?? undefined);
  const isRejected = latestApplication?.status === ApplicationStatus.Rejected;
  const isWithdrawn = latestApplication?.status === ApplicationStatus.Withdrawn;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setFetchFailed(false);
    jobsApi.getById(id)
      .then(setJob)
      .catch(() => {
        setJob(null);
        setFetchFailed(true);
      })
      .finally(() => setLoading(false));
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
      setLatestApplication(getLatestApplicationForJob(list, id) ?? null);
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
      setActionError(getFriendlyErrorMessage(e, 'Failed to save'));
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated) { requireAuth(); return; }
    if (!profile) { navigate('/profile'); return; }
    if (!id || isBlocked) return;
    setActionError(null);
    setActionMsg(null);
    setApplying(true);
    try {
      const application = await applicationsApi.apply(id);
      setLatestApplication(application);
      setActionMsg(canReapply ? 'Application resubmitted!' : 'Application submitted!');
    } catch (e: unknown) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'error' in e.body) {
        setActionError(String((e.body as { error: string }).error));
        const msg = (e.body as { error: string }).error;
        if (msg.includes('Profile incomplete') || msg.includes('Profile not found')) {
          navigate('/profile');
        }
        return;
      }
      setActionError(getFriendlyErrorMessage(e, 'Apply failed'));
    } finally {
      setApplying(false);
    }
  };

  const applyButtonLabel = () => {
    if (applying) return 'Submitting…';
    if (isRejected || isWithdrawn) return 'Apply Again';
    if (isBlocked) return 'Applied';
    return 'Quick Apply';
  };

  const heroImage = useMemo(() => (job ? resolveJobImage(job) : null), [job]);

  const pageMeta = useMemo(() => {
    if (!job || !id) return null;
    const salary = formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl);
    return {
      title: `${job.title} at ${job.company} · SwipeJobs`,
      description: [salary, job.city ?? job.location, job.company].filter(Boolean).join(' · '),
      image: resolveShareImageUrl(job.jobImageUrl ?? job.aiGeneratedImageUrl ?? heroImage?.url),
      url: getJobCanonicalUrl(id),
    };
  }, [job, id, heroImage?.url]);

  usePageMeta(pageMeta);

  if (loading) {
    return (
      <section className={styles.page}>
        <JobDetailSkeleton />
      </section>
    );
  }

  if (fetchFailed || !job) {
    return (
      <section className={styles.page}>
        <EmptyState
          illustration="generic"
          title="Job not found"
          description="This listing may have been removed or is temporarily unavailable."
          actions={[
            { label: 'Browse jobs', to: '/jobs', primary: true },
            { label: 'Go back', onClick: () => navigate(-1) },
          ]}
        />
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <IconChevronLeft size={18} /> Back
      </button>

      <header className={styles.hero}>
        <div className={styles.heroBanner}>
          {heroImage && (
            <JobHeroImage
              image={heroImage}
              alt={`${job.title} at ${job.company}`}
              className={styles.heroBannerImage}
              priority
            />
          )}
          <div className={styles.heroBannerMeta}>
            <SourceBadge job={job} />
          </div>
        </div>
        <div className={styles.heroTop}>
          <CompanyLogo name={job.company} logoUrl={job.companyLogoUrl} size="lg" />
          <div className={styles.heroText}>
            <h1 className={styles.title}>{job.title}</h1>
            <CompanyLink name={job.company} slug={job.companySlug} className={styles.companyLink} />
          </div>
        </div>

        <div className={styles.companySection}>
          <CompanyIdentityStrip job={job} variant="detail" />
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

      {latestApplication && (
        <div className={styles.applicationStatus}>
          <div className={styles.applicationStatusRow}>
            {isRejected && <p className={styles.rejectedLabel}>Application Rejected</p>}
            <StatusBadge status={latestApplication.status} />
            {latestApplication.applicationNumber > 1 && (
              <span className={styles.applicationAttempt}>
                Attempt #{latestApplication.applicationNumber}
              </span>
            )}
          </div>
          {(isRejected || isWithdrawn) && (
            <p className={styles.reapplyHint}>
              Update your profile and apply again when you are ready.
            </p>
          )}
        </div>
      )}

      {job.tags.length > 0 && (
        <div className={styles.tags}>
          {job.tags.map((t) => <span key={t.id} className={styles.tag}>{t.name}</span>)}
        </div>
      )}

      <article className={`${styles.description} copyable-content`}>
        <h2 className={styles.sectionTitle}>About this role</h2>
        <p className={styles.descriptionText}>{job.description}</p>
        {job.sourceName && (
          <p className={styles.source}>Source: {job.sourceName}</p>
        )}
      </article>

      <JobShareMenu job={job} open={shareOpen} onClose={() => setShareOpen(false)} />

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
          className={styles.shareIcon}
          onClick={() => setShareOpen(true)}
          aria-label="Share job"
          whileTap={{ scale: 1.1 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
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
          disabled={isBlocked}
          onClick={() => void handleApply()}
        >
          {applyButtonLabel()}
        </Button>
      </footer>
    </section>
  );
}
