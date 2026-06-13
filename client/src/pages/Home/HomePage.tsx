import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconBolt } from '@/components/icons/Icons';
import { PageHeader } from '@/components/ui/PageHeader';
import styles from '../shared/page.module.css';

export function HomePage() {
  return (
    <section className={styles.section}>
      <PageHeader
        title="SwipeJobs"
        subtitle="Discover gigs and IT jobs with less friction."
      />
      <div className={styles.hero}>
        <p>Create your profile once. Swipe, save, and Quick Apply to jobs that fit.</p>
      </div>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Link to="/swipe" className={styles.linkAccent}>
          Start Swiping <IconBolt size={18} />
        </Link>
      </motion.div>
      <Link to="/jobs" className={styles.link}>Browse All Jobs</Link>
      <Link to="/profile" className={styles.link}>Set Up Profile</Link>
    </section>
  );
}
