import { useCallback, useEffect, useState } from 'react';
import { portalApi } from '@/api/portalApi';
import { portalMessagingApi } from '@/api/messagingApi';
import type { ConversationSummary } from '@/models/messaging';
import type { PortalApplication, PortalJob } from '@/models/portal';

export function useEmployerWorkspaceData() {
  const [applications, setApplications] = useState<PortalApplication[]>([]);
  const [jobs, setJobs] = useState<PortalJob[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setFailed(false);
    return Promise.all([
      portalApi.getApplications(),
      portalApi.getJobs(),
      portalMessagingApi.listConversations(),
    ])
      .then(([appList, jobList, conversationList]) => {
        setApplications(appList);
        setJobs(jobList);
        setConversations(conversationList);
      })
      .catch(() => {
        setApplications([]);
        setJobs([]);
        setConversations([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    applications,
    jobs,
    conversations,
    activeJobs: jobs.filter((job) => job.isActive),
    loading,
    failed,
    refresh,
  };
}
