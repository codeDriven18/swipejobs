import { useMemo } from 'react';
import { motion, motionValue, useTransform, type MotionValue } from 'framer-motion';
import type { Job } from '@/models/job';
import { getJobCardPreview } from '@/lib/jobPreview';
import { getEmploymentType, getWorkType } from '@/lib/jobCardMeta';
import { resolveJobImage } from '@/lib/resolveJobImage';
import { JobHeroImage } from '@/components/jobs/JobHeroImage';
import { CompanyLogo } from '@/components/jobs/CompanyLogo';
import { IconMapPin } from '@/components/icons/Icons';
import styles from './SwipeCard.module.css';

const ZERO = motionValue(0);

interface SwipeCardProps {
  job: Job;
  dragX?: MotionValue<number>;
  dragY?: MotionValue<number>;
}

export function SwipeCard({ job, dragX, dragY }: SwipeCardProps) {
  const preview = useMemo(() => getJobCardPreview(job), [job]);
  const heroImage = useMemo(() => resolveJobImage(job), [job]);
  const employment = getEmploymentType(job);
  const workType = getWorkType(job);

  const parallaxX = useTransform(dragX ?? ZERO, (v) => v * 0.04);
  const parallaxY = useTransform(dragY ?? ZERO, (v) => v * 0.03);

  return (
    <article className={styles.card}>
      <div className={styles.hero}>
        <motion.div className={styles.heroParallax} style={{ x: parallaxX, y: parallaxY }}>
          <JobHeroImage
            image={heroImage}
            alt=""
            className={styles.heroImage}
            priority
            variant="swipe"
          />
        </motion.div>
        <div className={styles.heroShade} aria-hidden />
        <div className={styles.heroBrand}>
          <CompanyLogo name={preview.company} logoUrl={job.companyLogoUrl} size="sm" />
          <span className={styles.heroBrandName}>{preview.company}</span>
        </div>
      </div>

      <div className={styles.body}>
        <p className={styles.eyebrow}>{preview.company}</p>
        <h2 className={styles.title}>{preview.title}</h2>

        {preview.summary ? (
          <p className={styles.summary}>{preview.summary}</p>
        ) : null}

        <p className={styles.salary}>{preview.salary}</p>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>{employment}</span>
          <span className={styles.metaDot} aria-hidden>·</span>
          <span className={styles.metaItem}>{workType}</span>
          <span className={styles.metaDot} aria-hidden>·</span>
          <span className={`${styles.metaItem} ${styles.metaLocation}`}>
            <IconMapPin size={13} aria-hidden />
            {preview.location}
          </span>
        </div>
      </div>
    </article>
  );
}
