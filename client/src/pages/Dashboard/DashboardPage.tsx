import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dashboardApi } from '@/api/dashboardApi';
import { JobCard } from '@/components/jobs/JobCard';
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
  const { isAuthenticated, user } = useAuth();
  const isJobSeeker = user?.role === UserRole.JobSeeker;
  const { profile, loading: profileLoading } = useProfile();
  const [dashboard, setDashboard] = useState<UserDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const { collections } = useDiscoveryCollections(isAuthenticated);

  useEffect(() => {
    if (profileLoading) return;
    if (!isAuthenticated || !isJobSeeker) {
      setDashboard(null);
      setLoading(false);
      return;
    }
    dashboardApi.getMyDashboard()
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, [isAuthenticated, isJobSeeker, profileLoading]);

  const profilePct = dashboard?.profileCompletionPercentage
    ?? getProfileCompletionPercent(profile);
  const savedCount = dashboard?.savedJobsCount ?? 0;
  const appsCount = dashboard?.applicationsCount ?? 0;
  const matchesToday = Math.min(
    dashboard?.recommendedJobs.length ?? 0,
    dashboard?.swipeRemainingEstimate ?? 12,
  );
  const firstName = profile?.firstName?.trim() || 'there';
  const greeting = getTimeGreeting();

  const allJobsForCompanies = useMemo(() => [
    ...(dashboard?.recommendedJobs ?? []),
    ...(dashboard?.trendingJobs ?? []),
    ...collections.remote,
  ], [dashboard, collections.remote]);

  if (profileLoading || loading) {
    return (
      <section className={styles.page}>
        <DashboardSkeleton />
      </section>
    );
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
            <span className={styles.heroCtaArrow}>→</span>
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

        <motion.div className={styles.authPrompt} variants={item}>
          <Link to="/register" className={styles.quickActionPrimary}>Create free account</Link>
          <Link to="/login" className={styles.quickActionGhost}>Sign in</Link>
        </motion.div>
      </motion.section>
    );
  }

  const timelineItems = [
    ...(dashboard?.recentApplications.slice(0, 3).map((a) => ({
      id: a.id,
      label: `Applied to ${a.job?.title ?? 'a role'}`,
      date: a.appliedAt,
      to: `/jobs/${a.jobId}`,
    })) ?? []),
    ...(dashboard?.recentlyViewedJobs.slice(0, 2).map((j) => ({
      id: j.id,
      label: `Viewed ${j.title}`,
      date: j.createdAt,
      to: `/jobs/${j.id}`,
    })) ?? []),
  ].slice(0, 5);

  return (
    <motion.section className={styles.page} variants={container} initial="hidden" animate="show">
      <motion.header className={styles.hero} variants={item}>
        <p className={styles.greetingTime}>{greeting}, {firstName}</p>
        <h1 className={styles.heroTitle}>Continue your search</h1>
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

      <motion.div className={styles.quickGrid} variants={item}>
        <Link to="/swipe" className={styles.quickActionFeatured}>
          <span className={styles.quickActionIcon}>⚡</span>
          <span className={styles.quickActionLabel}>Continue Swiping</span>
        </Link>
        <Link to="/saved" className={styles.quickAction}>
          <span className={styles.quickActionIcon}>♡</span>
          <span className={styles.quickActionLabel}>Saved Jobs</span>
        </Link>
        <Link to="/applications" className={styles.quickAction}>
          <span className={styles.quickActionIcon}>✓</span>
          <span className={styles.quickActionLabel}>Applications</span>
        </Link>
        {shouldShowMandatoryCompletionPrompts(profile) ? (
          <Link to="/profile/complete" className={styles.quickAction}>
            <span className={styles.quickActionIcon}>◎</span>
            <span className={styles.quickActionLabel}>Complete Profile</span>
            <span className={styles.quickActionMeta}>{profilePct}%</span>
          </Link>
        ) : (
          <Link to="/profile" className={styles.quickAction}>
            <span className={styles.quickActionIcon}>◎</span>
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

      <motion.div variants={item}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recommended for you</h2>
          <Link to="/jobs" className={styles.sectionLink}>See all</Link>
        </div>
        {(dashboard?.recommendedJobs.length ?? 0) === 0 ? (
          <EmptyState
            illustration="swipe"
            title="Your feed is warming up"
            description="Start swiping to unlock personalized recommendations."
            actions={[{ label: 'Start swiping', to: '/swipe', primary: true }]}
          />
        ) : (
          <div className={styles.jobScroll}>
            {(dashboard?.recommendedJobs ?? []).map((job, index) => (
              <JobCard key={job.id} job={job} index={index} onClick={() => navigate(`/jobs/${job.id}`)} />
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={item}>
        <CompanyCarousel jobs={allJobsForCompanies} />
      </motion.div>

      <motion.div variants={item}>
        <DiscoveryRail
          title="Remote jobs"
          jobs={collections.remote}
          linkTo="/jobs"
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
          title="Fast apply"
          jobs={dashboard?.trendingJobs ?? collections.trending}
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
      </motion.div>

      <motion.div variants={item}>
        <DiscoveryRail
          title="Trending"
          jobs={collections.trending.length > 0 ? collections.trending : (dashboard?.trendingJobs ?? [])}
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
      </motion.div>

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

      {(dashboard?.recentApplications.length ?? 0) > 0 && (
        <motion.section variants={item}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Applications</h2>
            <Link to="/applications" className={styles.sectionLink}>View all</Link>
          </div>
          <div className={styles.appList}>
            {dashboard!.recentApplications.slice(0, 3).map((app) => (
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
