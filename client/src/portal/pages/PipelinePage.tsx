import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { PipelineBoard } from '@/components/employer/pipeline/PipelineBoard';
import { PipelineListView } from '@/portal/components/PipelineListView';
import ws from '@/portal/workspace.module.css';
import type { PortalJob } from '@/models/portal';

export function PipelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'list' ? 'list' : 'board';
  const jobId = searchParams.get('jobId') ?? undefined;
  const [jobs, setJobs] = useState<PortalJob[]>([]);

  useEffect(() => {
    portalApi.getJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  const setView = useCallback((nextView: 'board' | 'list') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextView === 'list') next.set('view', 'list');
      else next.delete('view');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleJobFilter = useCallback((value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('jobId', value);
      else next.delete('jobId');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const selectedJobTitle = jobs.find((job) => job.id === jobId)?.title;

  return (
    <div className={ws.pipelinePage}>
      <div className={ws.pipelineToolbar}>
        <div className={ws.pipelineToolbarMain}>
          <div className={ws.pipelineViewToggle} role="tablist" aria-label="Pipeline view">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'board'}
              className={[ws.pipelineViewBtn, view === 'board' ? ws.pipelineViewBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => setView('board')}
            >
              Board
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              className={[ws.pipelineViewBtn, view === 'list' ? ws.pipelineViewBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => setView('list')}
            >
              List
            </button>
          </div>
          {selectedJobTitle && (
            <span className={ws.pipelineToolbarMeta}>{selectedJobTitle}</span>
          )}
        </div>
        <div className={ws.pipelineToolbarActions}>
          {jobs.length > 0 && (
            <select
              className={ws.pipelineJobFilter}
              value={jobId ?? ''}
              aria-label="Filter by role"
              onChange={(e) => handleJobFilter(e.target.value)}
            >
              <option value="">All roles</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          )}
          <Link to="/portal/messages" className={ws.btnGhost}>Inbox</Link>
        </div>
      </div>

      {view === 'board' ? (
        <PipelineBoard hideToolbar />
      ) : (
        <PipelineListView jobId={jobId} />
      )}
    </div>
  );
}
