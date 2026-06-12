import { motion } from 'framer-motion';
import type { Job } from '@/models/job';
import { formatSalary } from '@/lib/jobFormat';
import {
  formatPostedTime,
  getEmploymentType,
  getExperienceLevel,
  getLocationLabel,
  getWorkType,
  stripHtml,
} from '@/lib/jobCardMeta';
import { getMatchScore } from '@/lib/jobMatch';
import { CompanyLogo } from '@/components/jobs/CompanyLogo';
import styles from './JobCard.module.css';

interface JobCardProps {
  job: Job;
  index?: number;
  onClick?: () => void;
  saved?: boolean;
  applied?: boolean;
  onSaveToggle?: (e: React.MouseEvent) => void;
  onQuickApply?: (e: React.MouseEvent) => void;
  applying?: boolean;
  showDescription?: boolean;
}

export function JobCard({
  job,
  index = 0,
  onClick,
  saved,
  applied,
  onSaveToggle,
  onQuickApply,
  applying = false,
  showDescription = true,
}: JobCardProps) {
  const matchScore = getMatchScore(job);
  const skills = job.tags.slice(0, 5);
  const description = stripHtml(job.description);
  const showActions = Boolean(onSaveToggle || onQuickApply);

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
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
    >
      <header className={styles.header}>
        <CompanyLogo name={job.company} logoUrl={job.companyLogoUrl} size="md" />
        <div className={styles.headerText}>
          <span className={styles.companyName}>{job.company}</span>
        </div>
        <span className={styles.matchBadge} aria-label={`${matchScore}% match`}>
          {matchScore}%
        </span>
      </header>

      <div className={styles.main}>
        <h3 className={styles.title}>{job.title}</h3>
        <p className={styles.salary}>
          {formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl)}
        </p>
        <p className={styles.locationRow}>
          <span>{getLocationLabel(job)}</span>
          <span className={styles.dot} aria-hidden>·</span>
          <span className={styles.workType}>{getWorkType(job)}</span>
        </p>
      </div>

      <div className={styles.metaRow}>
        <span>{getExperienceLevel(job)}</span>
        <span className={styles.dot} aria-hidden>·</span>
        <span>{getEmploymentType(job)}</span>
        <span className={styles.dot} aria-hidden>·</span>
        <span>{formatPostedTime(job.createdAt)}</span>
      </div>

      {skills.length > 0 && (
        <div className={styles.skills}>
          {skills.map((tag) => (
            <span key={tag.id} className={styles.skill}>{tag.name}</span>
          ))}
        </div>
      )}

      {showDescription && description && (
        <p className={`${styles.description} copyable-content`}>{description}</p>
      )}

      {showActions && (
        <div className={styles.actions}>
          {onSaveToggle && (
            <button
              type="button"
              className={saved ? styles.saveBtnActive : styles.saveBtn}
              onClick={onSaveToggle}
              aria-label={saved ? 'Unsave job' : 'Save job'}
            >
              <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {saved ? 'Saved' : 'Save'}
            </button>
          )}
          {onQuickApply && (
            <button
              type="button"
              className={applied ? styles.applyBtnDone : styles.applyBtn}
              disabled={applied || applying}
              onClick={onQuickApply}
            >
              {applied ? 'Applied' : applying ? 'Applying…' : 'Quick Apply'}
            </button>
          )}
        </div>
      )}
    </motion.article>
  );
}

export { formatSalary } from '@/lib/jobFormat';
