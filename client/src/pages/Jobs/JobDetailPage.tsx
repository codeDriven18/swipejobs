import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';
import { applicationsApi } from '@/api/applicationsApi';
import { jobsApi } from '@/api/jobsApi';
import { savedJobsApi } from '@/api/savedJobsApi';
import { formatSalary } from '@/lib/jobFormat';
import { PageHeader } from '@/components/ui/PageHeader';
import { CompanyLink } from '@/components/jobs/CompanyLink';
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
        setActionMsg('Removed from saved jobs');
      } else {
        await savedJobsApi.save(id);
        setSaved(true);
        setActionMsg('Job saved!');
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated) { requireAuth(); return; }
    if (!profile) { navigate('/profile'); return; }
    if (!id) return;
    setActionError(null);
    setActionMsg(null);
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
    }
  };

  if (loading) return <p className={styles.status}>Loading...</p>;
  if (!job) return <p className={styles.status}>Job not found.</p>;

  return (
    <section className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate('/jobs')}>← Back</button>
      <PageHeader title={job.title} />
      <CompanyLink name={job.company} slug={job.companySlug} className={styles.companyLink} />

      <TrendingBadges badges={job.trendingBadges} />

      <div className={styles.badges}>
        <span className={styles.badge}>{JobCategoryLabels[job.category]}</span>
        {job.isRemote && <span className={styles.badgeOutline}>Remote</span>}
        {job.level > 0 && <span className={styles.badgeOutline}>{JobLevelLabels[job.level]}</span>}
      </div>

      <div className={styles.info}>
        <p><strong>Location:</strong> {job.city ?? job.location ?? 'Flexible'}</p>
        <p><strong>Salary:</strong> {formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl)}</p>
        {job.sourceName && <p><strong>Source:</strong> {job.sourceName}</p>}
      </div>

      {job.tags.length > 0 && (
        <div className={styles.tags}>
          {job.tags.map((t) => <span key={t.id} className={styles.tag}>{t.name}</span>)}
        </div>
      )}

      <div className={styles.description}>
        <h2>Description</h2>
        <p>{job.description}</p>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.saveBtn} onClick={() => void handleSave()}>
          {saved ? 'Saved ♥' : 'Save ♡'}
        </button>
        <button type="button" className={styles.applyBtn} disabled={applied} onClick={() => void handleApply()}>
          {applied ? 'Applied ✓' : 'Quick Apply'}
        </button>
      </div>

      {!applied && (
        <p className={styles.applyNote}>
          Saves your profile to this application. The company is not notified yet.
        </p>
      )}

      {actionMsg && <p className={styles.success}>{actionMsg}</p>}
      {actionError && <p className={styles.error}>{actionError}</p>}
    </section>
  );
}
