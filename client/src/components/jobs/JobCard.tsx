import { motion } from 'framer-motion';
import type { Job } from '@/models/job';
import { JobCategoryLabels, JobLevelLabels } from '@/models/enums';
import { formatSalary } from '@/lib/jobFormat';
import { CompanyLink } from '@/components/jobs/CompanyLink';
import { CompanyInitial } from '@/components/jobs/CompanyInitial';
import { TrendingBadges } from '@/components/ui/TrendingBadge';
import styles from './JobCard.module.css';

interface JobCardProps {
  job: Job;
  index?: number;
  onClick?: () => void;
  saved?: boolean;
  onSaveToggle?: (e: React.MouseEvent) => void;
}

import { getMatchLabel } from '@/lib/jobMatch';

export function JobCard({ job, index = 0, onClick, saved, onSaveToggle }: JobCardProps) {
  const matchLabel = getMatchLabel(job);

  return (
    <motion.article
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
    >
      <div className={styles.topRow}>
        <CompanyInitial name={job.company} size="md" />
        <div className={styles.topMeta}>
          <div className={styles.badges}>
            <span className={styles.badge}>{JobCategoryLabels[job.category]}</span>
            {job.isRemote && <span className={styles.badgeMuted}>Remote</span>}
            {job.level > 0 && <span className={styles.badgeMuted}>{JobLevelLabels[job.level]}</span>}
          </div>
          {matchLabel && <span className={styles.matchScore}>{matchLabel}</span>}
        </div>
        {onSaveToggle && (
          <motion.button
            type="button"
            className={saved ? styles.saved : styles.saveBtn}
            onClick={onSaveToggle}
            aria-label={saved ? 'Unsave job' : 'Save job'}
            whileTap={{ scale: 1.25 }}
            animate={saved ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        )}
      </div>

      <TrendingBadges badges={job.trendingBadges} />

      <h3 className={styles.title}>{job.title}</h3>
      <CompanyLink name={job.company} slug={job.companySlug} className={styles.company} />

      <div className={styles.detailsRow}>
        <span className={styles.salary}>{formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl)}</span>
        <span className={styles.dot} aria-hidden>·</span>
        <span className={styles.location}>{job.city ?? job.location ?? 'Flexible'}</span>
      </div>

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
