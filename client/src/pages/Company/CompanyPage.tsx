import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HeaderThemeToggle } from '@/components/theme/HeaderThemeToggle';
import { motion } from 'framer-motion';
import {
  IconBriefcase,
  IconBuilding,
  IconCheck,
  IconHeart,
  IconMapPin,
  IconSpark,
} from '@/components/icons/Icons';
import { AppIcon } from '@/components/brand/AppIcon';
import { companiesApi } from '@/api/companiesApi';
import { companyFollowsApi } from '@/api/companyFollowsApi';
import { jobsApi } from '@/api/jobsApi';
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

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-8%' },
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
  return match?.[0]?.trim() ?? trimmed.slice(0, 160);
}

function PillarCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <article className={styles.pillarCard}>
      <span className={styles.pillarIcon} aria-hidden>{icon}</span>
      <h3 className={styles.pillarTitle}>{title}</h3>
      <p className={styles.pillarBody}>{body}</p>
    </article>
  );
}

function RoleRow({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const location = job.city ?? job.location ?? 'Remote';
  const commitment = job.isRemote ? 'Remote' : 'On-site';
  const summary = job.description?.trim().slice(0, 140)
    ?? 'Join our team and help shape what we build next.';

  return (
    <article className={styles.roleRow}>
      <span className={styles.roleRowIcon} aria-hidden>
        <IconBriefcase size={20} />
      </span>
      <div className={styles.roleRowMain}>
        <h3 className={styles.roleRowTitle}>{job.title}</h3>
        <div className={styles.roleRowBadges}>
          <span className={styles.roleBadge}>{location}</span>
          <span className={styles.roleBadge}>{commitment}</span>
        </div>
        <p className={styles.roleRowDesc}>
          {summary}{summary.length >= 140 ? '…' : ''}
        </p>
      </div>
      <button type="button" className={styles.roleRowCta} onClick={onOpen}>
        View role →
      </button>
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

  const cultureLines = useMemo(() => splitContentLines(company?.culture ?? ''), [company?.culture]);
  const benefitLines = useMemo(() => splitContentLines(company?.benefits ?? ''), [company?.benefits]);

  const pillars = useMemo(() => {
    const items: { icon: ReactNode; title: string; body: string }[] = [];
    if (cultureLines[0]) items.push({ icon: <IconSpark size={18} />, title: 'Innovative', body: cultureLines[0] });
    if (cultureLines[1]) items.push({ icon: <IconHeart size={18} />, title: 'People-first', body: cultureLines[1] });
    if (cultureLines[2]) items.push({ icon: <IconBuilding size={18} />, title: 'Impact driven', body: cultureLines[2] });
    if (items.length === 0) {
      items.push(
        { icon: <IconSpark size={18} />, title: 'Innovative', body: 'We push boundaries and ship meaningful work.' },
        { icon: <IconHeart size={18} />, title: 'People-first', body: 'Our team is built on trust, clarity, and respect.' },
        { icon: <IconBuilding size={18} />, title: 'Impact driven', body: 'Every role connects to outcomes that matter.' },
      );
    }
    return items;
  }, [cultureLines]);

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
      <div className={styles.microsite} aria-busy="true" aria-label="Loading company">
        <LandingBackground />
        <div className={styles.loadingCover} />
        <div className={styles.container}>
          <div className={styles.loadingBlock} />
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className={styles.microsite}>
        <LandingBackground />
        <div className={styles.container} style={{ paddingTop: '4rem' }}>
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
  const isVerified = company.status === CompanyStatus.Approved;
  const workplace = company.location?.trim() || 'Remote';
  const tagline = firstSentence(company.description)
    || `${company.name} is hiring — explore open roles and join a team that ships with purpose.`;

  return (
    <div className={styles.microsite}>
      <LandingBackground />

      <header className={styles.topBar}>
        <div className={styles.container}>
          <div className={styles.topBarInner}>
            <Link to="/" className={styles.topBrand}>
              <AppIcon size="sm" showShadow={false} />
              <span>SwipeJobs</span>
            </Link>
            <div className={styles.topBarActions}>
              <span className={styles.topBarHint}>Looking for opportunities?</span>
              <Link to="/jobs" className={styles.topBarLink}>Browse all jobs →</Link>
              <HeaderThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Full-width cover band */}
        <section className={styles.coverBand} aria-hidden={!bannerUrl}>
          <div
            className={styles.coverImage}
            style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined}
          />
          <div className={styles.coverScrimTop} />
          <div className={styles.coverScrimSide} />
          <div className={styles.coverScrimBottom} />
        </section>

        {/* Company identity — full-width strip, not a card */}
        <section className={styles.brandStrip}>
          <div className={styles.container}>
            <div className={styles.brandGrid}>
              <CompanyAvatar company={company} size="lg" className={styles.brandLogo} />

              <div className={styles.brandMain}>
                <span className={styles.hiringBadge}>
                  <span className={styles.hiringDot} aria-hidden />
                  We&apos;re hiring
                </span>
                <h1 className={styles.companyName}>{company.name}</h1>
                <p className={styles.companyTagline}>{tagline}</p>
                <div className={styles.brandMeta}>
                  <span className={styles.brandMetaItem}>
                    <IconMapPin size={15} /> {workplace}
                  </span>
                  {company.industry && (
                    <span className={styles.brandMetaItem}>{company.industry}</span>
                  )}
                  {isVerified && (
                    <span className={styles.brandVerified}>
                      <IconCheck size={14} /> Verified employer
                    </span>
                  )}
                </div>
                <div className={styles.brandActions}>
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
                    className={following ? styles.btnFollowActive : styles.btnSecondary}
                    disabled={followLoading}
                    onClick={() => void toggleFollow()}
                  >
                    {following ? 'Following' : 'Follow company'}
                  </button>
                </div>
              </div>

              <div className={styles.brandStats}>
                <div className={styles.statBlock}>
                  <span className={styles.statLabel}>Team size</span>
                  <span className={styles.statValue}>{company.companySize || 'Growing'}</span>
                </div>
                <div className={styles.statBlock}>
                  <span className={styles.statLabel}>Open roles</span>
                  <span className={`${styles.statValue} ${styles.statAccent}`}>{company.openJobsCount}</span>
                </div>
                <div className={styles.statBlock}>
                  <span className={styles.statLabel}>Workplace</span>
                  <span className={styles.statValue}>{workplace}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About + culture pillars */}
        <motion.section className={styles.section} {...reveal}>
          <div className={styles.container}>
            <div className={styles.splitSection}>
              <div className={styles.splitCopy}>
                <p className={styles.eyebrow}>About {company.name}</p>
                <h2 className={styles.sectionTitle}>We build with purpose</h2>
                <p className={styles.prose}>{company.description || 'This company is preparing their story.'}</p>
              </div>
              <div className={styles.pillarGrid}>
                {pillars.map((pillar) => (
                  <PillarCard key={pillar.title} {...pillar} />
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Culture & benefits side-by-side on desktop */}
        {(cultureLines.length > 0 || benefitLines.length > 0) && (
          <motion.section className={styles.section} {...reveal}>
            <div className={styles.container}>
              <div className={styles.dualGrid}>
                {cultureLines.length > 0 && (
                  <div className={styles.contentBlock}>
                    <p className={styles.eyebrow}>Culture</p>
                    <h2 className={styles.sectionTitle}>Life here</h2>
                    <ul className={styles.featureList}>
                      {cultureLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {benefitLines.length > 0 && (
                  <div className={styles.contentBlock}>
                    <p className={styles.eyebrow}>Benefits</p>
                    <h2 className={styles.sectionTitle}>Why join us</h2>
                    <ul className={styles.featureList}>
                      {benefitLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* Hiring process */}
        <motion.section className={styles.section} {...reveal}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>How we hire</p>
            <h2 className={styles.sectionTitle}>Your path to joining the team</h2>
            {company.hiringPhilosophy?.trim() && (
              <p className={styles.proseLead}>{company.hiringPhilosophy}</p>
            )}
            <ol className={styles.processSteps}>
              {HIRING_STEPS.map((step, index) => (
                <li key={step} className={styles.processStep}>
                  <span className={styles.processNum}>{index + 1}</span>
                  <span className={styles.processLabel}>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </motion.section>

        {/* Open roles */}
        <motion.section className={styles.section} id="open-roles" {...reveal}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.eyebrow}>Careers</p>
                <h2 className={styles.sectionTitle}>Open roles at {company.name}</h2>
              </div>
              {jobs.length > 0 && (
                <span className={styles.roleCount}>{jobs.length} positions</span>
              )}
            </div>

            {jobs.length === 0 ? (
              <EmptyState
                icon={<IconBuilding size={28} />}
                title="No open roles right now"
                description="Check back soon — new opportunities are added regularly."
                actions={[{ label: 'Browse all jobs', to: '/jobs', primary: true }]}
              />
            ) : (
              <div className={styles.roleList}>
                {jobs.map((job) => (
                  <RoleRow key={job.id} job={job} onOpen={() => navigate(`/jobs/${job.id}`)} />
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {/* Full-width CTA band */}
        <motion.section className={styles.ctaBand} {...reveal}>
          <div className={styles.container}>
            <div className={styles.ctaInner}>
              <h2 className={styles.ctaTitle}>
                Don&apos;t see the right role?{' '}
                <span className={styles.accent}>We&apos;d love to hear from you.</span>
              </h2>
              <p className={styles.ctaBody}>
                Follow {company.name} to get notified when new opportunities open, or reach out directly.
              </p>
              <div className={styles.ctaActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={followLoading}
                  onClick={() => void toggleFollow()}
                >
                  {following ? 'Following for updates' : 'Follow for updates →'}
                </button>
                {company.linkedInUrl && (
                  <a
                    href={company.linkedInUrl}
                    className={styles.btnSecondary}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Connect on LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      <footer className={styles.siteFooter}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerCol}>
              <Link to="/" className={styles.topBrand}>
                <AppIcon size="sm" showShadow={false} />
                <span>SwipeJobs</span>
              </Link>
              <p className={styles.footerTagline}>Swipe your way to the perfect job.</p>
            </div>
            <div className={styles.footerCol}>
              <p className={styles.footerColTitle}>For candidates</p>
              <Link to="/jobs">Browse jobs</Link>
              <Link to="/register">Create profile</Link>
            </div>
            <div className={styles.footerCol}>
              <p className={styles.footerColTitle}>For employers</p>
              <Link to="/register">Post a job</Link>
              <Link to="/login">Employer login</Link>
            </div>
            <div className={styles.footerCol}>
              <p className={styles.footerColTitle}>{company.name}</p>
              {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer">Website</a>}
              {company.linkedInUrl && <a href={company.linkedInUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} SwipeJobs</span>
            <div className={styles.footerLegal}>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
