import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { ApiError } from '@/api/client';
import ui from '@/components/employer/ui/employerUi.module.css';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/context/ToastContext';
import { getFriendlyErrorMessage } from '@/lib/friendlyError';
import { JobCategory, JobLevel } from '@/models/enums';
import { CompanyStatus, CompanyStatusLabels } from '@/models/operations';
import type { PortalJob } from '@/models/portal';
import styles from './PortalJobsPage.module.css';

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
  const activeJobs = jobs.filter((job) => job.isActive);

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

  const openEdit = (job: PortalJob, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
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

  if (showForm) {
    return (
      <section className={ui.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>{editingId ? 'Edit role' : 'New role'}</h1>
          <button type="button" className={ui.btnGhost} onClick={() => { setShowForm(false); setEditingId(null); }}>Back to roles</button>
        </div>
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
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{activeJobs.length} active {activeJobs.length === 1 ? 'campaign' : 'campaigns'}</h1>
        <button type="button" className={ui.btnPrimary} disabled={!canPublish} onClick={openCreate}>Post role</button>
      </div>

      {!canPublish && companyStatus !== null && (
        <div className={ui.notice}>Blocked — {CompanyStatusLabels[companyStatus]}. Publishing unlocks after approval.</div>
      )}

      {loading ? <p className={ui.statusText}>Loading roles…</p> : failed ? (
        <EmptyState illustration="generic" title="Could not load jobs" description="Check your connection." actions={[{ label: 'Retry', onClick: load, primary: true }]} />
      ) : activeJobs.length === 0 ? (
        <EmptyState illustration="generic" title="No active campaigns" description="Publish a role to start receiving candidates." actions={canPublish ? [{ label: 'Post role', onClick: openCreate, primary: true }] : []} />
      ) : (
        <div className={styles.campaignList}>
          {activeJobs.map((job) => (
            <Link key={job.id} to={`/portal/pipeline?jobId=${job.id}`} className={styles.campaignRow}>
              <div className={styles.campaignRowMain}>
                <h2 className={styles.campaignTitle}>{job.title}</h2>
                <p className={styles.campaignMeta}>{job.city ?? job.location ?? 'No location'} · {job.isRemote ? 'Remote' : 'On-site'}</p>
              </div>
              <span className={ui.badgeSuccess}>Active</span>
              <button type="button" className={`${ui.btnGhost} ${styles.campaignEdit}`} onClick={(event) => openEdit(job, event)}>Edit</button>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
