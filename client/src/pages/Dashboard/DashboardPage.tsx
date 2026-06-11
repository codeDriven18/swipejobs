import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dashboardApi } from '@/api/dashboardApi';
import { JobCard } from '@/components/jobs/JobCard';
import { CompanyLink } from '@/components/jobs/CompanyLink';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { calculateProfileProgress } from '@/lib/profileProgress';
import { profileToFormState } from '@/lib/profileForm';
import type { UserDashboard } from '@/models/dashboard';
import styles from './DashboardPage.module.css';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

function JobSection({
  title,
  jobs,
  emptyHint,
  linkTo,
  linkLabel,
  onJobClick,
}: {
  title: string;
  jobs: UserDashboard['recommendedJobs'];
  emptyHint: string;
  linkTo?: string;
  linkLabel?: string;
  onJobClick: (id: string) => void;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {linkTo && linkLabel && (
          <Link to={linkTo} className={styles.sectionLink}>{linkLabel}</Link>
        )}
      </div>
      {jobs.length === 0 ? (
        <p className={styles.emptyHint}>{emptyHint}</p>
      ) : (
        <div className={styles.jobScroll}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => onJobClick(job.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [dashboard, setDashboard] = useState<UserDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const localProgress = useMemo(() => {
    if (!profile) return 0;
    return calculateProfileProgress(
      profileToFormState(profile),
    ).percentage;
  }, [profile]);

  useEffect(() => {
    if (profileLoading) return;
    if (!isAuthenticated) {
      setDashboard(null);
      setLoading(false);
      return;
    }

    dashboardApi.getMyDashboard()
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, [isAuthenticated, profileLoading]);

  const profilePct = dashboard?.profileCompletionPercentage ?? localProgress;
  const savedCount = dashboard?.savedJobsCount ?? 0;
  const appsCount = dashboard?.applicationsCount ?? 0;
  const firstName = profile?.firstName?.trim() || 'there';
  const topTech = dashboard?.interests
    ? Object.entries(dashboard.interests.preferredTechnologies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([k]) => k)
    : [];

  if (profileLoading || loading) {
    return (
      <section className={styles.page}>
        <PageHeader title="Dashboard" subtitle="Your personalized job search hub." />
        <DashboardSkeleton />
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className={styles.page}>
        <PageHeader
          title="Dashboard"
          subtitle="Your personalized job search hub."
          action={<InstallAppButton variant="compact" showFallback={false} />}
        />
        <p className={styles.greeting}>Browse jobs as a guest, or sign in for your own dashboard.</p>
        <div className={styles.quickLinks}>
          <Link to="/register" className={styles.quickLinkFeatured}>
            <span className={styles.quickIcon}>◎</span>
            Create account
          </Link>
          <Link to="/login" className={styles.quickLink}>
            <span className={styles.quickIcon}>→</span>
            Sign in
          </Link>
          <Link to="/swipe" className={styles.quickLink}>
            <span className={styles.quickIcon}>⚡</span>
            Start swiping
          </Link>
          <Link to="/jobs" className={styles.quickLink}>
            <span className={styles.quickIcon}>☰</span>
            Browse jobs
          </Link>
          <Link to="/landing" className={styles.quickLink}>
            <span className={styles.quickIcon}>✦</span>
            About SwipeJobs
          </Link>
        </div>
      </section>
    );
  }

  return (
    <motion.section className={styles.page} variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <PageHeader
          title="Dashboard"
          subtitle="Your job search at a glance."
          action={<InstallAppButton variant="compact" showFallback={false} />}
        />
        <p className={styles.greeting}>Welcome back, {firstName}.</p>
      </motion.div>

      <motion.div className={styles.statsGrid} variants={item}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{profilePct}%</span>
          <span className={styles.statLabel}>Profile</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{savedCount}</span>
          <span className={styles.statLabel}>Saved</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{appsCount}</span>
          <span className={styles.statLabel}>Applied</span>
        </div>
      </motion.div>

      <motion.div className={styles.progressCard} variants={item}>
        <div className={styles.progressHeader}>
          <span className={styles.progressTitle}>Profile completion</span>
          <span className={styles.progressPct}>{profilePct}%</span>
        </div>
        <div className={styles.progressTrack}>
          <motion.div
            className={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${profilePct}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <p className={styles.progressHint}>
          {profilePct >= 100
            ? 'Your profile is ready for Quick Apply.'
            : 'Complete your profile to unlock Quick Apply on every job.'}
        </p>
      </motion.div>

      <motion.div variants={item}>
        <Link to="/swipe" className={styles.continueSwipe}>
          <div>
            <span className={styles.continueTitle}>Continue Swiping ⚡</span>
            <span className={styles.continueSub}>
              {dashboard?.swipeRemainingEstimate
                ? `~${dashboard.swipeRemainingEstimate} jobs left to discover`
                : 'Discover jobs matched to your interests'}
            </span>
          </div>
          <span className={styles.continueArrow}>→</span>
        </Link>
      </motion.div>

      {topTech.length > 0 && (
        <motion.div className={styles.interestChips} variants={item}>
          <span className={styles.interestLabel}>Your interests</span>
          <div className={styles.chips}>
            {topTech.map((t) => (
              <span key={t} className={styles.chip}>{t}</span>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div className={styles.quickLinks} variants={item}>
        <Link to="/swipe" className={styles.quickLinkFeatured}>
          <span className={styles.quickIcon}>⚡</span>
          Swipe Mode
        </Link>
        <Link to="/saved" className={styles.quickLink}>
          <span className={styles.quickIcon}>♡</span>
          Saved Jobs
        </Link>
        <Link to="/applications" className={styles.quickLink}>
          <span className={styles.quickIcon}>✓</span>
          Applications
        </Link>
        <Link to="/profile" className={styles.quickLink}>
          <span className={styles.quickIcon}>◎</span>
          Profile
        </Link>
      </motion.div>

      <motion.div variants={item}>
        <JobSection
          title="Recommended for you"
          jobs={dashboard?.recommendedJobs ?? []}
          emptyHint="Swipe and save jobs to improve your recommendations."
          linkTo="/jobs"
          linkLabel="Browse all"
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
      </motion.div>

      <motion.div variants={item}>
        <JobSection
          title="Recently viewed"
          jobs={dashboard?.recentlyViewedJobs ?? []}
          emptyHint="Jobs you open will appear here."
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
      </motion.div>

      <motion.div variants={item}>
        <JobSection
          title="Trending now"
          jobs={dashboard?.trendingJobs ?? []}
          emptyHint="Popular jobs will show up as activity grows."
          linkTo="/jobs"
          linkLabel="See all"
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
      </motion.div>

      {(dashboard?.followedCompanyJobs.length ?? 0) > 0 && (
        <motion.div variants={item}>
          <JobSection
            title="From companies you follow"
            jobs={dashboard!.followedCompanyJobs}
            emptyHint=""
            onJobClick={(id) => navigate(`/jobs/${id}`)}
          />
        </motion.div>
      )}

      <motion.div className={styles.section} variants={item}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent applications</h2>
          {appsCount > 0 && (
            <Link to="/applications" className={styles.sectionLink}>View all</Link>
          )}
        </div>
        {!profile ? (
          <p className={styles.emptyHint}>
            <Link to="/profile">Set up your profile</Link> to start applying.
          </p>
        ) : (dashboard?.recentApplications.length ?? 0) === 0 ? (
          <p className={styles.emptyHint}>No applications yet — try Swipe Mode or Quick Apply.</p>
        ) : (
          <div className={styles.appList}>
            {dashboard!.recentApplications.map((app) => (
              <article
                key={app.id}
                className={styles.appCard}
                onClick={() => navigate(`/jobs/${app.jobId}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/jobs/${app.jobId}`)}
              >
                <div className={styles.appMeta}>
                  <StatusBadge status={app.status} />
                  <span className={styles.appDate}>
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className={styles.appTitle}>{app.job?.title ?? 'Job'}</h3>
                <CompanyLink
                  name={app.job?.company ?? ''}
                  slug={app.job?.companySlug}
                  className={styles.appCompany}
                />
              </article>
            ))}
          </div>
        )}
      </motion.div>
    </motion.section>
  );
}
