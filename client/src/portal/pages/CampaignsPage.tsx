import { useEffect, useState, type FormEvent } from 'react';
import { portalApi } from '@/api/portalApi';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEmployerWorkspaceData } from '@/hooks/useEmployerWorkspaceData';
import { getJobCampaignMetrics } from '@/lib/employer/employerWorkspaceData';
import { JobCampaignCard } from '@/portal/components/JobCampaignCard';
import { PageFrame } from '@/portal/components/PageFrame';
import ws from '@/portal/workspace.module.css';
import { useToast } from '@/context/ToastContext';
import { getFriendlyErrorMessage } from '@/lib/friendlyError';
import { JobCategory, JobLevel } from '@/models/enums';
import { CompanyStatus, CompanyStatusLabels } from '@/models/operations';
import type { PortalJob } from '@/models/portal';

const emptyForm = {
  title: '',
  description: '',
  location: '',
  city: '',
  category: JobCategory.It,
  level: JobLevel.Junior,
  isRemote: false,
  salaryMin: '',
  salaryMax: '',
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
  const [companyStatus, setCompanyStatus] = useState<CompanyStatus | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    portalApi.getStats().then((stats) => setCompanyStatus(stats.companyStatus)).catch(() => setCompanyStatus(null));
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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

  if (showForm) {
    return (
      <PageFrame
        meta={editingId ? 'Update role details and visibility' : 'Publish a new hiring campaign'}
        actions={(
          <button type="button" className={ws.btnGhost} onClick={() => { setShowForm(false); setEditingId(null); }}>
            Back to campaigns
          </button>
        )}
      >
        <form className={[ws.panel, ws.formPanel].join(' ')} onSubmit={(e) => void handleSubmit(e)}>
          {formError && <p className={ws.formError} role="alert">{formError}</p>}
          <div className={ws.field}>
            <label htmlFor="title">Title</label>
            <input id="title" className={ws.input} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className={ws.field}>
            <label htmlFor="description">Description</label>
            <textarea id="description" className={ws.textarea} required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className={ws.fieldRow}>
            <div className={ws.field}>
              <label htmlFor="city">City</label>
              <input id="city" className={ws.input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className={ws.field}>
              <label htmlFor="location">Location</label>
              <input id="location" className={ws.input} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className={ws.fieldRow}>
            <div className={ws.field}>
              <label htmlFor="category">Category</label>
              <select id="category" className={ws.select} value={form.category} onChange={(e) => setForm({ ...form, category: Number(e.target.value) })}>
                <option value={JobCategory.It}>IT</option>
                <option value={JobCategory.Gig}>Gig</option>
              </select>
            </div>
            <div className={ws.field}>
              <label htmlFor="level">Level</label>
              <select id="level" className={ws.select} value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}>
                <option value={JobLevel.Internship}>Internship</option>
                <option value={JobLevel.Junior}>Junior</option>
                <option value={JobLevel.MidLevel}>Mid-Level</option>
                <option value={JobLevel.NotApplicable}>N/A</option>
              </select>
            </div>
          </div>
          <label className={ws.checkboxRow}><input type="checkbox" checked={form.isRemote} onChange={(e) => setForm({ ...form, isRemote: e.target.checked })} /> Remote role</label>
          {editingId && (
            <label className={ws.checkboxRow}><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active listing</label>
          )}
          <button type="submit" className={ws.btnPrimary} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update role' : 'Publish role'}</button>
        </form>
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

      {loading ? <p className={ws.statusText}>Loading campaigns…</p> : failed ? (
        <EmptyState illustration="generic" title="Could not load jobs" description="Check your connection." actions={[{ label: 'Retry', onClick: () => void refresh(), primary: true }]} />
      ) : activeJobs.length === 0 ? (
        <EmptyState illustration="generic" title="No active campaigns" description="Publish a role to start receiving candidates." actions={canPublish ? [{ label: 'Post role', onClick: openCreate, primary: true }] : []} />
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
