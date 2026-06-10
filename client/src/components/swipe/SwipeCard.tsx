import { useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import type { Job } from '@/models/job';
import { JobCategoryLabels, JobLevelLabels } from '@/models/enums';
import { formatSalary, truncateText } from '@/lib/jobFormat';
import { CompanyLink } from '@/components/jobs/CompanyLink';
import { TrendingBadges } from '@/components/ui/TrendingBadge';
import styles from './SwipeCard.module.css';

export type SwipeDirection = 'left' | 'right' | 'up';

const SWIPE_X = 100;
const SWIPE_Y = -90;
const VELOCITY = 450;

const exitVariants = {
  left: { x: -420, opacity: 0, rotate: -18, transition: { type: 'spring' as const, stiffness: 280, damping: 28 } },
  right: { x: 420, opacity: 0, rotate: 18, transition: { type: 'spring' as const, stiffness: 280, damping: 28 } },
  up: { y: -480, opacity: 0, scale: 0.95, transition: { type: 'spring' as const, stiffness: 280, damping: 28 } },
};

interface SwipeCardProps {
  job: Job;
  active: boolean;
  exitDirection: SwipeDirection | null;
  onSwipe: (direction: SwipeDirection) => void;
  onTap: () => void;
  onExitComplete: () => void;
  index: number;
}

export function SwipeCard({
  job,
  active,
  exitDirection,
  onSwipe,
  onTap,
  onExitComplete,
  index,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const skipOpacity = useTransform(x, [-120, -40, 0], [1, 0.3, 0]);
  const saveOpacity = useTransform(x, [0, 40, 120], [0, 0.3, 1]);
  const applyOpacity = useTransform(y, [-100, -30, 0], [1, 0.3, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (exitDirection) return;
    const { offset, velocity } = info;

    if (offset.y < SWIPE_Y || velocity.y < -VELOCITY) {
      onSwipe('up');
      return;
    }
    if (offset.x > SWIPE_X || velocity.x > VELOCITY) {
      onSwipe('right');
      return;
    }
    if (offset.x < -SWIPE_X || velocity.x < -VELOCITY) {
      onSwipe('left');
      return;
    }

    if (Math.abs(offset.x) < 10 && Math.abs(offset.y) < 10) {
      onTap();
    }
  };

  const scale = 1 - index * 0.05;
  const yOffset = index * 10;
  const isExiting = exitDirection !== null;
  const exitHandled = useRef(false);

  return (
    <motion.article
      className={styles.card}
      style={{
        x: isExiting ? undefined : active ? x : 0,
        y: isExiting ? undefined : active ? y : yOffset,
        rotate: isExiting ? undefined : active ? rotate : 0,
        scale,
        zIndex: 10 - index,
      }}
      animate={
        isExiting && exitDirection
          ? exitVariants[exitDirection]
          : { x: 0, y: yOffset, rotate: 0, opacity: 1 }
      }
      drag={active && !isExiting}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      onDragEnd={active && !isExiting ? handleDragEnd : undefined}
      onAnimationComplete={() => {
        if (isExiting && !exitHandled.current) {
          exitHandled.current = true;
          onExitComplete();
        }
      }}
    >
      {active && !isExiting && (
        <>
          <motion.span className={`${styles.stamp} ${styles.stampSkip}`} style={{ opacity: skipOpacity }}>
            SKIP
          </motion.span>
          <motion.span className={`${styles.stamp} ${styles.stampSave}`} style={{ opacity: saveOpacity }}>
            SAVE
          </motion.span>
          <motion.span className={`${styles.stamp} ${styles.stampApply}`} style={{ opacity: applyOpacity }}>
            APPLY
          </motion.span>
        </>
      )}

      <div className={styles.top}>
        <span className={styles.categoryBadge}>{JobCategoryLabels[job.category]}</span>
        {job.isRemote && <span className={styles.remoteBadge}>Remote</span>}
        {job.level > 0 && (
          <span className={styles.levelBadge}>{JobLevelLabels[job.level]}</span>
        )}
      </div>

      <TrendingBadges badges={job.trendingBadges} />

      <h2 className={styles.title}>{job.title}</h2>
      <CompanyLink name={job.company} slug={job.companySlug} className={styles.company} />

      <div className={styles.salaryBlock}>
        <span className={styles.salaryLabel}>Compensation</span>
        <span className={styles.salary}>{formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl)}</span>
      </div>

      <p className={styles.location}>{job.city ?? job.location ?? 'Flexible location'}</p>
      <p className={styles.description}>{truncateText(job.description, 160)}</p>

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
