import { motion } from 'framer-motion';
import type { Job } from '@/models/job';
import { JobCategoryLabels, JobLevelLabels } from '@/models/enums';
import { formatSalary } from '@/lib/jobFormat';
import { CompanyLink } from '@/components/jobs/CompanyLink';
import { TrendingBadges } from '@/components/ui/TrendingBadge';
import styles from './JobCard.module.css';

interface JobCardProps {
  job: Job;
  onClick?: () => void;
  saved?: boolean;
  onSaveToggle?: (e: React.MouseEvent) => void;
}

export function JobCard({ job, onClick, saved, onSaveToggle }: JobCardProps) {
  return (
    <motion.article
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      whileHover={{ y: -3, boxShadow: 'var(--shadow-lg)' }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.header}>
        <div className={styles.badges}>
          <span className={styles.badge}>{JobCategoryLabels[job.category]}</span>
          {job.isRemote && <span className={styles.badgeOutline}>Remote</span>}
          {job.level > 0 && (
            <span className={styles.badgeOutline}>{JobLevelLabels[job.level]}</span>
          )}
        </div>
        {onSaveToggle && (
          <button
            type="button"
            className={saved ? styles.saved : styles.saveBtn}
            onClick={onSaveToggle}
            aria-label={saved ? 'Unsave job' : 'Save job'}
          >
            {saved ? '♥' : '♡'}
          </button>
        )}
      </div>

      <TrendingBadges badges={job.trendingBadges} />

      <h3 className={styles.title}>{job.title}</h3>
      <CompanyLink name={job.company} slug={job.companySlug} className={styles.company} />

      <div className={styles.salaryRow}>
        <span className={styles.salary}>{formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl)}</span>
      </div>

      <p className={styles.meta}>
        {job.city ?? job.location ?? 'Location flexible'}
      </p>

      {job.tags.length > 0 && (
        <div className={styles.tags}>
          {job.tags.slice(0, 4).map((t) => (
            <span key={t.id} className={styles.tag}>{t.name}</span>
          ))}
        </div>
      )}
    </motion.article>
  );
}

export { formatSalary } from '@/lib/jobFormat';
