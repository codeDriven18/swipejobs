import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IconBuilding,
  IconCheck,
  IconChevronLeft,
  IconHeart,
  IconMapPin,
  IconSpark,
} from '@/components/icons/Icons';
import { companiesApi } from '@/api/companiesApi';
import { companyFollowsApi } from '@/api/companyFollowsApi';
import { jobsApi } from '@/api/jobsApi';
import { OpportunityCard } from '@/components/jobs/OpportunityCard';
import { CompanyAvatar } from '@/components/profile/CompanyAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { LandingBackground } from '@/pages/Marketing/landing/LandingBackground';
import { CompanyStatus } from '@/models/operations';
import type { Company } from '@/models/company';
import type { Job } from '@/models/job';
import styles from './CompanyPage.module.css';

const HIRING_STEPS = ['Apply', 'Review', 'Interview', 'Offer', 'Welcome'] as const;

const sectionMotion = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

function splitContentLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-–—*]+\s*/, '').trim())
    .filter(Boolean);
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  return match?.[0]?.trim() ?? trimmed.slice(0, 120);
}

function ValueCard({ icon, title, lines }: { icon: ReactNode; title: string; lines: string[] }) {
  return (
    <article className={styles.valueCard}>
      <span className={styles.valueIcon} aria-hidden>{icon}</span>
      <h3 className={styles.valueTitle}>{title}</h3>
      <ul className={styles.valueList}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </article>
  );
}

