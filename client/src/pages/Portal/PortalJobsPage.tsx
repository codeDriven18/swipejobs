import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { ApiError } from '@/api/client';
import { EmployerPageHeader } from '@/components/employer/EmployerPageHeader';
import ui from '@/components/employer/ui/employerUi.module.css';
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
  const [jobs, setJobs] = useState<PortalJob[]>([]);
  const [companyStatus, setCompanyStatus] = useState<CompanyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setFailed(false);
    Promise.all([portalApi.getJobs(), portalApi.getStats()])
      .then(([jobList, stats]) => {
        setJobs(jobList);
        setCompanyStatus(stats.companyStatus);
      })
      .catch(() => {
        setJobs([]);
        setCompanyStatus(null);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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
      load();
    } catch (err) {
      const message = getCreateErrorMessage(err);
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={ui.page}>
      <EmployerPageHeader
        title="Active hiring campaigns"
        subtitle="Manage the roles you're recruiting for."
        actions={(
          <button type="button" className={ui.btnPrimary} disabled={!canPublish && !showForm} onClick={() => (showForm && !editingId ? setShowForm(false) : openCreate())}>
            {showForm && !editingId ? 'Cancel' : 'Post new role'}
          </button>
        )}
      />

      {!canPublish && companyStatus !== null && (
        <div className={ui.notice}>Company status: {CompanyStatusLabels[companyStatus]}. Publishing unlocks after approval.</div>
      )}

      {showForm && (
        <form className={ui.formPanel} onSubmit={(e) => void handleSubmit(e)}>
          <h2 className={ui.formTitle}>{editingId ? 'Edit role' : 'New role'}</h2>
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
      )}

      {loading ? <p className={ui.statusText}>Loading roles…</p> : failed ? (
        <EmptyState illustration="generic" title="Could not load jobs" description="Check your connection." actions={[{ label: 'Retry', onClick: load, primary: true }]} />
      ) : jobs.length === 0 ? (
        <EmptyState illustration="generic" title="No active roles yet" description="Publish your first role to start hiring." actions={canPublish ? [{ label: 'Post new role', onClick: openCreate, primary: true }] : []} />
      ) : (
        <div className={ui.listStack}>
          {jobs.map((job) => (
            <article key={job.id} className={ui.campaignCard}>
              <div className={ui.campaignHeader}>
                <div>
                  <h2 className={ui.campaignTitle}>{job.title}</h2>
                  <p className={ui.campaignMeta}>{job.city ?? job.location ?? 'No location'} · {job.isRemote ? 'Remote' : 'On-site'}</p>
                </div>
                <span className={job.isActive ? ui.badgeSuccess : ui.badgeMuted}>{job.isActive ? 'Active' : 'Archived'}</span>
              </div>
              <p className={ui.campaignExcerpt}>{job.description.slice(0, 160)}{job.description.length > 160 ? '…' : ''}</p>
              <div className={ui.campaignActions}>
                <button type="button" className={ui.btnGhost} onClick={() => openEdit(job)}>Edit</button>
                <Link to={`/portal/applications?jobId=${job.id}`} className={ui.btnGhost}>Candidates</Link>
                <Link to="/portal/pipeline" className={ui.btnGhost}>Pipeline</Link>
                {job.isActive && <button type="button" className={ui.btnDanger} onClick={() => void handleArchive(job.id)}>Archive</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  async function handleArchive(id: string) {
    await portalApi.archiveJob(id);
    load();
  }
}
