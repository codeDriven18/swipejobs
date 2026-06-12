import { motion } from 'framer-motion';
import type { Job } from '@/models/job';
import { CompanyInitial } from '@/components/jobs/CompanyInitial';
import { formatSalary } from '@/lib/jobFormat';
import { getMatchLabel, getMatchScore } from '@/lib/jobMatch';
import styles from './SavedCollectionCard.module.css';

interface SavedCollectionCardProps {
  job: Job;
  savedAt?: string;
  applied?: boolean;
  index?: number;
  onClick?: () => void;
  onUnsave?: (e: React.MouseEvent) => void;
}

export function SavedCollectionCard({
  job,
  savedAt,
  applied,
  index = 0,
  onClick,
  onUnsave,
}: SavedCollectionCardProps) {
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
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className={styles.top}>
        <CompanyInitial name={job.company} size="md" />
        <div className={styles.topMeta}>
          {matchLabel && <span className={styles.match}>{matchLabel} · {getMatchScore(job)}%</span>}
          {applied && <span className={styles.appliedBadge}>Applied</span>}
        </div>
        {onUnsave && !applied && (
          <button
            type="button"
            className={styles.unsave}
            onClick={onUnsave}
            aria-label="Remove from collection"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </button>
        )}
      </div>
      <h3 className={styles.title}>{job.title}</h3>
      <p className={styles.company}>{job.company}</p>
      <p className={styles.salary}>
        {formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl)}
      </p>
      {savedAt && (
        <p className={styles.date}>Saved {new Date(savedAt).toLocaleDateString()}</p>
      )}
      {job.tags.length > 0 && (
        <div className={styles.tags}>
          {job.tags.slice(0, 3).map((t) => (
            <span key={t.id} className={styles.tag}>{t.name}</span>
          ))}
        </div>
      )}
    </motion.article>
  );
}
