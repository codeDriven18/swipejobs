import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Job } from '@/models/job';
import { CompanyInitial } from '@/components/jobs/CompanyInitial';
import { formatSalary } from '@/lib/jobFormat';
import { getMatchScore } from '@/lib/jobMatch';
import styles from './DiscoveryRail.module.css';

interface DiscoveryJobCardProps {
  job: Job;
  index?: number;
  onClick?: () => void;
}

export function DiscoveryJobCard({ job, index = 0, onClick }: DiscoveryJobCardProps) {
  return (
    <motion.article
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.98 }}
    >
      <CompanyInitial name={job.company} size="sm" />
      <div className={styles.body}>
        <span className={styles.title}>{job.title}</span>
        <span className={styles.company}>{job.company}</span>
        <span className={styles.salary}>
          {formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl)}
        </span>
      </div>
      <span className={styles.match}>{getMatchScore(job)}%</span>
    </motion.article>
  );
}

interface DiscoveryRailProps {
  title: string;
  jobs: Job[];
  linkTo?: string;
  linkLabel?: string;
  onJobClick: (id: string) => void;
}

export function DiscoveryRail({ title, jobs, linkTo, linkLabel, onJobClick }: DiscoveryRailProps) {
  if (jobs.length === 0) return null;

  return (
    <section className={styles.rail}>
      <div className={styles.railHeader}>
        <h2 className={styles.railTitle}>{title}</h2>
        {linkTo && linkLabel && (
          <Link to={linkTo} className={styles.railLink}>{linkLabel}</Link>
        )}
      </div>
      <div className={styles.railScroll}>
        {jobs.map((job, i) => (
          <DiscoveryJobCard
            key={job.id}
            job={job}
            index={i}
            onClick={() => onJobClick(job.id)}
          />
        ))}
      </div>
    </section>
  );
}
