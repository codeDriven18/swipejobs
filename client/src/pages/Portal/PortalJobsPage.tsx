import { useEffect, useState, type FormEvent } from 'react';
import { portalApi } from '@/api/portalApi';
import { ApiError } from '@/api/client';
import { JobCampaignCard } from '@/components/employer/entities/JobCampaignCard';
import ui from '@/components/employer/ui/employerUi.module.css';
import layout from '@/styles/employerComposition.module.css';
import { useEmployerWorkspaceData } from '@/hooks/useEmployerWorkspaceData';
import { getJobCampaignMetrics } from '@/lib/employer/employerWorkspaceData';
import { EmptyState } from '@/components/ui/EmptyState';
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

export function PortalJobsPage() {
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
      <section className={ui.page}>
        <header className={layout.workspaceSectionHeader}>
          <h1 className={ui.workboardToolbarTitle}>{editingId ? 'Edit hiring campaign' : 'New hiring campaign'}</h1>
          <button type="button" className={ui.btnGhost} onClick={() => { setShowForm(false); setEditingId(null); }}>Back to roles</button>
        </header>
        <form className={ui.formPanel} onSubmit={(e) => void handleSubmit(e)}>
          {formError && <p className={ui.formError} role="alert">{formError}</p>}
          <div className={ui.field}>
            <label className={ui.label} htmlFor="title">Title</label>
            <input id="title" className={ui.input} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="description">Description</label>
            <textarea id="description" className={ui.textarea} required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className={ui.fieldRow}>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="city">City</label>
              <input id="city" className={ui.input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="location">Location</label>
              <input id="location" className={ui.input} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className={ui.fieldRow}>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="category">Category</label>
              <select id="category" className={ui.select} value={form.category} onChange={(e) => setForm({ ...form, category: Number(e.target.value) })}>
                <option value={JobCategory.It}>IT</option>
                <option value={JobCategory.Gig}>Gig</option>
              </select>
            </div>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="level">Level</label>
              <select id="level" className={ui.select} value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}>
                <option value={JobLevel.Internship}>Internship</option>
                <option value={JobLevel.Junior}>Junior</option>
                <option value={JobLevel.MidLevel}>Mid-Level</option>
                <option value={JobLevel.NotApplicable}>N/A</option>
              </select>
            </div>
          </div>
          <label className={ui.checkboxRow}><input type="checkbox" checked={form.isRemote} onChange={(e) => setForm({ ...form, isRemote: e.target.checked })} /> Remote role</label>
          {editingId && (
            <label className={ui.checkboxRow}><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active listing</label>
          )}
          <button type="submit" className={ui.btnPrimary} disabled={saving} style={{ alignSelf: 'flex-start' }}>{saving ? 'Saving…' : editingId ? 'Update role' : 'Publish role'}</button>
        </form>
      </section>
    );
  }

  return (
    <section className={ui.page}>
      {!canPublish && companyStatus !== null && (
        <div className={ui.notice}>Blocked — {CompanyStatusLabels[companyStatus]}. Publishing unlocks after approval.</div>
      )}

      <header className={layout.workspaceSectionHeader}>
        <div>
          <h1 className={ui.workboardToolbarTitle}>Hiring campaigns</h1>
          <p className={ui.workboardToolbarMeta}>{activeJobs.length} active campaigns</p>
        </div>
        <button type="button" className={ui.btnPrimary} disabled={!canPublish} onClick={openCreate}>Post role</button>
      </header>

      {loading ? <p className={ui.statusText}>Loading campaigns…</p> : failed ? (
        <EmptyState illustration="generic" title="Could not load jobs" description="Check your connection." actions={[{ label: 'Retry', onClick: () => void refresh(), primary: true }]} />
      ) : activeJobs.length === 0 ? (
        <EmptyState illustration="generic" title="No active campaigns" description="Publish a role to start receiving candidates." actions={canPublish ? [{ label: 'Post role', onClick: openCreate, primary: true }] : []} />
      ) : (
        <div className={`${layout.entityGrid} ${layout.entityGridWide}`}>
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
    </section>
  );
}
