import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { EmployerPageHeader } from '@/components/employer/EmployerPageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePipelineBoard } from '@/hooks/usePipelineBoard';
import { PIPELINE_COLUMNS } from '@/lib/employer/pipelineArchitecture';
import { PipelineStage } from '@/models/enums';
import type { PortalJob } from '@/models/portal';
import {
  EMPTY_COLUMN_MESSAGES,
  PipelineColumn,
  STAGE_STYLE_CLASS,
} from './PipelineColumn';
import styles from './PipelineBoard.module.css';

export function PipelineBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get('jobId') ?? undefined;
  const [jobs, setJobs] = useState<PortalJob[]>([]);

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

  if (loading) {
    return <p className={styles.boardMeta}>Loading pipeline…</p>;
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
    <div className={styles.pipelineBoardPage}>
      <EmployerPageHeader
        title="Hiring pipeline"
        subtitle={`${totalCount} candidate${totalCount === 1 ? '' : 's'} across ${columns.length} stages`}
      />

      <div className={styles.boardToolbar}>
        <span className={styles.boardMeta}>
          Drag candidates between stages or use the card menu for quick actions.
        </span>
        {jobs.length > 0 && (
          <select
            className={styles.jobFilter}
            value={jobId ?? ''}
            aria-label="Filter by job"
            onChange={(event) => handleJobFilter(event.target.value)}
          >
            <option value="">All jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        )}
      </div>

      <div className={styles.boardShell}>
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
