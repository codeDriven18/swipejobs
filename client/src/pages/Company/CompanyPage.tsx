import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IconBuilding,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconHeart,
  IconList,
  IconMapPin,
  IconSpark,
  IconUser,
} from '@/components/icons/Icons';
import { companiesApi } from '@/api/companiesApi';
import { companyFollowsApi } from '@/api/companyFollowsApi';
import { jobsApi } from '@/api/jobsApi';
import { JobCard } from '@/components/jobs/JobCard';
import { CompanyAvatar } from '@/components/profile/CompanyAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import type { Company } from '@/models/company';
import type { Job } from '@/models/job';
import styles from './CompanyPage.module.css';

function splitContentLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-–—*]+\s*/, '').trim())
    .filter(Boolean);
}

function ContentSection({
  icon,
  title,
  content,
  asList = false,
}: {
  icon: ReactNode;
  title: string;
  content: string;
  asList?: boolean;
}) {
  const lines = splitContentLines(content);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionIcon} aria-hidden>{icon}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {asList && lines.length > 1 ? (
        <ul className={styles.bulletList}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.sectionBody}>{content}</p>
      )}
    </section>
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
      jobsApi.search({ companySlug: slug, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' }),
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
      <div className={styles.loadingShell} aria-busy="true" aria-label="Loading company">
        <div className={styles.loadingCover} />
        <div className={styles.loadingCard} />
        <div className={styles.loadingBlock} />
        <div className={styles.loadingBlock} />
      </div>
    );
  }

  if (error || !company) {
    return (
      <section className={styles.page}>
        <p className={styles.error}>Company not found.</p>
        <EmptyState
          icon={<IconBuilding size={28} />}
          title="Unknown company"
          description="This company page doesn't exist or was removed."
          actions={[{ label: 'Browse jobs', to: '/jobs', primary: true }]}
        />
      </section>
    );
  }

  const bannerStyle = company.bannerUrl
    ? {
        backgroundImage: `url(${company.bannerUrl})`,
        backgroundSize: 'cover' as const,
        backgroundPosition: 'center' as const,
      }
    : undefined;

  const hasSocial = company.website || company.linkedInUrl || company.twitterUrl || company.instagramUrl;
  const followButton = (
    <button
      type="button"
      className={following ? styles.followBtnActive : styles.followBtn}
      disabled={followLoading}
      onClick={() => void toggleFollow()}
    >
      {following ? (
        <>
          <IconCheck size={16} /> Following
        </>
      ) : (
        '+ Follow company'
      )}
    </button>
  );

  return (
    <motion.section
      className={styles.page}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <IconChevronLeft size={18} /> Back
      </button>

      <header className={styles.showcase}>
        <div className={styles.coverWrap}>
          <div className={styles.cover} style={bannerStyle} aria-hidden />
          <div className={styles.coverScrim} aria-hidden />
          {!company.bannerUrl && (
            <div className={styles.coverPlaceholder} aria-hidden>
              <span>Employer brand</span>
            </div>
          )}
        </div>

        <div className={styles.identityCard}>
          <div className={styles.identityRow}>
            <CompanyAvatar company={company} size="lg" className={styles.logo} />
            <div className={styles.identityText}>
              {company.industry && <p className={styles.eyebrow}>{company.industry}</p>}
              <h1 className={styles.heroTitle}>{company.name}</h1>
              {company.location && (
                <p className={styles.heroTagline}>
                  <IconMapPin size={15} /> {company.location}
                </p>
              )}
            </div>
            <div className={styles.heroActions}>{followButton}</div>
          </div>

          <div className={styles.statStrip}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Location</span>
              <span className={styles.statValue}>{company.location || 'Remote / TBD'}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Team size</span>
              <span className={styles.statValue}>{company.companySize || 'Growing team'}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Open roles</span>
              <span className={`${styles.statValue} ${styles.statValueAccent}`}>
                {company.openJobsCount}
              </span>
            </div>
          </div>

          <div className={styles.followBtnMobileWrap}>
            <div className={styles.followBtnMobile}>{followButton}</div>
          </div>
        </div>
      </header>

      <div className={styles.contentGrid}>
        <main className={styles.main}>
          <ContentSection
            icon={<IconBuilding size={16} />}
            title={`About ${company.name}`}
            content={company.description || 'This company has not added a description yet.'}
          />

          {company.culture?.trim() && (
            <ContentSection
              icon={<IconHeart size={16} />}
              title="Culture"
              content={company.culture}
              asList
            />
          )}

          {company.benefits?.trim() && (
            <ContentSection
              icon={<IconSpark size={16} />}
              title="Benefits & perks"
              content={company.benefits}
              asList
            />
          )}

          {company.hiringPhilosophy?.trim() && (
            <ContentSection
              icon={<IconUser size={16} />}
              title="How we hire"
              content={company.hiringPhilosophy}
            />
          )}

          <section className={styles.jobsSection} id="open-roles">
            <div className={styles.jobsHeader}>
              <h2 className={styles.jobsTitle}>Open roles</h2>
              <span className={styles.jobsCount}>
                {jobs.length} listing{jobs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {jobs.length === 0 ? (
              <EmptyState
                icon={<IconList size={28} />}
                title="No open jobs"
                description="This company has no active listings right now. Check back later."
                actions={[{ label: 'Browse all jobs', to: '/jobs', primary: true }]}
              />
            ) : (
              <div className={styles.jobList}>
                {jobs.map((job, index) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={index}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className={styles.sidebar}>
          <div className={styles.ctaCard}>
            <h3 className={styles.ctaCardTitle}>Join the team</h3>
            <p className={styles.ctaCardBody}>
              Explore opportunities at {company.name} and find a role that fits your goals.
            </p>
            <span className={styles.ctaCardCount}>{company.openJobsCount}</span>
            <button type="button" className={styles.ctaBrowse} onClick={scrollToJobs}>
              View open roles
            </button>
          </div>

          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Company at a glance</h3>
            <ul className={styles.infoList}>
              <li className={styles.infoItem}>
                <span className={styles.infoLabel}>Industry</span>
                <span className={styles.infoValue}>{company.industry || '—'}</span>
              </li>
              <li className={styles.infoItem}>
                <span className={styles.infoLabel}>Headquarters</span>
                <span className={styles.infoValue}>{company.location || '—'}</span>
              </li>
              <li className={styles.infoItem}>
                <span className={styles.infoLabel}>Company size</span>
                <span className={styles.infoValue}>{company.companySize || '—'}</span>
              </li>
              <li className={styles.infoItem}>
                <span className={styles.infoLabel}>Active listings</span>
                <span className={styles.infoValue}>{company.openJobsCount}</span>
              </li>
            </ul>
          </div>

          {hasSocial && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}>Connect</h3>
              <div className={styles.socialList}>
                {company.website && (
                  <a href={company.website} className={styles.socialLink} target="_blank" rel="noopener noreferrer">
                    Website <IconChevronRight size={16} />
                  </a>
                )}
                {company.linkedInUrl && (
                  <a href={company.linkedInUrl} className={styles.socialLink} target="_blank" rel="noopener noreferrer">
                    LinkedIn <IconChevronRight size={16} />
                  </a>
                )}
                {company.twitterUrl && (
                  <a href={company.twitterUrl} className={styles.socialLink} target="_blank" rel="noopener noreferrer">
                    X / Twitter <IconChevronRight size={16} />
                  </a>
                )}
                {company.instagramUrl && (
                  <a href={company.instagramUrl} className={styles.socialLink} target="_blank" rel="noopener noreferrer">
                    Instagram <IconChevronRight size={16} />
                  </a>
                )}
              </div>
            </div>
          )}

          {(company.culture?.trim() || company.benefits?.trim()) && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}>Why candidates choose us</h3>
              <ul className={styles.bulletList}>
                {company.culture?.trim() && splitContentLines(company.culture).slice(0, 2).map((line) => (
                  <li key={`culture-${line}`}>{line}</li>
                ))}
                {company.benefits?.trim() && splitContentLines(company.benefits).slice(0, 2).map((line) => (
                  <li key={`benefit-${line}`}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </motion.section>
  );
}
