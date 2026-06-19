import { IconMapPin } from '@/components/icons/Icons';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { CompanyAvatar } from '@/components/profile/CompanyAvatar';
import { PageFrame, Panel } from '@/portal/components/PageFrame';
import ws from '@/portal/workspace.module.css';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/lib/apiErrors';
import type { Company } from '@/models/company';
import type { PortalUpdateCompanyRequest } from '@/models/portal';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={ws.field}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function CompanyPage() {
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
    return <p className={ws.statusText}>Loading company profile…</p>;
  }

  if (!company || !form) {
    return (
      <PageFrame>
        <Panel>
          <h2 className={ws.panelTitle}>Company profile unavailable</h2>
          <p className={ws.candidateSub}>Your employer account is not linked to a company yet.</p>
          <Link to="/portal" className={ws.btnPrimary}>Open command center</Link>
        </Panel>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      meta="Your employer brand and open roles"
      actions={(
        <>
          <Link to={`/companies/${company.slug}`} className={ws.btnGhost}>Public page</Link>
          <button type="button" className={ws.btnPrimary} onClick={() => setEditing((value) => !value)}>
            {editing ? 'Done editing' : 'Edit brand'}
          </button>
        </>
      )}
    >
      <article className={ws.companyHero}>
        <div
          className={ws.companyBanner}
          style={company.bannerUrl ? { backgroundImage: `url(${company.bannerUrl})` } : undefined}
          aria-hidden
        />
        <div className={ws.companyHeroBody}>
          <CompanyAvatar company={company} size="lg" />
          <div>
            <h2 className={ws.profileName}>{company.name}</h2>
            <p className={ws.profileHeadline}>
              {company.industry || 'Add your industry'}
              {company.location && (
                <>
                  {' · '}
                  <IconMapPin size={16} /> {company.location}
                </>
              )}
            </p>
            <Link to="/portal/jobs" className={ws.btnGhost}>
              {company.openJobsCount} open {company.openJobsCount === 1 ? 'role' : 'roles'}
            </Link>
          </div>
        </div>
      </article>

      {editing && (
        <form className={[ws.panel, ws.formPanel].join(' ')} onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <h3 className={ws.panelTitle}>Edit company showcase</h3>
          <Field label="Description">
            <textarea className={ws.textarea} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className={ws.fieldRow}>
            <Field label="Industry">
              <input className={ws.input} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </Field>
            <Field label="Company size">
              <input className={ws.input} value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })} placeholder="51–200 employees" />
            </Field>
          </div>
          <Field label="Location">
            <input className={ws.input} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Website">
            <input className={ws.input} value={form.website ?? ''} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="LinkedIn">
            <input className={ws.input} value={form.linkedInUrl ?? ''} onChange={(e) => setForm({ ...form, linkedInUrl: e.target.value })} placeholder="https://linkedin.com/company/..." />
          </Field>
          <Field label="Logo URL">
            <input className={ws.input} value={form.logoUrl ?? ''} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Banner URL">
            <input className={ws.input} value={form.bannerUrl ?? ''} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} placeholder="https://..." />
          </Field>
          <button type="submit" className={ws.btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save showcase'}</button>
        </form>
      )}

      <div className={ws.companyShowcase}>
        <Panel>
          <section className={ws.profileBlock}>
            <h3 className={ws.profileSectionTitle}>Company story</h3>
            <p className={ws.bodyText}>
              {company.description.trim() || 'Describe your mission, culture, and what makes your team unique.'}
            </p>
          </section>

          <section className={ws.profileBlock}>
            <h3 className={ws.profileSectionTitle}>Culture</h3>
            <p className={ws.bodyText}>
              {company.description.trim()
                ? 'Your public company page highlights this story to candidates before they apply.'
                : 'Add a description to showcase your culture and values to candidates.'}
            </p>
          </section>

          {(company.website || company.linkedInUrl) && (
            <section className={ws.profileBlock}>
              <h3 className={ws.profileSectionTitle}>Links</h3>
              <ul className={ws.linkList}>
                {company.website && <li><a href={company.website} target="_blank" rel="noopener noreferrer">Website</a></li>}
                {company.linkedInUrl && <li><a href={company.linkedInUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>}
              </ul>
            </section>
          )}
        </Panel>

        <aside className={ws.stack}>
          <Panel title="Team size">
            <p className={ws.bodyText}>{company.companySize || 'Add company size'}</p>
          </Panel>
          <Panel title="Open roles">
            <p className={ws.bodyText}>{company.openJobsCount} active {company.openJobsCount === 1 ? 'role' : 'roles'}</p>
            <Link to="/portal/jobs" className={ws.btnPrimary}>Manage roles</Link>
          </Panel>
          <Panel title="Benefits" muted>
            <p className={ws.bodyText}>Highlight benefits on your public company page as you expand your employer brand.</p>
          </Panel>
        </aside>
      </div>
    </PageFrame>
  );
}
