import { useMemo } from 'react';
import { motion, motionValue, useTransform, type MotionValue } from 'framer-motion';
import type { Job } from '@/models/job';
import { getJobCardPreview } from '@/lib/jobPreview';
import { resolveJobImage } from '@/lib/resolveJobImage';
import { JobHeroImage } from '@/components/jobs/JobHeroImage';
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
  const skillTags = preview.skills.slice(0, 5);

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
      </div>

      <div className={styles.body}>
        <h2 className={styles.title}>{preview.title}</h2>
        <p className={styles.company}>{preview.company}</p>
        <p className={styles.salary}>{preview.salary}</p>

        <p className={styles.location}>
          <IconMapPin size={14} aria-hidden />
          <span>{preview.location}</span>
        </p>

        {skillTags.length > 0 ? (
          <ul className={styles.tags} aria-label="Skills">
            {skillTags.map((skill) => (
              <li key={skill} className={styles.tag}>
                {skill}
              </li>
            ))}
          </ul>
        ) : null}

        {preview.summary ? (
          <p className={styles.summary}>{preview.summary}</p>
        ) : null}

        <p className={styles.tapHint} aria-hidden>Tap to view full details</p>
      </div>
    </article>
  );
}
