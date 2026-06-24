import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { PipelineListSkeleton } from '@/portal/components/PortalSkeleton';
import { usePipelineBoard } from '@/hooks/usePipelineBoard';
import { PIPELINE_COLUMNS } from '@/lib/employer/pipelineArchitecture';
import { candidateProfilePath } from '@/lib/employer/hiringNavigation';
import { pipelineStageLabel } from '@/lib/employer/employerWorkspaceData';
import { PipelineStage } from '@/models/enums';
import ws from '@/portal/workspace.module.css';

type SortKey = 'recent' | 'name' | 'stage';

interface PipelineListViewProps {
  jobId?: string;
}

export function PipelineListView({ jobId }: PipelineListViewProps) {
  const { applications, loading, failed, refresh } = usePipelineBoard(jobId);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | ''>('');
  const [sort, setSort] = useState<SortKey>('recent');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = applications.filter((a) => !a.isWithdrawn);

    if (stageFilter) {
      list = list.filter((a) => a.pipelineStage === stageFilter);
    }

    if (query) {
      list = list.filter(
        (a) =>
          a.applicantName.toLowerCase().includes(query)
          || a.jobTitle.toLowerCase().includes(query)
          || a.applicantEmail.toLowerCase().includes(query),
      );
    }

    list = [...list].sort((a, b) => {
      if (sort === 'name') {
        return a.applicantName.localeCompare(b.applicantName);
      }
      if (sort === 'stage') {
        return a.pipelineStage - b.pipelineStage;
      }
      return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
    });

    return list;
  }, [applications, search, stageFilter, sort]);

  if (loading) {
    return <PipelineListSkeleton />;
  }

  if (failed) {
    return (
      <EmptyState
        illustration="applications"
        title="Couldn't load your pipeline"
        description="A network error occurred. Try refreshing."
        actions={[{ label: 'Retry', onClick: refresh, primary: true }]}
      />
    );
  }

  return (
    <div className={ws.pipelineList}>
      <div className={ws.pipelineListControls}>
        <input
          type="search"
          className={ws.pipelineListSearch}
          placeholder="Search by name, email, or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search candidates"
        />
        <select
          className={ws.pipelineListSelect}
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as PipelineStage | '')}
          aria-label="Filter by stage"
        >
          <option value="">All stages</option>
          {PIPELINE_COLUMNS.map((col) => (
            <option key={col.id} value={col.id}>{col.label}</option>
          ))}
        </select>
        <select
          className={ws.pipelineListSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort candidates"
        >
          <option value="recent">Most recent</option>
          <option value="name">Name</option>
          <option value="stage">Stage</option>
        </select>
      </div>

      <p className={ws.pipelineListMeta}>
        {filtered.length} candidate{filtered.length === 1 ? '' : 's'}
        {jobId ? ' · Filtered by role' : ''}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          illustration="applications"
          title={applications.length === 0
            ? 'Your pipeline is empty'
            : 'No candidates match your filters'}
          description={applications.length === 0
            ? 'Share your job posting and candidates will start appearing here as they apply.'
            : 'Try a different name, stage, or clear the search to see all candidates.'}
          actions={applications.length === 0
            ? [
                { label: 'View active roles', to: '/portal/jobs', primary: true },
                { label: 'Switch to board view', onClick: () => {}, },
              ]
            : [{ label: 'Clear filters', onClick: () => { setSearch(''); setStageFilter(''); }, primary: true }]}
        />
      ) : (
        <div className={ws.pipelineListRows}>
          <div className={ws.pipelineListHeader} aria-hidden>
            <span>Candidate</span>
            <span>Role</span>
            <span>Stage</span>
            <span>Applied</span>
            <span />
          </div>
          {filtered.map((app) => {
            const [firstName, ...rest] = app.applicantName.split(' ');
            const lastName = rest.join(' ');
            const applied = new Date(app.appliedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });

            return (
              <article key={app.id} className={ws.pipelineListRow}>
                <div className={ws.pipelineListCandidate}>
                  <UserAvatar
                    profile={{
                      firstName,
                      lastName,
                      email: app.applicantEmail,
                      profileImageUrl: app.applicantProfileImageUrl,
                    }}
                    size="sm"
                  />
                  <div className={ws.pipelineListIdentity}>
                    <strong>{app.applicantName}</strong>
                    <span>{app.applicantEmail}</span>
                  </div>
                </div>
                <span className={ws.pipelineListRole}>{app.jobTitle}</span>
                <span className={ws.badgeMuted}>{pipelineStageLabel(app)}</span>
                <span className={ws.pipelineListDate}>{applied}</span>
                <Link
                  to={candidateProfilePath(app.id, { from: 'list', jobId })}
                  className={ws.pipelineListAction}
                >
                  Open profile
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