export function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { trackCompanyView } = useActivityTracking();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);

    Promise.all([
      companiesApi.getBySlug(slug),
      jobsApi.search({ companySlug: slug, pageSize: 40, sortBy: 'createdAt', sortOrder: 'desc' }),
    ])
      .then(([c, result]) => {
        setCompany(c);
        setJobs(result.items);
        if (isAuthenticated && c) {
          void trackCompanyView(c.id);
          companyFollowsApi.isFollowing(c.id)
            .then((r) => setFollowing(r.following))
            .catch(() => setFollowing(false));
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug, isAuthenticated, trackCompanyView]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      const loc = j.city ?? j.location;
      if (loc) set.add(loc);
    });
    return [...set].sort();
  }, [jobs]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.category) set.add(String(j.category));
    });
    return [...set].sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => jobs.filter((j) => {
    if (locationFilter && (j.city ?? j.location) !== locationFilter) return false;
    if (deptFilter && String(j.category) !== deptFilter) return false;
    return true;
  }), [jobs, locationFilter, deptFilter]);

  const galleryImages = useMemo(() => {
    if (!company) return [];
    const items: { src: string; label: string }[] = [];
    const banner = resolveMediaUrl(company.bannerUrl);
    const logo = resolveMediaUrl(company.logoUrl);
    if (banner) items.push({ src: banner, label: 'Office / brand cover' });
    if (logo) items.push({ src: logo, label: `${company.name} logo` });
    return items;
  }, [company]);

  const toggleFollow = async () => {
    if (!isAuthenticated || !company) {
      navigate('/login', { state: { from: `/companies/${slug}` } });
      return;
    }
    setFollowLoading(true);
    try {
      if (following) {
        await companyFollowsApi.unfollow(company.id);
        setFollowing(false);
      } else {
        await companyFollowsApi.follow(company.id);
        setFollowing(true);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const scrollToJobs = () => {
    document.getElementById('open-roles')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className={styles.careersSite} aria-busy="true" aria-label="Loading company">
        <LandingBackground />
        <div className={styles.loadingShell}>
          <div className={styles.loadingHero} />
          <div className={styles.loadingBlock} />
          <div className={styles.loadingBlock} />
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className={styles.careersSite}>
        <LandingBackground />
        <div className={styles.pageInner}>
          <EmptyState
            icon={<IconBuilding size={28} />}
            title="Company not found"
            description="This careers page doesn't exist or was removed."
            actions={[{ label: 'Browse jobs', to: '/jobs', primary: true }]}
          />
        </div>
      </div>
    );
  }

  const bannerUrl = resolveMediaUrl(company.bannerUrl);
  const tagline = firstSentence(company.description) || company.industry;
  const isVerified = company.status === CompanyStatus.Approved;
  const cultureLines = splitContentLines(company.culture ?? '');
  const benefitLines = splitContentLines(company.benefits ?? '');

  return (
    <div className={styles.careersSite}>
      <LandingBackground />

      <div className={styles.pageInner}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)}>
          <IconChevronLeft size={18} /> Back
        </button>

        {/* Hero */}
        <header className={styles.hero}>
          <div
            className={styles.heroMedia}
            style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined}
            aria-hidden
          />
          <div className={styles.heroGradientTop} aria-hidden />
          <div className={styles.heroGradientBottom} aria-hidden />
        </header>

        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.heroIdentity}>
            <CompanyAvatar company={company} size="lg" circular className={styles.heroLogo} />
            <div className={styles.heroCopy}>
              <div className={styles.heroBadges}>
                {company.industry && <span className={styles.heroBadge}>{company.industry}</span>}
                {isVerified && (
                  <span className={styles.heroBadgeVerified}>
                    <IconCheck size={14} /> Verified employer
                  </span>
                )}
              </div>
              <h1 className={styles.heroTitle}>{company.name}</h1>
              {tagline && <p className={styles.heroTagline}>{tagline}</p>}
              <div className={styles.heroMeta}>
                {company.location && (
                  <span><IconMapPin size={15} /> {company.location}</span>
                )}
                {company.companySize && <span>{company.companySize} employees</span>}
                <span className={styles.heroMetaAccent}>
                  {company.openJobsCount} open {company.openJobsCount === 1 ? 'role' : 'roles'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.heroActions}>
            <button type="button" className={styles.btnPrimary} onClick={scrollToJobs}>
              View open roles
            </button>
            {company.website && (
              <a
                href={company.website}
                className={styles.btnSecondary}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit website
              </a>
            )}
            <button
              type="button"
              className={following ? styles.btnFollowActive : styles.btnFollow}
              disabled={followLoading}
              onClick={() => void toggleFollow()}
            >
              {following ? 'Following' : 'Follow company'}
            </button>
          </div>
        </motion.div>

        {/* About */}
        <motion.section className={styles.section} {...sectionMotion}>
          <p className={styles.sectionEyebrow}>About us</p>
          <h2 className={styles.sectionTitle}>Building the future at {company.name}</h2>
          <p className={styles.aboutBody}>{company.description || 'This company is preparing their story.'}</p>
        </motion.section>

        {/* Culture & Benefits */}
        {(cultureLines.length > 0 || benefitLines.length > 0) && (
          <motion.section className={styles.section} {...sectionMotion}>
            <p className={styles.sectionEyebrow}>Life here</p>
            <h2 className={styles.sectionTitle}>Culture & benefits</h2>
            <div className={styles.valueGrid}>
              {cultureLines.length > 0 && (
                <ValueCard icon={<IconHeart size={18} />} title="Our culture" lines={cultureLines} />
              )}
              {benefitLines.length > 0 && (
                <ValueCard icon={<IconSpark size={18} />} title="Benefits & perks" lines={benefitLines} />
              )}
            </div>
          </motion.section>
        )}

        {/* Hiring process */}
        <motion.section className={styles.section} {...sectionMotion}>
          <p className={styles.sectionEyebrow}>How we hire</p>
          <h2 className={styles.sectionTitle}>Your path to joining the team</h2>
          {company.hiringPhilosophy?.trim() && (
            <p className={styles.processLead}>{company.hiringPhilosophy}</p>
          )}
          <ol className={styles.processSteps}>
            {HIRING_STEPS.map((step, index) => (
              <li key={step} className={styles.processStep}>
                <span className={styles.processNum}>{index + 1}</span>
                <span className={styles.processLabel}>{step}</span>
              </li>
            ))}
          </ol>
        </motion.section>

        {/* Gallery */}
        {galleryImages.length > 1 && (
          <motion.section className={styles.section} {...sectionMotion}>
            <p className={styles.sectionEyebrow}>Inside {company.name}</p>
            <h2 className={styles.sectionTitle}>Company gallery</h2>
            <div className={styles.gallery}>
              {galleryImages.map((item) => (
                <figure key={item.label} className={styles.galleryItem}>
                  <img src={item.src} alt={item.label} className={styles.galleryImg} loading="lazy" />
                </figure>
              ))}
            </div>
          </motion.section>
        )}

        {/* Open roles */}
        <motion.section className={styles.section} id="open-roles" {...sectionMotion}>
          <div className={styles.rolesHead}>
            <div>
              <p className={styles.sectionEyebrow}>Careers</p>
              <h2 className={styles.sectionTitle}>Open roles</h2>
            </div>
            <span className={styles.rolesCount}>{filteredJobs.length} positions</span>
          </div>

          {(locations.length > 1 || departments.length > 1) && (
            <div className={styles.filters}>
              {locations.length > 1 && (
                <select
                  className={styles.filterSelect}
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  aria-label="Filter by location"
                >
                  <option value="">All locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              )}
              {departments.length > 1 && (
                <select
                  className={styles.filterSelect}
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  aria-label="Filter by department"
                >
                  <option value="">All departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {filteredJobs.length === 0 ? (
            <EmptyState
              icon={<IconBuilding size={28} />}
              title="No open roles right now"
              description="Check back soon — new opportunities are added regularly."
              actions={[{ label: 'Browse all jobs', to: '/jobs', primary: true }]}
            />
          ) : (
            <div className={styles.roleGrid}>
              {filteredJobs.map((job) => (
                <div key={job.id} className={styles.roleCardWrap}>
                  <OpportunityCard
                    job={job}
                    variant="discover"
                    interactive={false}
                    footerExtra={(
                      <button
                        type="button"
                        className={styles.roleCta}
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        View role
                      </button>
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Footer CTA */}
        <motion.section className={styles.footerCta} {...sectionMotion}>
          <div className={styles.footerCtaGlow} aria-hidden />
          <h2 className={styles.footerCtaTitle}>Don&apos;t see the right role?</h2>
          <p className={styles.footerCtaBody}>
            We&apos;d still love to hear from you. Follow {company.name} to get notified when new opportunities open.
          </p>
          <div className={styles.footerCtaActions}>
            <button type="button" className={styles.btnPrimary} onClick={() => void toggleFollow()}>
              {following ? 'Following' : 'Follow for updates'}
            </button>
            {company.linkedInUrl && (
              <a href={company.linkedInUrl} className={styles.btnSecondary} target="_blank" rel="noopener noreferrer">
                Connect on LinkedIn
              </a>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
