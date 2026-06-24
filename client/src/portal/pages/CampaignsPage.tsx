import { useEffect, useState } from 'react';
import { portalApi } from '@/api/portalApi';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/ui/EmptyState';
import { CampaignsSkeleton } from '@/portal/components/PortalSkeleton';
import { useEmployerWorkspaceData } from '@/hooks/useEmployerWorkspaceData';
import { getJobCampaignMetrics } from '@/lib/employer/employerWorkspaceData';
import { JobCampaignCard } from '@/portal/components/JobCampaignCard';
import {
  JobCampaignWizard,
  type JobCampaignFormState,
} from '@/portal/components/JobCampaignWizard';
import { PageFrame } from '@/portal/components/PageFrame';
import ws from '@/portal/workspace.module.css';
import { useToast } from '@/context/ToastContext';
import { getFriendlyErrorMessage } from '@/lib/friendlyError';
import { JobCategory, JobLevel } from '@/models/enums';
import { CompanyStatus, CompanyStatusLabels } from '@/models/operations';
import type { PortalJob } from '@/models/portal';
import type { Company } from '@/models/company';

const emptyForm: JobCampaignFormState = {
  title: '',
  description: '',
  location: '',
  city: '',
  category: JobCategory.It,
  level: JobLevel.Junior,
  isRemote: false,
  salaryMin: '',
  salaryMax: '',
  coverImageUrl: '',
  isActive: true,
};

function getCreateErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const body = error.body as { error?: string; code?: string };
    if (body.code === 'company_not_approved') {
      return 'Your company must be approved before posting jobs.';
    }
    if (body.error) return body.error;
  }
  return getFriendlyErrorMessage(error, 'Failed to save job');
}

export function CampaignsPage() {
  const { showToast } = useToast();
  const { applications, activeJobs, loading, failed, refresh } = useEmployerWorkspaceData();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyStatus, setCompanyStatus] = useState<CompanyStatus | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JobCampaignFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    portalApi.getStats().then((stats) => setCompanyStatus(stats.companyStatus)).catch(() => setCompanyStatus(null));
    portalApi.getCompany().then(setCompany).catch(() => setCompany(null));
  }, []);

  const canPublish = companyStatus === CompanyStatus.Approved;

  const openCreate = () => {
    if (!canPublish) {
      showToast('Company approval required before posting jobs', 'error');
      return;
    }
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (job: PortalJob) => {
    setEditingId(job.id);
    setForm({
      title: job.title,
      description: job.description,
      location: job.location ?? '',
      city: job.city ?? '',
      category: job.category,
      level: job.level,
      isRemote: job.isRemote,
      salaryMin: job.salaryMin?.toString() ?? '',
      salaryMax: job.salaryMax?.toString() ?? '',
      coverImageUrl: job.jobImageUrl ?? '',
      isActive: job.isActive,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleArchive = async (id: string) => {
    setArchivingId(id);
    try {
      await portalApi.archiveJob(id);
      await refresh();
    } finally {
      setArchivingId(null);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim() || undefined,
        city: form.city.trim() || undefined,
        category: form.category,
        level: form.level,
        isRemote: form.isRemote,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        jobImageUrl: form.coverImageUrl.trim() || undefined,
      };
      if (editingId) {
        await portalApi.updateJob(editingId, { ...payload, isActive: form.isActive });
        showToast('Role updated', 'success');
      } else {
        await portalApi.createJob(payload);
        showToast('Role published', 'success');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      const message = getCreateErrorMessage(err);
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && activeJobs.length === 0) {
    return (
      <PageFrame meta="Loading campaigns…">
        <CampaignsSkeleton />
      </PageFrame>
    );
  }

  if (showForm) {
    return (
      <PageFrame
        meta={editingId ? 'Update this hiring campaign' : 'Launch a new hiring campaign'}
        actions={(
          <button type="button" className={ws.btnGhost} onClick={() => { setShowForm(false); setEditingId(null); }}>
            Back to campaigns
          </button>
        )}
      >
        <JobCampaignWizard
          key={editingId ?? 'new'}
          form={form}
          onChange={setForm}
          company={company}
          editingId={editingId}
          saving={saving}
          formError={formError}
          onSubmit={() => void handleSubmit()}
          onCancel={() => { setShowForm(false); setEditingId(null); }}
        />
      </PageFrame>
    );
  }

  return (
    <PageFrame
      meta={`${activeJobs.length} active campaigns`}
      actions={(
        <button type="button" className={ws.btnPrimary} disabled={!canPublish} onClick={openCreate}>Post role</button>
      )}
    >
      {!canPublish && companyStatus !== null && (
        <div className={ws.notice}>Blocked — {CompanyStatusLabels[companyStatus]}. Publishing unlocks after approval.</div>
      )}

      {failed ? (
        <EmptyState
          illustration="generic"
          title="Could not load your roles"
          description="A network error occurred. Check your connection and try again."
          actions={[{ label: 'Retry', onClick: () => void refresh(), primary: true }]}
        />
      ) : activeJobs.length === 0 ? (
        <EmptyState
          illustration="generic"
          title="No active hiring campaigns yet"
          description="Create your first role to start attracting candidates. It only takes a few minutes."
          actions={canPublish
            ? [
                { label: 'Post your first role →', onClick: openCreate, primary: true },
                { label: 'Complete company profile first', to: '/portal/company' },
              ]
            : [{ label: 'Complete company profile to unlock posting', to: '/portal/company', primary: true }]}
        />
      ) : (
        <div className={[ws.cardGrid, ws.cardGridWide].join(' ')}>
          {activeJobs.map((job) => (
            <JobCampaignCard
              key={job.id}
              job={job}
              metrics={getJobCampaignMetrics(job.id, applications)}
              onEdit={() => openEdit(job)}
              onArchive={() => void handleArchive(job.id)}
              archiving={archivingId === job.id}
            />
          ))}
        </div>
      )}
    </PageFrame>
  );
}
