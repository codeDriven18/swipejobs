import { useMemo, useState, type ReactNode } from 'react';
import type { Job } from '@/models/job';
import { getJobCardPreview } from '@/lib/jobPreview';
import {
  formatPostedTime,
  getEmploymentType,
  getJobBreadcrumb,
  getLevelBadgeLabel,
  getWorkType,
} from '@/lib/jobCardMeta';
import { resolveJobImage } from '@/lib/resolveJobImage';
import { JobHeroImage } from '@/components/jobs/JobHeroImage';
import { SourceBadge } from '@/components/jobs/SourceBadge';
import { CompanyIdentityStrip } from '@/components/jobs/CompanyIdentityStrip';
import { ViewCompanyProfileButton } from '@/components/jobs/ViewCompanyProfileButton';
import { CompanyLogo } from '@/components/jobs/CompanyLogo';
import { JobShareMenu } from '@/components/jobs/JobShareMenu';
import { IconBookmark, IconMapPin } from '@/components/icons/Icons';
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
  heroBadge?: ReactNode;
  heroAction?: ReactNode;
  footerExtra?: ReactNode;
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
  heroBadge,
  heroAction,
  footerExtra,
}: OpportunityCardProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const heroImage = useMemo(() => resolveJobImage(job), [job]);
  const preview = useMemo(() => getJobCardPreview(job), [job]);
  const workType = getWorkType(job);
  const employment = getEmploymentType(job);
  const levelBadge = getLevelBadgeLabel(job);
  const breadcrumb = getJobBreadcrumb(job);
  const showActions = variant === 'discover' && interactive;
  const isSwipe = variant === 'swipe';
  const isCompact = variant === 'compact';

  if (isSwipe) {
    return (
      <>
        <article className={`${styles.card} ${styles.swipe}`}>
          <div className={styles.swipeInner}>
            <div className={styles.swipeTop}>
              <span className={styles.breadcrumb} title={breadcrumb}>{breadcrumb}</span>
              {interactive && !heroAction && (
                <button
                  type="button"
                  className={styles.swipeBookmark}
                  aria-label="Save job"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setShareOpen(true);
                  }}
                >
                  <IconBookmark size={20} />
                </button>
              )}
              {heroAction}
            </div>

            <CompanyLogo
              name={preview.company}
              logoUrl={job.companyLogoUrl}
              size="xl"
              className={styles.swipeLogo}
            />

            <h3 className={styles.title}>{preview.title}</h3>
            <p className={styles.swipeCompany}>{preview.company}</p>

            <p className={styles.locationRow}>
              <IconMapPin size={15} className={styles.locationIcon} />
              <span>{preview.location} · {workType}</span>
            </p>

            <p className={styles.salaryLine}>{preview.salary}</p>

            {preview.skills.length > 0 && (
              <div className={styles.swipeTags} title={preview.tagsLine}>
                {preview.skills.map((skill) => (
                  <span key={skill} className={styles.swipeTag}>{skill}</span>
                ))}
              </div>
            )}

            {preview.summary && (
              <p className={styles.summary}>{preview.summary}</p>
            )}

            <div className={styles.swipeMeta}>
              {levelBadge && <span className={styles.levelBadge}>{levelBadge}</span>}
              <span className={styles.typeBadge}>{employment}</span>
            </div>
          </div>
        </article>

        <JobShareMenu job={job} open={shareOpen} onClose={() => setShareOpen(false)} />
      </>
    );
  }

  return (
    <>
      <article className={`${styles.card} ${styles[variant]}`}>
        <div className={styles.hero} aria-hidden={!interactive}>
          <div className={styles.heroMedia}>
            <JobHeroImage
              image={heroImage}
              alt={`${preview.title} at ${preview.company}`}
              className={styles.heroImage}
              variant={isCompact ? 'compact' : 'default'}
            />
            <div className={styles.heroFade} aria-hidden />
          </div>
          <div className={styles.heroOverlay}>
            <div className={styles.heroOverlayTop}>
              {heroBadge}
              {heroAction}
            </div>
            {!isCompact && (
              <>
                <SourceBadge job={job} className={styles.source} />
                <CompanyIdentityStrip job={job} variant="compact" onDark />
              </>
            )}
          </div>
        </div>

        <div className={styles.body}>
          <h3 className={styles.title}>{preview.title}</h3>
          <p className={styles.companyLine}>{preview.company}</p>
          {job.companySlug && (
            <ViewCompanyProfileButton slug={job.companySlug} variant="inline" className={styles.companyProfileLink} />
          )}

          <div className={styles.pills}>
            <span className={styles.pillAccent}>{preview.salary}</span>
            <span className={styles.pill}>{preview.location}</span>
            {variant === 'discover' && (
              <>
                <span className={styles.pill}>{workType}</span>
                <span className={styles.pill}>{employment}</span>
              </>
            )}
            {isCompact && preview.skills.length > 0 && (
              preview.skills.slice(0, 3).map((skill) => (
                <span key={skill} className={styles.pill}>{skill}</span>
              ))
            )}
          </div>

          {!isCompact && preview.summary && (
            <p className={styles.summary}>{preview.summary}</p>
          )}

          {!isCompact && preview.skills.length > 0 && (
            <div className={styles.tags} title={preview.tagsLine}>
              <span className={styles.tagLine}>{preview.tagsLine}</span>
            </div>
          )}

          {variant === 'discover' && (
            <footer className={styles.footer}>
              {job.sourceName && (
                <span className={styles.footerSource}>Source: {job.sourceName}</span>
              )}
              <span className={styles.footerTime}>
                {formatPostedTime(job.createdAt)}
              </span>
            </footer>
          )}

          {footerExtra && (
            <div className={styles.footerExtra}>{footerExtra}</div>
          )}

          {showActions && (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionGhost}
                onClick={(event) => {
                  event.stopPropagation();
                  onLearnMore?.();
                }}
              >
                Details
              </button>
              {onSave && (
                <button
                  type="button"
                  className={saved ? styles.actionSaved : styles.actionGhost}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSave(event);
                  }}
                >
                  {saved ? 'Saved' : 'Save'}
                </button>
              )}
              <button
                type="button"
                className={styles.actionGhost}
                onClick={(event) => {
                  event.stopPropagation();
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
                  onClick={(event) => {
                    event.stopPropagation();
                    onApply(event);
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
