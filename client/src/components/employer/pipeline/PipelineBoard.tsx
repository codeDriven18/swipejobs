import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePipelineBoard } from '@/hooks/usePipelineBoard';
import { PIPELINE_COLUMNS } from '@/lib/employer/pipelineArchitecture';
import { PipelineStage } from '@/models/enums';
import type { PortalJob } from '@/models/portal';
import comp from '@/styles/employerComposition.module.css';
import {
  EMPTY_COLUMN_MESSAGES,
  PipelineColumn,
  STAGE_STYLE_CLASS,
} from './PipelineColumn';
import styles from './PipelineBoard.module.css';

const COLUMN_PARAM_MAP: Record<string, PipelineStage> = {
  interview: PipelineStage.Interview,
  applied: PipelineStage.Applied,
  reviewing: PipelineStage.Reviewing,
  offer: PipelineStage.Offer,
  hired: PipelineStage.Hired,
};

function PipelineBoardSkeleton() {
  return (
    <div className={styles.boardShell} aria-busy="true" aria-label="Loading pipeline">
      <div className={styles.boardScroll}>
        <div className={styles.boardGrid}>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className={styles.columnSkeleton}>
              <span className={styles.columnSkeletonHead} />
              <span className={styles.columnSkeletonCard} />
              <span className={styles.columnSkeletonCard} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PipelineBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get('jobId') ?? undefined;
  const columnParam = searchParams.get('column');
  const [jobs, setJobs] = useState<PortalJob[]>([]);
  const columnRefs = useRef<Partial<Record<PipelineStage, HTMLElement | null>>>({});

  const {
    grouped,
    loading,
    failed,
    totalCount,
    refresh,
    moveToStage,
    draggingId,
    setDraggingId,
    dropTargetStage,
    setDropTargetStage,
    conversationByApplicationId,
  } = usePipelineBoard(jobId);

  useEffect(() => {
    portalApi.getJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  const handleJobFilter = useCallback((value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('jobId', value);
    else next.delete('jobId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleDragStart = useCallback((applicationId: string) => {
    setDraggingId(applicationId);
  }, [setDraggingId]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetStage(null);
  }, [setDraggingId, setDropTargetStage]);

  const handleDragEnter = useCallback((stage: PipelineStage) => {
    setDropTargetStage(stage);
  }, [setDropTargetStage]);

  const handleDrop = useCallback((targetStage: PipelineStage) => {
    const activeId = draggingId;
    setDraggingId(null);
    setDropTargetStage(null);
    if (!activeId) return;
    void moveToStage(activeId, targetStage);
  }, [draggingId, moveToStage, setDraggingId, setDropTargetStage]);

  const columns = useMemo(
    () => PIPELINE_COLUMNS.map((column) => ({
      ...column,
      applications: grouped[column.id] ?? [],
    })),
    [grouped],
  );

  const selectedJobTitle = jobs.find((job) => job.id === jobId)?.title;

  const unreadTotal = useMemo(
    () => columns.reduce(
      (sum, column) => sum + column.applications.reduce((s, app) => s + app.unreadMessageCount, 0),
      0,
    ),
    [columns],
  );

  const interviewCount = useMemo(
    () => (grouped[PipelineStage.Interview] ?? []).length,
    [grouped],
  );

  useEffect(() => {
    if (loading || !columnParam) return;
    const stage = COLUMN_PARAM_MAP[columnParam.toLowerCase()];
    if (stage == null) return;
    const node = columnRefs.current[stage];
    node?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }, [columnParam, loading]);

  if (loading) {
    return (
      <div className={`${styles.pipelineBoardPage} ${comp.focalPage}`}>
        <div className={styles.boardToolbar}>
          <div>
            <p className={styles.boardEyebrow}>Hiring board</p>
            <h1 className={styles.boardTitle}>Pipeline</h1>
          </div>
        </div>
        <PipelineBoardSkeleton />
      </div>
    );
  }

  if (failed) {
    return (
      <EmptyState
        illustration="applications"
        title="Could not load pipeline"
        description="Check your connection and try again."
        actions={[{ label: 'Retry', onClick: refresh, primary: true }]}
      />
    );
  }

  return (
    <div className={`${styles.pipelineBoardPage} ${comp.focalPage}`}>
      <div className={styles.boardToolbar}>
        <div className={styles.boardToolbarMain}>
          <p className={styles.boardEyebrow}>Hiring board</p>
          <h1 className={styles.boardTitle}>
            Pipeline
            <span className={styles.boardMeta}>
              {totalCount} candidate{totalCount === 1 ? '' : 's'}
              {selectedJobTitle ? ` · ${selectedJobTitle}` : ''}
            </span>
          </h1>
          <div className={styles.boardStats} aria-label="Pipeline summary">
            {unreadTotal > 0 && (
              <Link to="/portal/messages" className={styles.boardStatLive}>
                {unreadTotal} unread
              </Link>
            )}
            {interviewCount > 0 && (
              <span className={styles.boardStat}>{interviewCount} interviewing</span>
            )}
          </div>
        </div>
        <div className={styles.boardToolbarActions}>
          {jobs.length > 0 && (
            <select
              className={styles.jobFilter}
              value={jobId ?? ''}
              aria-label="Filter by job"
              onChange={(event) => handleJobFilter(event.target.value)}
            >
              <option value="">All roles</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          )}
          <Link to="/portal/applications" className={styles.boardLink}>Candidates</Link>
          <Link to="/portal/messages" className={styles.boardLink}>Messages</Link>
        </div>
      </div>

      <div className={`${styles.boardShell} ${comp.focalDominant}`}>
        <div className={styles.boardScroll} role="region" aria-label="Hiring pipeline board">
          <div className={styles.boardGrid}>
            {columns.map((column) => (
              <PipelineColumn
                key={column.id}
                stage={column.id}
                label={column.label}
                stageClass={STAGE_STYLE_CLASS[column.id]}
                applications={column.applications}
                emptyMessage={EMPTY_COLUMN_MESSAGES[column.id]}
                isDropTarget={dropTargetStage === column.id}
                draggingId={draggingId}
                conversationByApplicationId={conversationByApplicationId}
                columnRef={(node) => { columnRefs.current[column.id] = node; }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragEnter={handleDragEnter}
                onDrop={handleDrop}
                onMove={moveToStage}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
