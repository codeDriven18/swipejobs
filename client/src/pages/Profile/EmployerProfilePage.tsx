import { IconMapPin } from '@/components/icons/Icons';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { CompanyAvatar } from '@/components/profile/CompanyAvatar';
import ui from '@/components/employer/ui/employerUi.module.css';
import comp from '@/styles/employerComposition.module.css';
import layout from '@/styles/employerComposition.module.css';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/lib/apiErrors';
import type { Company } from '@/models/company';
import type { PortalUpdateCompanyRequest } from '@/models/portal';
import styles from './EmployerProfilePage.module.css';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={ui.field}>
      <span className={ui.label}>{label}</span>
      {children}
    </label>
  );
}

export function EmployerProfilePage() {
  const { showToast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<PortalUpdateCompanyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    portalApi.getCompany()
      .then((c) => {
        setCompany(c);
        setForm({
          description: c.description ?? '',
          industry: c.industry ?? '',
          location: c.location ?? '',
          companySize: c.companySize ?? '',
          logoUrl: c.logoUrl ?? '',
          bannerUrl: c.bannerUrl ?? '',
          website: c.website ?? '',
          linkedInUrl: c.linkedInUrl ?? '',
        });
      })
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await portalApi.updateCompany(form);
      setCompany(updated);
      showToast('Company profile saved', 'success');
      setEditing(false);
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Save failed'), 'error');
    } finally {
      setSaving(false);
    }
  }, [form, showToast]);

  if (loading) {
    return <p className={ui.statusText}>Loading company profile…</p>;
  }

  if (!company || !form) {
    return (
      <section className={ui.page}>
        <div className={ui.placeholderPanel}>
          <h2 className={ui.sectionTitle}>Company profile unavailable</h2>
          <p className={ui.placeholderText}>Your employer account is not linked to a company yet.</p>
          <Link to="/portal" className={ui.btnPrimary}>Open dashboard</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={ui.page}>
      <article className={ui.profileHero}>
        <div
          className={ui.profileBanner}
          style={company.bannerUrl ? { backgroundImage: `url(${company.bannerUrl})` } : undefined}
          aria-hidden
        />
        <div className={ui.profileHeroBody}>
          <CompanyAvatar company={company} size="lg" className={styles.logo} />
          <div className={ui.profileHeroContent}>
            <h1 className={ui.profileName}>{company.name}</h1>
            <p className={ui.profileHeadline}>
              {company.industry || 'Add your industry'}
              {company.location && (
                <>
                  {' · '}
                  <IconMapPin size={16} className={styles.metaIcon} /> {company.location}
                </>
              )}
            </p>
            <div className={ui.profileActions}>
              <Link to={`/companies/${company.slug}`} className={ui.btnPrimary}>Public page</Link>
              <Link to="/portal/jobs" className={ui.btnGhost}>{company.openJobsCount} open {company.openJobsCount === 1 ? 'role' : 'roles'}</Link>
              <button type="button" className={ui.btnGhost} onClick={() => setEditing((value) => !value)}>
                {editing ? 'Done editing' : 'Edit brand'}
              </button>
            </div>
          </div>
        </div>
      </article>

      {editing && (
        <form className={ui.formPanel} onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <h2 className={ui.formTitle}>Edit company showcase</h2>
          <Field label="Description">
            <textarea className={ui.textarea} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className={ui.fieldRow}>
            <Field label="Industry">
              <input className={ui.input} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </Field>
            <Field label="Company size">
              <input className={ui.input} value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })} placeholder="51–200 employees" />
            </Field>
          </div>
          <Field label="Location">
            <input className={ui.input} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Website">
            <input className={ui.input} value={form.website ?? ''} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="LinkedIn">
            <input className={ui.input} value={form.linkedInUrl ?? ''} onChange={(e) => setForm({ ...form, linkedInUrl: e.target.value })} placeholder="https://linkedin.com/company/..." />
          </Field>
          <Field label="Logo URL">
            <input className={ui.input} value={form.logoUrl ?? ''} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Banner URL">
            <input className={ui.input} value={form.bannerUrl ?? ''} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} placeholder="https://..." />
          </Field>
          <button type="submit" className={ui.btnPrimary} disabled={saving} style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Saving…' : 'Save showcase'}
          </button>
        </form>
      )}

      <div className={layout.companyShowcase}>
        <article className={`${ui.profileSection} ${comp.profileBody}`}>
          <section className={comp.profileBlock}>
            <h2 className={ui.profileSectionTitle}>Company overview</h2>
            <p className={styles.aboutText}>
              {company.description.trim() || 'Describe your mission, culture, and what makes your team unique.'}
            </p>
          </section>

          <section className={comp.profileBlock}>
            <h2 className={ui.profileSectionTitle}>Culture</h2>
            <p className={styles.aboutText}>
              {company.description.trim()
                ? 'Your public company page highlights this story to candidates before they apply.'
                : 'Add a description to showcase your culture and values to candidates.'}
            </p>
          </section>

          {(company.website || company.linkedInUrl) && (
            <section className={comp.profileBlock}>
              <h2 className={ui.profileSectionTitle}>Links</h2>
              <ul className={styles.linkList}>
                {company.website && <li><a href={company.website} target="_blank" rel="noopener noreferrer">Website</a></li>}
                {company.linkedInUrl && <li><a href={company.linkedInUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>}
              </ul>
            </section>
          )}
        </article>

        <aside className={layout.workspaceSection}>
          <article className={ui.profileSidebar}>
            <h2 className={ui.profileSidebarTitle}>Team size</h2>
            <p className={styles.aboutText}>{company.companySize || 'Add company size'}</p>
          </article>
          <article className={ui.profileSidebar}>
            <h2 className={ui.profileSidebarTitle}>Open roles</h2>
            <p className={styles.aboutText}>{company.openJobsCount} active {company.openJobsCount === 1 ? 'role' : 'roles'}</p>
            <Link to="/portal/jobs" className={ui.btnPrimary}>Manage roles</Link>
          </article>
          <article className={ui.profileSidebar}>
            <h2 className={ui.profileSidebarTitle}>Benefits</h2>
            <p className={styles.aboutText}>Highlight benefits on your public company page as you expand your employer brand.</p>
          </article>
        </aside>
      </div>
    </section>
  );
}
