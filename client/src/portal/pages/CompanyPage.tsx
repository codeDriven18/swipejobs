import { IconBuilding, IconHeart, IconMapPin, IconSpark, IconUser } from '@/components/icons/Icons';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { CompanyAvatar } from '@/components/profile/CompanyAvatar';
import { companyUploadApi } from '@/api/companyUploadApi';
import { ImageDropZone } from '@/portal/components/ImageDropZone';
import { PageFrame } from '@/portal/components/PageFrame';
import ws from '@/portal/workspace.module.css';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import type { Company } from '@/models/company';
import type { PortalUpdateCompanyRequest } from '@/models/portal';

function brandedBannerStyle() {
  return {
    background: 'linear-gradient(135deg, #0a0a0a 0%, #141414 50%, color-mix(in srgb, #ffd600 28%, #141414) 100%)',
  } as const;
}

function splitContentLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-–—*]+\s*/, '').trim())
    .filter(Boolean);
}

function ShowcaseSection({
  icon,
  title,
  content,
  emptyHint,
  asList = false,
}: {
  icon: ReactNode;
  title: string;
  content: string;
  emptyHint: string;
  asList?: boolean;
}) {
  const trimmed = content.trim();
  const lines = splitContentLines(trimmed);
  const isEmpty = !trimmed;

  return (
    <article className={ws.companyStoryCard}>
      <div className={ws.companyStoryHead}>
        <span className={ws.companyStoryIcon} aria-hidden>{icon}</span>
        <h3 className={ws.companyStoryTitle}>{title}</h3>
      </div>
      {isEmpty ? (
        <p className={ws.companyStoryBody}>{emptyHint}</p>
      ) : asList && lines.length > 1 ? (
        <ul className={ws.companyStoryList}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className={ws.companyStoryBody}>{trimmed}</p>
      )}
    </article>
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
          name: c.name ?? '',
          description: c.description ?? '',
          industry: c.industry ?? '',
          location: c.location ?? '',
          companySize: c.companySize ?? '',
          logoUrl: c.logoUrl ?? '',
          bannerUrl: c.bannerUrl ?? '',
          website: c.website ?? '',
          linkedInUrl: c.linkedInUrl ?? '',
          twitterUrl: c.twitterUrl ?? '',
          instagramUrl: c.instagramUrl ?? '',
          culture: c.culture ?? '',
          benefits: c.benefits ?? '',
          hiringPhilosophy: c.hiringPhilosophy ?? '',
        });
      })
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, []);

  const previewCompany = useMemo(() => {
    if (!company || !form) return null;
    return {
      ...company,
      name: form.name?.trim() || company.name,
      description: form.description,
      industry: form.industry,
      location: form.location,
      companySize: form.companySize,
      logoUrl: form.logoUrl || company.logoUrl,
      bannerUrl: form.bannerUrl || company.bannerUrl,
      website: form.website,
      linkedInUrl: form.linkedInUrl,
      twitterUrl: form.twitterUrl,
      instagramUrl: form.instagramUrl,
      culture: form.culture,
      benefits: form.benefits,
      hiringPhilosophy: form.hiringPhilosophy,
    };
  }, [company, form]);

  const resetForm = useCallback(() => {
    if (!company) return;
    setForm({
      name: company.name ?? '',
      description: company.description ?? '',
      industry: company.industry ?? '',
      location: company.location ?? '',
      companySize: company.companySize ?? '',
      logoUrl: company.logoUrl ?? '',
      bannerUrl: company.bannerUrl ?? '',
      website: company.website ?? '',
      linkedInUrl: company.linkedInUrl ?? '',
      twitterUrl: company.twitterUrl ?? '',
      instagramUrl: company.instagramUrl ?? '',
      culture: company.culture ?? '',
      benefits: company.benefits ?? '',
      hiringPhilosophy: company.hiringPhilosophy ?? '',
    });
  }, [company]);

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

  if (!company || !form || !previewCompany) {
    return (
      <PageFrame>
        <div className={ws.panel}>
          <h2 className={ws.panelTitle}>Company profile unavailable</h2>
          <p className={ws.candidateSub}>Your employer account is not linked to a company yet.</p>
          <Link to="/portal" className={ws.btnPrimary}>Open Today</Link>
        </div>
      </PageFrame>
    );
  }

  const display = editing ? previewCompany : company;
  const bannerUrl = resolveMediaUrl(display.bannerUrl);
  const bannerStyle = bannerUrl
    ? {
        backgroundImage: `url("${bannerUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : brandedBannerStyle();

  return (
    <PageFrame
      meta="Build your employer brand — candidates see this before they apply."
      actions={(
        <>
          <a href={`/companies/${company.slug}`} className={ws.btnGhost} target="_blank" rel="noopener noreferrer">Preview live page</a>
          {editing ? (
            <>
              <button type="button" className={ws.btnGhost} onClick={() => { resetForm(); setEditing(false); }}>Cancel</button>
              <button type="button" className={ws.btnPrimary} disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save brand'}
              </button>
            </>
          ) : (
            <button type="button" className={ws.btnPrimary} onClick={() => setEditing(true)}>Edit brand</button>
          )}
        </>
      )}
    >
      <div className={editing ? ws.companyEditLayout : undefined}>
        <article className={ws.companyHero}>
          <div className={ws.companyBannerWrap}>
            <div className={ws.companyBanner} style={bannerStyle} aria-hidden />
            <div className={ws.companyBannerScrim} aria-hidden />
            {!display.bannerUrl && (
              <div className={ws.companyBannerLabel} aria-hidden>Branded cover</div>
            )}
          </div>
          <div className={ws.companyHeroBody}>
            <CompanyAvatar company={display} size="lg" circular className={ws.companyHeroLogo} />
            <div className={ws.companyHeroInfo}>
              {display.industry && <p className={ws.companyHeroEyebrow}>{display.industry}</p>}
              <h2 className={ws.profileName}>{display.name}</h2>
              <p className={ws.profileHeadline}>
                {display.location ? (
                  <>
                    <IconMapPin size={16} /> {display.location}
                  </>
                ) : (
                  'Add your headquarters or primary location'
                )}
              </p>
              <div className={ws.companyHeroTags}>
                {display.companySize && <span className={ws.badgeMuted}>{display.companySize}</span>}
                <span className={ws.badgeOk}>
                  {display.openJobsCount} open {display.openJobsCount === 1 ? 'role' : 'roles'}
                </span>
              </div>
            </div>
          </div>
          <div className={ws.companyStatStrip}>
            <div className={ws.companyStat}>
              <span className={ws.companyStatLabel}>Location</span>
              <span className={ws.companyStatValue}>{display.location || '—'}</span>
            </div>
            <div className={ws.companyStat}>
              <span className={ws.companyStatLabel}>Team size</span>
              <span className={ws.companyStatValue}>{display.companySize || '—'}</span>
            </div>
            <div className={ws.companyStat}>
              <span className={ws.companyStatLabel}>Open roles</span>
              <span className={`${ws.companyStatValue} ${ws.companyStatValueAccent}`}>
                {display.openJobsCount}
              </span>
            </div>
          </div>
        </article>

        {editing && (
          <aside className={ws.companyEditor}>
            <section className={ws.panel}>
              <h3 className={ws.panelTitle}>Visual identity</h3>
              <p className={ws.companyEditorHint}>
                Your cover and logo are the first things candidates see. Upload high-quality assets that reflect your team.
              </p>
              <ImageDropZone
                label="Cover image"
                hint="Drag & drop to upload, or paste a URL. Without a cover, a branded placeholder is shown."
                value={form.bannerUrl ?? ''}
                onChange={(bannerUrl) => setForm({ ...form, bannerUrl })}
                onUploadFile={(file) => companyUploadApi.uploadBanner(file)}
                aspect="banner"
                placeholder={<span className={ws.dropZonePlaceholder}>Branded cover preview</span>}
              />
              <ImageDropZone
                label="Logo"
                hint="Square logo works best. Drag & drop to upload or paste a URL."
                value={form.logoUrl ?? ''}
                onChange={(logoUrl) => setForm({ ...form, logoUrl })}
                onUploadFile={(file) => companyUploadApi.uploadLogo(file)}
                aspect="square"
              />
            </section>

            <section className={ws.panel}>
              <h3 className={ws.panelTitle}>Company story</h3>
              <p className={ws.companyEditorHint}>
                Tell candidates what you build, how you work, and why they should join.
              </p>
              <div className={ws.field}>
                <label htmlFor="companyName">Company name</label>
                <input
                  id="companyName"
                  className={ws.input}
                  value={form.name ?? ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your company name"
                />
              </div>
              <div className={ws.field}>
                <label htmlFor="description">About your company</label>
                <textarea
                  id="description"
                  className={ws.textarea}
                  rows={5}
                  placeholder="Mission, what you build, and why candidates should join."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className={ws.field}>
                <label htmlFor="culture">Culture</label>
                <textarea
                  id="culture"
                  className={ws.textarea}
                  rows={4}
                  placeholder="One value per line — e.g. Remote-first, Ship weekly, No-meeting Wednesdays"
                  value={form.culture ?? ''}
                  onChange={(e) => setForm({ ...form, culture: e.target.value })}
                />
              </div>
              <div className={ws.field}>
                <label htmlFor="benefits">Benefits</label>
                <textarea
                  id="benefits"
                  className={ws.textarea}
                  rows={4}
                  placeholder="One perk per line — health insurance, learning budget, equity…"
                  value={form.benefits ?? ''}
                  onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                />
              </div>
              <div className={ws.field}>
                <label htmlFor="hiringPhilosophy">Hiring philosophy</label>
                <textarea
                  id="hiringPhilosophy"
                  className={ws.textarea}
                  rows={3}
                  placeholder="What you look for in candidates and how you hire."
                  value={form.hiringPhilosophy ?? ''}
                  onChange={(e) => setForm({ ...form, hiringPhilosophy: e.target.value })}
                />
              </div>
              <div className={ws.fieldRow}>
                <div className={ws.field}>
                  <label htmlFor="industry">Industry</label>
                  <input id="industry" className={ws.input} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                </div>
                <div className={ws.field}>
                  <label htmlFor="size">Team size</label>
                  <input id="size" className={ws.input} value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })} placeholder="51–200" />
                </div>
              </div>
              <div className={ws.field}>
                <label htmlFor="location">Location</label>
                <input id="location" className={ws.input} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </section>

            <section className={ws.panel}>
              <h3 className={ws.panelTitle}>Links</h3>
              <div className={ws.field}>
                <label htmlFor="website">Website</label>
                <input id="website" className={ws.input} value={form.website ?? ''} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
              </div>
              <div className={ws.field}>
                <label htmlFor="linkedin">LinkedIn</label>
                <input id="linkedin" className={ws.input} value={form.linkedInUrl ?? ''} onChange={(e) => setForm({ ...form, linkedInUrl: e.target.value })} placeholder="https://linkedin.com/company/…" />
              </div>
              <div className={ws.fieldRow}>
                <div className={ws.field}>
                  <label htmlFor="twitter">X / Twitter</label>
                  <input id="twitter" className={ws.input} value={form.twitterUrl ?? ''} onChange={(e) => setForm({ ...form, twitterUrl: e.target.value })} placeholder="https://x.com/…" />
                </div>
                <div className={ws.field}>
                  <label htmlFor="instagram">Instagram</label>
                  <input id="instagram" className={ws.input} value={form.instagramUrl ?? ''} onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })} placeholder="https://instagram.com/…" />
                </div>
              </div>
            </section>
          </aside>
        )}
      </div>

      {!editing && (
        <div className={ws.companyShowcase}>
          <div className={ws.companyShowcaseMain}>
            <ShowcaseSection
              icon={<IconBuilding size={16} />}
              title="Company story"
              content={company.description}
              emptyHint="Describe your mission, culture, and what makes your team unique."
            />
            <ShowcaseSection
              icon={<IconHeart size={16} />}
              title="Culture"
              content={company.culture ?? ''}
              emptyHint="Describe your values and what it's like to work on your team."
              asList
            />
            <ShowcaseSection
              icon={<IconSpark size={16} />}
              title="Benefits & perks"
              content={company.benefits ?? ''}
              emptyHint="List perks and benefits that make your company a great place to work."
              asList
            />
            <ShowcaseSection
              icon={<IconUser size={16} />}
              title="Hiring philosophy"
              content={company.hiringPhilosophy ?? ''}
              emptyHint="Share what you look for in candidates and how you approach hiring."
            />
          </div>

          <aside className={ws.stack}>
            <div className={ws.companyCtaCard}>
              <h3 className={ws.companyCtaTitle}>Your public showcase</h3>
              <p className={ws.companyCtaBody}>
                Share your company page with candidates. Every open role links back to your brand.
              </p>
              <span className={ws.companyCtaCount}>{company.openJobsCount}</span>
              <Link to={`/companies/${company.slug}`} className={ws.btnPrimary} target="_blank" rel="noopener noreferrer">
                View public page
              </Link>
            </div>

            <div className={ws.companySidebarCard}>
              <h3 className={ws.companySidebarTitle}>At a glance</h3>
              <ul className={ws.linkList}>
                <li><span className={ws.bodyText}><strong>Industry:</strong> {company.industry || 'Not set'}</span></li>
                <li><span className={ws.bodyText}><strong>Location:</strong> {company.location || 'Not set'}</span></li>
                <li><span className={ws.bodyText}><strong>Team size:</strong> {company.companySize || 'Not set'}</span></li>
              </ul>
            </div>

            {(company.website || company.linkedInUrl || company.twitterUrl || company.instagramUrl) && (
              <div className={ws.companySidebarCard}>
                <h3 className={ws.companySidebarTitle}>Connect</h3>
                <ul className={ws.linkList}>
                  {company.website && <li><a href={company.website} target="_blank" rel="noopener noreferrer">Website</a></li>}
                  {company.linkedInUrl && <li><a href={company.linkedInUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>}
                  {company.twitterUrl && <li><a href={company.twitterUrl} target="_blank" rel="noopener noreferrer">X / Twitter</a></li>}
                  {company.instagramUrl && <li><a href={company.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a></li>}
                </ul>
              </div>
            )}

            <div className={ws.companySidebarCard}>
              <h3 className={ws.companySidebarTitle}>Open roles</h3>
              <p className={ws.bodyText}>
                {company.openJobsCount} active {company.openJobsCount === 1 ? 'role' : 'roles'} on SwipeJobs
              </p>
              <Link to="/portal/jobs" className={ws.btnPrimary}>Manage campaigns</Link>
            </div>
          </aside>
        </div>
      )}
    </PageFrame>
  );
}
