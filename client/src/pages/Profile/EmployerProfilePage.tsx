import { IconMapPin } from '@/components/icons/Icons';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { CompanyAvatar } from '@/components/profile/CompanyAvatar';
import { ProfileAppPanel } from '@/components/profile/ProfileAppPanel';
import { EmployerPageHeader } from '@/components/employer/EmployerPageHeader';
import ui from '@/components/employer/ui/employerUi.module.css';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/lib/apiErrors';
import type { Company } from '@/models/company';
import type { PortalUpdateCompanyRequest } from '@/models/portal';
import styles from './EmployerProfilePage.module.css';

type SectionId = 'profile' | 'account' | 'app';

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'profile', label: 'Overview' },
  { id: 'account', label: 'Account' },
  { id: 'app', label: 'App' },
];

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
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
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
        <EmptyStatePanel title="Company profile unavailable" description="Your employer account is not linked to a company yet." />
      </section>
    );
  }

  return (
    <section className={ui.page}>
      <EmployerPageHeader
        title="Company"
        subtitle="Your recruiting brand inside SwipeJobs."
        actions={(
          <Link to={`/companies/${company.slug}`} className={ui.btnGhost}>Public page</Link>
        )}
      />

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
            <p className={ui.profileHeadline}>{company.industry || 'Add your industry'}</p>
            <p className={ui.profileHeadline}>
              {company.location ? (
                <>
                  <IconMapPin size={16} className={styles.metaIcon} /> {company.location}
                </>
              ) : (
                'Add location'
              )}
            </p>
            <div className={ui.profileActions}>
              <button type="button" className={ui.btnPrimary} onClick={() => setEditing((v) => !v)}>
                {editing ? 'Close editor' : 'Edit company'}
              </button>
              <Link to="/portal/jobs" className={ui.btnGhost}>View roles</Link>
            </div>
          </div>
        </div>
      </article>

      <div className={ui.pillRow} role="tablist" aria-label="Company profile sections">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? ui.pillActive : ui.pill}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === 'profile' && (
        <div className={ui.content}>
          {editing && (
            <form className={ui.formPanel} onSubmit={(e) => { e.preventDefault(); void save(); }}>
              <h2 className={ui.formTitle}>Edit company profile</h2>
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
                {saving ? 'Saving…' : 'Save company profile'}
              </button>
            </form>
          )}

          <article className={ui.profileSection}>
            <h2 className={ui.profileSectionTitle}>About the company</h2>
            <p className={styles.aboutText}>
              {company.description.trim() || 'Describe your mission, culture, and what makes your team unique.'}
            </p>
          </article>

          <article className={ui.profileSection}>
            <h2 className={ui.profileSectionTitle}>Company details</h2>
            <div className={styles.metaGrid}>
              <div>
                <span className={styles.metaLabel}>Industry</span>
                <span>{company.industry || '—'}</span>
              </div>
              <div>
                <span className={styles.metaLabel}>Size</span>
                <span>{company.companySize || '—'}</span>
              </div>
              <div>
                <span className={styles.metaLabel}>Location</span>
                <span>{company.location || '—'}</span>
              </div>
              <div>
                <span className={styles.metaLabel}>Open jobs</span>
                <span>{company.openJobsCount}</span>
              </div>
            </div>
          </article>

          <article className={ui.profileSection}>
            <h2 className={ui.profileSectionTitle}>Links</h2>
            <ul className={styles.linkList}>
              {company.website && <li><a href={company.website} target="_blank" rel="noopener noreferrer">Website</a></li>}
              {company.linkedInUrl && <li><a href={company.linkedInUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>}
              {!company.website && !company.linkedInUrl && (
                <li className={styles.placeholder}>Add website and LinkedIn links.</li>
              )}
            </ul>
          </article>
        </div>
      )}

      {activeSection === 'account' && (
        <div className={ui.profileSection}>
          <h2 className={ui.profileSectionTitle}>Account</h2>
          <div className={ui.profileActions}>
            <Link to="/account" className={ui.btnGhost}>Change password & sign out</Link>
            <Link to="/portal/settings" className={ui.btnGhost}>Portal settings</Link>
          </div>
        </div>
      )}

      {activeSection === 'app' && (
        <div className={ui.profileSection}>
          <h2 className={ui.profileSectionTitle}>App</h2>
          <ProfileAppPanel />
        </div>
      )}
    </section>
  );
}

function EmptyStatePanel({ title, description }: { title: string; description: string }) {
  return (
    <div className={ui.placeholderPanel}>
      <h2 className={ui.sectionTitle}>{title}</h2>
      <p className={ui.placeholderText}>{description}</p>
      <Link to="/portal" className={ui.btnPrimary}>Open dashboard</Link>
    </div>
  );
}
