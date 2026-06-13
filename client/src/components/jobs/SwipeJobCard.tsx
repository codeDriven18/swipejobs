import { useMemo, useState } from 'react';
import type { Job } from '@/models/job';
import { SourceTrustLevel } from '@/models/enums';
import { formatSalary } from '@/lib/jobFormat';
import {
  formatPostedTime,
  getEmploymentType,
  getExperienceLevel,
  getLocationLabel,
  getWorkType,
  stripHtml,
} from '@/lib/jobCardMeta';
import { resolveJobImage } from '@/lib/resolveJobImage';
import { JobHeroImage } from '@/components/jobs/JobHeroImage';
import { CompanyLogo } from '@/components/jobs/CompanyLogo';
import { JobShareMenu } from '@/components/jobs/JobShareMenu';
import { IconBookmark, IconVerified } from '@/components/icons/Icons';
import styles from './SwipeJobCard.module.css';

interface SwipeJobCardProps {
  job: Job;
  interactive?: boolean;
}

export function SwipeJobCard({ job, interactive = true }: SwipeJobCardProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const heroImage = useMemo(() => resolveJobImage(job), [job]);
  const description = stripHtml(job.description);
  const workType = getWorkType(job);
  const employment = getEmploymentType(job);
  const experience = getExperienceLevel(job);
  const isTrustedSource = (job.sourceTrustLevel ?? SourceTrustLevel.Unknown) >= SourceTrustLevel.Verified;
  const tags = job.tags.slice(0, 4);

  return (
    <>
      <article className={styles.card}>
        <div className={styles.hero}>
          <JobHeroImage
            image={heroImage}
            alt={`${job.title} at ${job.company}`}
            className={styles.heroImage}
            priority
          />
          <div className={styles.heroTop}>
            {job.sourceName && (
              <span className={styles.sourceBadge}>
                {isTrustedSource && <IconVerified size={14} className={styles.sourceIcon} />}
                {job.sourceName}
              </span>
            )}
            {interactive && (
              <button
                type="button"
                className={styles.heroAction}
                aria-label="Share job"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShareOpen(true);
                }}
              >
                <IconBookmark size={18} />
              </button>
            )}
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.companyRow}>
            <CompanyLogo name={job.company} logoUrl={job.companyLogoUrl} size="md" />
            <div className={styles.companyText}>
              <span className={styles.companyName}>{job.company}</span>
              <span className={styles.companyMeta}>
                {[job.companyIndustry, job.companySize].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>

          <h2 className={styles.title}>{job.title}</h2>

          <div className={styles.pills}>
            <span className={styles.pillAccent}>
              {formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl)}
            </span>
            <span className={styles.pill}>{workType}</span>
            <span className={styles.pill}>{employment}</span>
            {experience !== '—' && experience !== 'IT' && experience !== 'Gig' && (
              <span className={styles.pill}>{experience}</span>
            )}
          </div>

          <p className={styles.location}>{getLocationLabel(job)}</p>

          {description && (
            <p className={`${styles.description} copyable-content`}>{description}</p>
          )}

          {tags.length > 0 && (
            <div className={styles.tags}>
              {tags.map((tag) => (
                <span key={tag.id} className={styles.tag}>{tag.name}</span>
              ))}
            </div>
          )}

          <footer className={styles.footer}>
            {job.sourceName && (
              <span className={styles.footerSource}>Source: {job.sourceName}</span>
            )}
            <span className={styles.footerTime}>{formatPostedTime(job.createdAt)}</span>
          </footer>
        </div>
      </article>

      <JobShareMenu job={job} open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}
