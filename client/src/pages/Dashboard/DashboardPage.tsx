import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dashboardApi } from '@/api/dashboardApi';
import { DiscoveryRail } from '@/components/discovery/DiscoveryRail';
import { CompanyCarousel } from '@/components/discovery/CompanyCarousel';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { EmptyState } from '@/components/ui/EmptyState';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useDiscoveryCollections, getTimeGreeting } from '@/hooks/useDiscoveryCollections';
import { UserRole } from '@/models/auth';
import { getProfileCompletionPercent, shouldShowMandatoryCompletionPrompts } from '@/lib/profileCompletion';
import { mergeDashboardWithEmpty } from '@/lib/emptyDashboard';
import { IconApplications, IconBolt, IconBookmark, IconChevronRight, IconUser } from '@/components/icons/Icons';
import { parseUserRole } from '@/lib/userRole';
import type { UserDashboard } from '@/models/dashboard';
import styles from './DashboardPage.module.css';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const role = parseUserRole(user?.role);
  const isJobSeeker = role === UserRole.JobSeeker;
  const isEmployer = role === UserRole.Company;
  const { profile, loading: profileLoading } = useProfile();
  const [dashboard, setDashboard] = useState<UserDashboard>(() => mergeDashboardWithEmpty(null));
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const { collections } = useDiscoveryCollections(true);

  const loadDashboard = useCallback(async () => {
    if (authLoading || profileLoading) return;
    if (!isAuthenticated || !isJobSeeker) {
      setDashboard(mergeDashboardWithEmpty(null));
      setFetchFailed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchFailed(false);

    try {
      const data = await dashboardApi.getMyDashboard();
      setDashboard(mergeDashboardWithEmpty(data));
    } catch {
      setDashboard(mergeDashboardWithEmpty(null));
      setFetchFailed(true);
    } finally {
      setLoading(false);
    }
  }, [authLoading, profileLoading, isAuthenticated, isJobSeeker]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const profilePct = dashboard.profileCompletionPercentage
    ?? getProfileCompletionPercent(profile);
  const savedCount = dashboard.savedJobsCount ?? 0;
  const appsCount = dashboard.applicationsCount ?? 0;
  const matchesToday = Math.min(
    dashboard.recommendedJobs.length ?? 0,
    dashboard.swipeRemainingEstimate ?? 12,
  );
  const firstName = profile?.firstName?.trim() || 'there';
  const greeting = getTimeGreeting();

  const allJobsForCompanies = useMemo(() => [
    ...dashboard.recommendedJobs,
    ...dashboard.trendingJobs,
    ...collections.remote,
  ], [dashboard, collections.remote]);

  if (authLoading || (isAuthenticated && isJobSeeker && (profileLoading || loading))) {
    return (
      <section className={styles.page}>
        <DashboardSkeleton />
      </section>
    );
  }

  if (isAuthenticated && isEmployer) {
    return <Navigate to="/portal" replace />;
  }

  if (!isAuthenticated) {
    return (
      <motion.section className={styles.page} variants={container} initial="hidden" animate="show">
        <motion.header className={styles.hero} variants={item}>
          <p className={styles.greetingTime}>{greeting}</p>
          <h1 className={styles.heroTitle}>Discover your next role</h1>
          <p className={styles.heroSub}>Swipe through jobs like a feed — no forms, just exploration.</p>
        </motion.header>

        <motion.div variants={item}>
          <Link to="/swipe" className={styles.heroCta}>
            <span className={styles.heroCtaTitle}>Start swiping</span>
            <span className={styles.heroCtaSub}>The fastest way to explore roles</span>
            <span className={styles.heroCtaArrow} aria-hidden><IconChevronRight size={22} /></span>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <DiscoveryRail
            title="Trending now"
            jobs={collections.trending}
            linkTo="/jobs"
            linkLabel="See all"
            onJobClick={(id) => navigate(`/jobs/${id}`)}
          />
        </motion.div>

        <motion.div variants={item}>
          <DiscoveryRail
            title="Remote jobs"
            jobs={collections.remote}
            linkTo="/jobs?isRemote=true"
            linkLabel="Browse"
            onJobClick={(id) => navigate(`/jobs/${id}`)}
          />
        </motion.div>

        <motion.div variants={item}>
          <DiscoveryRail
            title="Graduate roles"
            jobs={collections.graduate}
            onJobClick={(id) => navigate(`/jobs/${id}`)}
          />
        </motion.div>

        <motion.div variants={item}>
          <DiscoveryRail
            title="High salary"
            jobs={collections.highSalary}
            onJobClick={(id) => navigate(`/jobs/${id}`)}
          />
        </motion.div>

        <motion.div variants={item}>
          <DiscoveryRail
            title="Recently added"
            jobs={collections.recentlyAdded}
            linkTo="/jobs"
            linkLabel="Browse"
            onJobClick={(id) => navigate(`/jobs/${id}`)}
          />
        </motion.div>

        <motion.div className={styles.authPrompt} variants={item}>
          <Link to="/register" className={styles.quickActionPrimary}>Create free account</Link>
          <Link to="/login" className={styles.quickActionGhost}>Sign in</Link>
        </motion.div>
      </motion.section>
    );
  }

  const timelineItems = [
    ...dashboard.recentApplications.slice(0, 3).map((a) => ({
      id: a.id,
      label: `Applied to ${a.job?.title ?? 'a role'}`,
      date: a.appliedAt,
      to: `/jobs/${a.jobId}`,
    })),
    ...dashboard.recentlyViewedJobs.slice(0, 2).map((j) => ({
      id: j.id,
      label: `Viewed ${j.title}`,
      date: j.createdAt,
      to: `/jobs/${j.id}`,
    })),
  ].slice(0, 5);

  return (
    <motion.section className={styles.page} variants={container} initial="hidden" animate="show">
      <motion.header className={styles.hero} variants={item}>
        <p className={styles.greetingTime}>{greeting}, {firstName}</p>
        <h1 className={styles.heroTitle}>Discover your next role</h1>
        <Link to="/swipe" className={styles.heroCtaInline}>
          Start swiping <IconChevronRight size={18} className={styles.inlineIcon} />
        </Link>
        <div className={styles.statRow}>
          <div className={styles.statPill}>
            <AnimatedCounter value={appsCount} className={styles.statNum} />
            <span className={styles.statLabel}>Applications</span>
          </div>
          <div className={styles.statPill}>
            <AnimatedCounter value={savedCount} className={styles.statNum} />
            <span className={styles.statLabel}>Saved</span>
          </div>
          <div className={styles.statPill}>
            <AnimatedCounter value={matchesToday} className={styles.statNum} />
            <span className={styles.statLabel}>Matches today</span>
          </div>
        </div>
      </motion.header>

      {fetchFailed && (
        <motion.div variants={item}>
          <EmptyState
            illustration="swipe"
            title="Could not refresh your dashboard"
            description="Your feed is still available — try again or start swiping."
            actions={[
              { label: 'Retry', onClick: () => void loadDashboard(), primary: true },
              { label: 'Start swiping', to: '/swipe' },
            ]}
          />
        </motion.div>
      )}

      <motion.div variants={item}>
        <DiscoveryRail
          title="Recommended for you"
          jobs={dashboard.recommendedJobs}
          linkTo="/jobs"
          linkLabel="See all"
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
        {dashboard.recommendedJobs.length === 0 && (
          <EmptyState
            illustration="swipe"
            title="Your feed is warming up"
            description="Start swiping to unlock personalized recommendations."
            actions={[{ label: 'Start swiping', to: '/swipe', primary: true }]}
          />
        )}
      </motion.div>

      <motion.div variants={item}>
        <DiscoveryRail
          title="Remote jobs"
          jobs={collections.remote}
          linkTo="/jobs?isRemote=true"
          linkLabel="Browse"
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
      </motion.div>

      <motion.div variants={item}>
        <DiscoveryRail
          title="Graduate roles"
          jobs={collections.graduate}
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
      </motion.div>

      <motion.div variants={item}>
        <DiscoveryRail
          title="Trending jobs"
          jobs={collections.trending.length > 0 ? collections.trending : dashboard.trendingJobs}
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
      </motion.div>

      <motion.div variants={item}>
        <DiscoveryRail
          title="High salary"
          jobs={collections.highSalary}
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
      </motion.div>

      <motion.div variants={item}>
        <DiscoveryRail
          title="Recently added"
          jobs={collections.recentlyAdded}
          linkTo="/jobs"
          linkLabel="Browse"
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
      </motion.div>

      <motion.div variants={item}>
        <CompanyCarousel jobs={allJobsForCompanies} />
      </motion.div>

      <motion.div className={styles.quickGrid} variants={item}>
        <Link to="/swipe" className={styles.quickActionFeatured}>
          <span className={styles.quickActionIcon} aria-hidden><IconBolt size={20} /></span>
          <span className={styles.quickActionLabel}>Continue Swiping</span>
        </Link>
        <Link to="/saved" className={styles.quickAction}>
          <span className={styles.quickActionIcon} aria-hidden><IconBookmark size={20} /></span>
          <span className={styles.quickActionLabel}>Saved Jobs</span>
        </Link>
        <Link to="/applications" className={styles.quickAction}>
          <span className={styles.quickActionIcon} aria-hidden><IconApplications size={20} /></span>
          <span className={styles.quickActionLabel}>Applications</span>
        </Link>
        {shouldShowMandatoryCompletionPrompts(profile) ? (
          <Link to="/profile/complete" className={styles.quickAction}>
            <span className={styles.quickActionIcon} aria-hidden><IconUser size={20} /></span>
            <span className={styles.quickActionLabel}>Complete Profile</span>
            <span className={styles.quickActionMeta}>{profilePct}%</span>
          </Link>
        ) : (
          <Link to="/profile" className={styles.quickAction}>
            <span className={styles.quickActionIcon} aria-hidden><IconUser size={20} /></span>
            <span className={styles.quickActionLabel}>Profile</span>
          </Link>
        )}
      </motion.div>

      {shouldShowMandatoryCompletionPrompts(profile) && (
        <motion.div className={styles.progressCard} variants={item}>
          <div className={styles.progressHeader}>
            <span>Profile strength</span>
            <AnimatedCounter value={profilePct} suffix="%" className={styles.progressPct} />
          </div>
          <div className={styles.progressTrack}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: `${profilePct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </motion.div>
      )}

      {timelineItems.length > 0 && (
        <motion.section className={styles.timeline} variants={item}>
          <h2 className={styles.sectionTitle}>Recent activity</h2>
          <ul className={styles.timelineList}>
            {timelineItems.map((entry, i) => (
              <motion.li
                key={entry.id + entry.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link to={entry.to} className={styles.timelineItem}>
                  <span className={styles.timelineDot} aria-hidden />
                  <span className={styles.timelineText}>{entry.label}</span>
                  <span className={styles.timelineDate}>
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </motion.section>
      )}

      {dashboard.recentApplications.length > 0 && (
        <motion.section variants={item}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Applications</h2>
            <Link to="/applications" className={styles.sectionLink}>View all</Link>
          </div>
          <div className={styles.appList}>
            {dashboard.recentApplications.slice(0, 3).map((app) => (
              <article
                key={app.id}
                className={styles.appCard}
                onClick={() => navigate(`/jobs/${app.jobId}`)}
                role="button"
                tabIndex={0}
              >
                <StatusBadge status={app.status} />
                <h3 className={styles.appTitle}>{app.job?.title ?? 'Job'}</h3>
                <span className={styles.appDate}>{new Date(app.appliedAt).toLocaleDateString()}</span>
              </article>
            ))}
          </div>
        </motion.section>
      )}
    </motion.section>
  );
}
