import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './MarketingPage.module.css';

const stats = [
  { value: '10k+', label: 'Job seekers' },
  { value: '500+', label: 'Companies' },
  { value: '2k+', label: 'Active jobs' },
  { value: '95%', label: 'Mobile-first' },
];

const features = [
  {
    title: 'Swipe to discover',
    text: 'Browse roles the way you browse your feed — fast, visual, and fun.',
  },
  {
    title: 'Smart recommendations',
    text: 'Your activity powers personalized job picks on your dashboard.',
  },
  {
    title: 'Quick apply',
    text: 'Complete your profile once and apply to matching roles in seconds.',
  },
];

export function LandingPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <motion.div
          className={styles.heroCopy}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <span className={styles.eyebrow}>Job search, reimagined</span>
          <h1 className={styles.title}>Find your next role with a swipe.</h1>
          <p className={styles.lead}>
            SwipeJobs blends Tinder-style discovery with a serious job board — personalized
            recommendations, saved jobs, and instant applications in one mobile-first app.
          </p>
          <div className={styles.ctaRow}>
            <Link to="/register" className={styles.btnPrimary}>Create free account</Link>
            <Link to="/swipe" className={styles.btnSecondary}>Try swipe mode</Link>
          </div>
        </motion.div>
        <motion.div
          className={styles.heroVisual}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className={styles.heroCard}>
            <p className={styles.heroCardTitle}>Senior Frontend Engineer</p>
            <p className={styles.heroCardMeta}>Remote · Tashkent · $3k–$5k</p>
          </div>
        </motion.div>
      </section>

      <section className={styles.section}>
        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Built for modern job hunters</h2>
        <p className={styles.sectionLead}>
          Whether you are exploring gigs or leveling up your IT career, SwipeJobs keeps you moving.
        </p>
        <div className={styles.grid3}>
          {features.map((feature) => (
            <article key={feature.title} className={styles.card}>
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.cardText}>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Ready to start?</h2>
          <p className={styles.sectionLead}>
            Join thousands of job seekers and employers on SwipeJobs today.
          </p>
          <div className={styles.ctaRow}>
            <Link to="/register" className={styles.btnPrimary}>Get started free</Link>
            <Link to="/features" className={styles.btnSecondary}>See all features</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
