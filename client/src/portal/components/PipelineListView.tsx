import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePipelineBoard } from '@/hooks/usePipelineBoard';
import { PIPELINE_COLUMNS } from '@/lib/employer/pipelineArchitecture';
import { candidateProfilePath } from '@/lib/employer/hiringNavigation';
import { pipelineStageLabel } from '@/lib/employer/employerWorkspaceData';
import { CandidateCard } from '@/portal/components/CandidateCard';
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
    return <p className={ws.statusText}>Loading candidates…</p>;
  }

  if (failed) {
    return (
      <EmptyState
        illustration="applications"
        title="Could not load candidates"
        description="Check your connection and try again."
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
          title="No candidates match"
          description={applications.length === 0
            ? 'Applications appear when candidates apply to your roles.'
            : 'Try adjusting search or filters.'}
          actions={applications.length === 0
            ? [{ label: 'Post a role', to: '/portal/jobs', primary: true }]
            : [{ label: 'Clear filters', onClick: () => { setSearch(''); setStageFilter(''); }, primary: true }]}
        />
      ) : (
        <div className={[ws.cardGrid, ws.cardGridWide].join(' ')}>
          {filtered.map((app) => (
            <div key={app.id} className={ws.pipelineListCardWrap}>
              <CandidateCard application={app} compact profileFrom="list" jobId={jobId} />
              <div className={ws.pipelineListCardFoot}>
                <span className={ws.badgeMuted}>{pipelineStageLabel(app)}</span>
                <Link
                  to={candidateProfilePath(app.id, { from: 'list', jobId })}
                  className={ws.btnPrimary}
                >
                  Open profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
