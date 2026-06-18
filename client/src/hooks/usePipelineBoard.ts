import { useCallback, useEffect, useMemo, useState } from 'react';
import { portalApi } from '@/api/portalApi';
import { portalMessagingApi } from '@/api/messagingApi';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { PIPELINE_COLUMNS } from '@/lib/employer/pipelineArchitecture';
import {
  moveApplicationToStage,
  optimisticPatch,
  PIPELINE_STAGE_LABELS,
} from '@/lib/employer/pipelineMove';
import { PipelineStage } from '@/models/enums';
import type { PortalApplication } from '@/models/portal';

export interface PipelineBoardState {
  applications: PortalApplication[];
  grouped: Record<PipelineStage, PortalApplication[]>;
  loading: boolean;
  failed: boolean;
  jobId?: string;
  conversationByApplicationId: Record<string, string>;
  totalCount: number;
  refresh: () => void;
  moveToStage: (applicationId: string, targetStage: PipelineStage) => Promise<void>;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  dropTargetStage: PipelineStage | null;
  setDropTargetStage: (stage: PipelineStage | null) => void;
}

export function usePipelineBoard(jobId?: string): PipelineBoardState {
  const { showToast } = useToast();
  const [applications, setApplications] = useState<PortalApplication[]>([]);
  const [conversationByApplicationId, setConversationByApplicationId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<PipelineStage | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);

    Promise.all([
      portalApi.getApplications(jobId),
      portalMessagingApi.listConversations(),
    ])
      .then(([apps, conversations]) => {
        setApplications(apps);
        const map: Record<string, string> = {};
        for (const conversation of conversations) {
          map[conversation.applicationId] = conversation.id;
        }
        setConversationByApplicationId(map);
      })
      .catch(() => {
        setApplications([]);
        setConversationByApplicationId({});
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const buckets = Object.fromEntries(
      PIPELINE_COLUMNS.map((column) => [column.id, [] as PortalApplication[]]),
    ) as Record<PipelineStage, PortalApplication[]>;

    for (const application of applications) {
      const stage = application.pipelineStage;
      if (buckets[stage]) {
        buckets[stage].push(application);
      } else {
        buckets[PipelineStage.Applied].push(application);
      }
    }

    for (const stage of Object.keys(buckets) as unknown as PipelineStage[]) {
      buckets[stage].sort(
        (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
      );
    }

    return buckets;
  }, [applications]);

  const moveToStage = useCallback(async (applicationId: string, targetStage: PipelineStage) => {
    const current = applications.find((item) => item.id === applicationId);
    if (!current) return;
    if (current.pipelineStage === targetStage) return;

    const snapshot = applications;
    const optimistic = optimisticPatch(current, targetStage);

    setApplications((prev) => prev.map((item) => (item.id === applicationId ? optimistic : item)));

    try {
      const updated = await moveApplicationToStage(current, targetStage, jobId);
      setApplications((prev) => prev.map((item) => (item.id === applicationId ? updated : item)));
      showToast(`Moved to ${PIPELINE_STAGE_LABELS[targetStage]}`, 'success');
    } catch (error) {
      setApplications(snapshot);
      showToast(getApiErrorMessage(error, 'Could not move candidate'), 'error');
    }
  }, [applications, jobId, showToast]);

  return {
    applications,
    grouped,
    loading,
    failed,
    jobId,
    conversationByApplicationId,
    totalCount: applications.length,
    refresh: load,
    moveToStage,
    draggingId,
    setDraggingId,
    dropTargetStage,
    setDropTargetStage,
  };
}
