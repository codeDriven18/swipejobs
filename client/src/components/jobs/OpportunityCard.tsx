import { useMemo, useState } from 'react';
import type { Job } from '@/models/job';
import { formatSalary } from '@/lib/jobFormat';
import {
  formatPostedTime,
  getEmploymentType,
  getLocationLabel,
  getWorkType,
  stripHtml,
} from '@/lib/jobCardMeta';
import { resolveJobImage } from '@/lib/resolveJobImage';
import { JobHeroImage } from '@/components/jobs/JobHeroImage';
import { SourceBadge } from '@/components/jobs/SourceBadge';
import { CompanyIdentityStrip } from '@/components/jobs/CompanyIdentityStrip';
import { JobShareMenu } from '@/components/jobs/JobShareMenu';
import styles from './OpportunityCard.module.css';

export interface OpportunityCardProps {
  job: Job;
  variant?: 'swipe' | 'discover' | 'compact';
  interactive?: boolean;
  saved?: boolean;
  applied?: boolean;
  applying?: boolean;
  onLearnMore?: () => void;
  onSave?: (e: React.MouseEvent) => void;
  onApply?: (e: React.MouseEvent) => void;
  showDescription?: boolean;
}

export function OpportunityCard({
  job,
  variant = 'discover',
  interactive = true,
  saved = false,
  applied = false,
  applying = false,
  onLearnMore,
  onSave,
  onApply,
  showDescription = true,
}: OpportunityCardProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const heroImage = useMemo(() => resolveJobImage(job), [job]);
  const description = stripHtml(job.description);
  const workType = getWorkType(job);
  const employment = getEmploymentType(job);
  const locationLine = `${getLocationLabel(job)} · ${workType}`;
  const tagLimit = variant === 'swipe' ? 3 : variant === 'compact' ? 2 : 3;
  const tags = job.tags.slice(0, tagLimit);
  const showActions = variant === 'discover' && interactive;
  const showDesc = showDescription && variant === 'discover' && description;

  return (
    <>
      <article className={`${styles.card} ${styles[variant]}`}>
        <div className={styles.hero} aria-hidden={!interactive}>
          <JobHeroImage
            image={heroImage}
            alt={`${job.title} at ${job.company}`}
            className={styles.heroImage}
            priority={variant === 'swipe'}
          />
          <div className={styles.heroOverlay}>
            <SourceBadge job={job} className={styles.source} />
            <CompanyIdentityStrip job={job} variant="compact" onDark />
          </div>
        </div>

        <div className={styles.body}>
          <h3 className={styles.title}>{job.title}</h3>
          <div className={styles.pills}>
            <span className={styles.pillAccent}>
              {formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl)}
            </span>
            <span className={styles.pill}>{workType}</span>
            <span className={styles.pill}>{employment}</span>
          </div>
          <p className={styles.location}>{locationLine}</p>

          {showDesc && (
            <p className={`${styles.description} copyable-content`}>{description}</p>
          )}

          {tags.length > 0 && (
            <div className={styles.tags}>
              {tags.map((tag) => (
                <span key={tag.id} className={styles.tag}>{tag.name}</span>
              ))}
            </div>
          )}

          {variant === 'discover' && (
            <footer className={styles.footer}>
              {job.sourceName && <span>Source: {job.sourceName}</span>}
              <span>{formatPostedTime(job.createdAt)}</span>
            </footer>
          )}

          {showActions && (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionGhost}
                onClick={(e) => {
                  e.stopPropagation();
                  onLearnMore?.();
                }}
              >
                Details
              </button>
              {onSave && (
                <button
                  type="button"
                  className={saved ? styles.actionSaved : styles.actionGhost}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave(e);
                  }}
                >
                  {saved ? 'Saved' : 'Save'}
                </button>
              )}
              <button
                type="button"
                className={styles.actionGhost}
                onClick={(e) => {
                  e.stopPropagation();
                  setShareOpen(true);
                }}
              >
                Share
              </button>
              {onApply && (
                <button
                  type="button"
                  className={applied ? styles.actionDone : styles.actionPrimary}
                  disabled={applied || applying}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply(e);
                  }}
                >
                  {applied ? 'Applied' : applying ? 'Applying…' : 'Apply'}
                </button>
              )}
            </div>
          )}
        </div>
      </article>

      <JobShareMenu job={job} open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}
