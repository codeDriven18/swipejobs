import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { CompanyAvatar } from '@/components/profile/CompanyAvatar';
import { ProfileAppPanel } from '@/components/profile/ProfileAppPanel';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/lib/apiErrors';
import type { Company } from '@/models/company';
import type { PortalUpdateCompanyRequest } from '@/models/portal';
import styles from './ProfilePage.module.css';
import employerStyles from './EmployerProfilePage.module.css';

type SectionId = 'profile' | 'account' | 'app';

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'profile', label: 'Company' },
  { id: 'account', label: 'Account' },
  { id: 'app', label: 'App' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
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
    return (
      <section className={styles.page}>
        <p className={styles.panelHint}>Loading company profile…</p>
      </section>
    );
  }

  if (!company || !form) {
    return (
      <section className={styles.page}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Company profile unavailable</h2>
          <p className={styles.panelHint}>Your employer account is not linked to a company yet.</p>
          <Link to="/portal" className={styles.linkBtn}>Open company portal</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div
        className={employerStyles.banner}
        style={company.bannerUrl ? { backgroundImage: `url(${company.bannerUrl})` } : undefined}
        aria-hidden
      />
      <header className={employerStyles.identityCard}>
        <CompanyAvatar company={company} size="lg" className={employerStyles.logo} />
        <div className={employerStyles.identityBody}>
          <h1 className={styles.name}>{company.name}</h1>
          <p className={styles.headline}>{company.industry || 'Add your industry'}</p>
          <p className={styles.meta}>{company.location ? `📍 ${company.location}` : 'Add location'}</p>
          <div className={employerStyles.actions}>
            <button type="button" className={styles.editBtn} onClick={() => setEditing((v) => !v)}>
              {editing ? 'Close editor' : 'Edit company'}
            </button>
            <Link to={`/companies/${company.slug}`} className={styles.linkBtn}>Public page</Link>
          </div>
        </div>
      </header>

      <nav className={styles.sectionNav} aria-label="Company profile sections">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`${styles.sectionTab} ${activeSection === section.id ? styles.sectionTabActive : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {activeSection === 'profile' && (
        <div className={styles.identityStack}>
          {editing && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Edit company profile</h2>
              <Field label="Description">
                <textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <div className={styles.grid2}>
                <Field label="Industry">
                  <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                </Field>
                <Field label="Company size">
                  <input value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })} placeholder="51–200 employees" />
                </Field>
              </div>
              <Field label="Location">
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </Field>
              <Field label="Website">
                <input value={form.website ?? ''} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
              </Field>
              <Field label="LinkedIn">
                <input value={form.linkedInUrl ?? ''} onChange={(e) => setForm({ ...form, linkedInUrl: e.target.value })} placeholder="https://linkedin.com/company/..." />
              </Field>
              <Field label="Logo URL">
                <input value={form.logoUrl ?? ''} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." />
              </Field>
              <Field label="Banner URL">
                <input value={form.bannerUrl ?? ''} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} placeholder="https://..." />
              </Field>
              <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save company profile'}
              </button>
            </div>
          )}

          <article className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>About the company</h2>
            <p className={company.description.trim() ? styles.aboutText : styles.placeholderText}>
              {company.description.trim() || 'Describe your mission, culture, and what makes your team unique.'}
            </p>
          </article>

          <article className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Company details</h2>
            <div className={employerStyles.metaGrid}>
              <div>
                <span className={employerStyles.metaLabel}>Industry</span>
                <span>{company.industry || '—'}</span>
              </div>
              <div>
                <span className={employerStyles.metaLabel}>Size</span>
                <span>{company.companySize || '—'}</span>
              </div>
              <div>
                <span className={employerStyles.metaLabel}>Location</span>
                <span>{company.location || '—'}</span>
              </div>
              <div>
                <span className={employerStyles.metaLabel}>Open jobs</span>
                <span>{company.openJobsCount}</span>
              </div>
            </div>
          </article>

          <article className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Links</h2>
            <ul className={styles.linkList}>
              {company.website && <li><a href={company.website} target="_blank" rel="noopener noreferrer">Website</a></li>}
              {company.linkedInUrl && <li><a href={company.linkedInUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>}
              {!company.website && !company.linkedInUrl && (
                <li className={styles.placeholderText}>Add website and LinkedIn links.</li>
              )}
            </ul>
          </article>
        </div>
      )}

      {activeSection === 'account' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Account</h2>
          <Link to="/account" className={styles.linkBtn}>Change password & sign out</Link>
          <Link to="/portal" className={styles.linkBtn}>Company portal</Link>
        </div>
      )}

      {activeSection === 'app' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>App</h2>
          <ProfileAppPanel />
        </div>
      )}
    </section>
  );
}
