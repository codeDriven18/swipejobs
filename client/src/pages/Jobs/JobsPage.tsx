import { IconSearch } from '@/components/icons/Icons';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';
import { applicationsApi } from '@/api/applicationsApi';
import { jobsApi } from '@/api/jobsApi';
import { savedJobsApi } from '@/api/savedJobsApi';
import { tagsApi } from '@/api/tagsApi';
import { JobCard } from '@/components/jobs/JobCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { JobCardSkeletonList } from '@/components/ui/Skeleton';
import { FilterDrawer } from '@/components/ui/FilterDrawer';
import { PageHeader } from '@/components/ui/PageHeader';
import { useJobFilters } from '@/hooks/useJobFilters';
import { useProfile } from '@/hooks/useProfile';
import type { Job } from '@/models/job';
import type { Tag } from '@/models/tag';
import styles from './JobsPage.module.css';

export function JobsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const filters = useJobFilters();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await jobsApi.search({
        ...filters.query,
        pageSize: 8,
      });
      setJobs(result.items);
      setTotalPages(result.totalPages);
    } finally {
      setLoading(false);
    }
  }, [filters.query]);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

  useEffect(() => {
    tagsApi.getAll().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    savedJobsApi.getMine().then((saved) => {
      setSavedJobIds(new Set(saved.map((s) => s.jobId)));
    }).catch(() => {});
    applicationsApi.getMine().then((apps) => {
      setAppliedJobIds(new Set(apps.map((a) => a.jobId)));
    }).catch(() => {});
  }, [isAuthenticated]);

  const toggleSave = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/jobs' } });
      return;
    }
    if (savedJobIds.has(jobId)) {
      await savedJobsApi.unsaveByJob(jobId);
      setSavedJobIds((prev) => { const n = new Set(prev); n.delete(jobId); return n; });
    } else {
      await savedJobsApi.save(jobId);
      setSavedJobIds((prev) => new Set(prev).add(jobId));
    }
  };

  const quickApply = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/jobs' } });
      return;
    }
    if (!profile) {
      navigate('/profile');
      return;
    }
    if (appliedJobIds.has(jobId)) return;

    setApplyingJobId(jobId);
    try {
      await applicationsApi.apply(jobId);
      setAppliedJobIds((prev) => new Set(prev).add(jobId));
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setAppliedJobIds((prev) => new Set(prev).add(jobId));
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <section className={styles.page}>
      <PageHeader title="Discover" subtitle="Find your next role." />

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search jobs..."
          value={filters.search}
          onChange={(e) => filters.updateParams({ search: e.target.value, page: '1' })}
        />
        <button type="button" className={styles.filterBtn} onClick={() => setFilterOpen(true)}>
          Filters
          {filters.activeFilterCount > 0 && (
            <span className={styles.filterCount}>{filters.activeFilterCount}</span>
          )}
        </button>
        <select
          className={styles.sort}
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const [sb, so] = e.target.value.split('-');
            filters.updateParams({ sortBy: sb, sortOrder: so });
          }}
        >
          <option value="createdAt-desc">Newest</option>
          <option value="createdAt-asc">Oldest</option>
          <option value="title-asc">Title A–Z</option>
          <option value="salary-desc">Salary high</option>
          <option value="salary-asc">Salary low</option>
        </select>
      </div>

      {loading ? (
        <JobCardSkeletonList count={4} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<IconSearch size={28} />}
          title="No jobs found"
          description="Try clearing filters or broadening your search. We have gigs and IT roles across Germany."
          actions={[
            { label: 'Clear filters', onClick: () => filters.updateParams({
              search: null, category: null, city: null, isRemote: null,
              salaryMin: null, tags: null, page: '1',
            }), primary: true },
            { label: 'Try swipe mode', to: '/swipe' },
          ]}
        />
      ) : (
        <div className={styles.grid}>
          {jobs.map((job, index) => (
            <JobCard
              key={job.id}
              job={job}
              index={index}
              saved={savedJobIds.has(job.id)}
              applied={appliedJobIds.has(job.id)}
              applying={applyingJobId === job.id}
              onClick={() => navigate(`/jobs/${job.id}`)}
              onSaveToggle={(e) => void toggleSave(e, job.id)}
              onQuickApply={(e) => void quickApply(e, job.id)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button type="button" disabled={filters.page <= 1}
            onClick={() => filters.updateParams({ page: String(filters.page - 1) })}>Prev</button>
          <span>{filters.page} / {totalPages}</span>
          <button type="button" disabled={filters.page >= totalPages}
            onClick={() => filters.updateParams({ page: String(filters.page + 1) })}>Next</button>
        </div>
      )}

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        tags={tags}
        category={filters.category}
        city={filters.city}
        isRemote={filters.isRemote}
        salaryMin={filters.salaryMin}
        selectedTags={filters.selectedTags}
        onApply={(f) => {
          filters.updateParams({
            category: f.category,
            city: f.city || null,
            isRemote: f.isRemote,
            salaryMin: f.salaryMin || null,
            tags: f.selectedTags || null,
            page: '1',
          });
        }}
      />
    </section>
  );
}
