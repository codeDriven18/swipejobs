import { useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import type { Job } from '@/models/job';
import { JobCategoryLabels, JobLevelLabels } from '@/models/enums';
import { formatSalary, truncateText } from '@/lib/jobFormat';
import { getMatchLabel, getMatchScore } from '@/lib/jobMatch';
import { CompanyInitial } from '@/components/jobs/CompanyInitial';
import styles from './SwipeCard.module.css';

export type SwipeAction = 'pass' | 'save' | 'apply';

const THRESHOLD_X = 90;
const VELOCITY = 400;
const EXIT_DISTANCE = 640;

interface SwipeCardProps {
  job: Job;
  active: boolean;
  exitAction: SwipeAction | null;
  onAction: (action: SwipeAction) => void;
  onTap: () => void;
  onExitComplete: () => void;
  stackIndex: number;
}

function employmentType(job: Job): string {
  if (job.isRemote) return 'Remote';
  if (job.level > 0) return JobLevelLabels[job.level];
  return JobCategoryLabels[job.category];
}

export function SwipeCard({
  job,
  active,
  exitAction,
  onAction,
  onTap,
  onExitComplete,
  stackIndex,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useMotionValue(1);
  const dragScale = useMotionValue(1);

  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);
  const passOpacity = useTransform(x, [-140, -50, 0], [1, 0.35, 0]);
  const applyOpacity = useTransform(x, [0, 50, 140], [0, 0.35, 1]);
  const shadowSpread = useTransform(x, (v) => Math.min(Math.abs(v) * 0.08 + 8, 32));
  const boxShadow = useTransform(
    shadowSpread,
    (s) => `0 ${s}px ${s * 2}px rgba(0,0,0,0.14)`,
  );

  const [isFlying, setIsFlying] = useState(false);
  const exitStarted = useRef(false);
  const wasActive = useRef(active);

  const stackScale = 1 - stackIndex * 0.045;
  const stackY = stackIndex * 14;

  const runExit = async (action: SwipeAction, velocityX = 0, velocityY = 0) => {
    x.stop();
    y.stop();
    dragScale.stop();

    const opacityAnim = animate(opacity, 0, { duration: 0.22, ease: 'easeOut' });
    void animate(dragScale, action === 'save' ? 0.85 : 1.02, { duration: 0.18 });

    if (action === 'pass') {
      await Promise.all([
        opacityAnim,
        animate(x, -EXIT_DISTANCE, {
          type: 'spring',
          stiffness: Math.min(380, 180 + Math.abs(velocityX) * 0.35),
          damping: 28,
          velocity: velocityX,
        }),
      ]);
    } else if (action === 'apply') {
      await Promise.all([
        opacityAnim,
        animate(x, EXIT_DISTANCE, {
          type: 'spring',
          stiffness: Math.min(380, 180 + Math.abs(velocityX) * 0.35),
          damping: 28,
          velocity: velocityX,
        }),
        animate(y, -40, { duration: 0.25 }),
      ]);
    } else {
      await Promise.all([
        opacityAnim,
        animate(x, EXIT_DISTANCE * 0.7, {
          type: 'spring',
          stiffness: 300,
          damping: 26,
        }),
        animate(y, 120, {
          type: 'spring',
          stiffness: 260,
          damping: 24,
          velocity: velocityY,
        }),
      ]);
    }

    onExitComplete();
  };

  const beginExit = (action: SwipeAction, velocityX = 0, velocityY = 0) => {
    if (exitStarted.current) return;
    exitStarted.current = true;
    setIsFlying(true);
    void runExit(action, velocityX, velocityY);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (!active || exitStarted.current) return;
    const drag = Math.max(Math.abs(info.offset.x), Math.abs(info.offset.y));
    dragScale.set(1 + Math.min(drag * 0.0008, 0.04));
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (exitStarted.current) return;

    const { offset, velocity } = info;
    void animate(dragScale, 1, { type: 'spring', stiffness: 400, damping: 30 });

    if (offset.x < -THRESHOLD_X || velocity.x < -VELOCITY) {
      onAction('pass');
      beginExit('pass', velocity.x, velocity.y);
      return;
    }
    if (offset.x > THRESHOLD_X || velocity.x > VELOCITY) {
      onAction('apply');
      beginExit('apply', velocity.x, velocity.y);
      return;
    }

    void Promise.all([
      animate(x, 0, { type: 'spring', stiffness: 520, damping: 38 }),
      animate(y, 0, { type: 'spring', stiffness: 520, damping: 38 }),
    ]);

    if (Math.abs(offset.x) < 8 && Math.abs(offset.y) < 8) {
      onTap();
    }
  };

  useEffect(() => {
    if (!exitAction || !active || exitStarted.current) return;
    beginExit(exitAction);
  }, [exitAction, active]);

  useEffect(() => {
    if (active && !wasActive.current && !exitStarted.current) {
      y.set(stackY);
      void animate(y, 0, { type: 'spring', stiffness: 420, damping: 34 });
    }
    wasActive.current = active;
  }, [active, stackY, y]);

  const matchLabel = getMatchLabel(job);
  const matchScore = getMatchScore(job);
  const interactive = active || isFlying;

  return (
    <motion.article
      className={`${styles.card} ${active ? styles.cardActive : ''}`}
      style={{
        x: interactive ? x : 0,
        y: interactive ? y : stackY,
        rotate: interactive ? rotate : 0,
        opacity,
        scale: interactive ? dragScale : stackScale,
        zIndex: 30 - stackIndex,
        boxShadow: active ? boxShadow : `0 ${8 + stackIndex * 4}px ${20 + stackIndex * 6}px rgba(0,0,0,${0.1 - stackIndex * 0.02})`,
      }}
      drag={active && !isFlying}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      dragMomentum={false}
      onDrag={handleDrag}
      onDragEnd={active && !isFlying ? handleDragEnd : undefined}
    >
      {active && !isFlying && (
        <>
          <motion.span className={`${styles.stamp} ${styles.stampPass}`} style={{ opacity: passOpacity }}>
            PASS
          </motion.span>
          <motion.span className={`${styles.stamp} ${styles.stampApply}`} style={{ opacity: applyOpacity }}>
            APPLY
          </motion.span>
        </>
      )}

      <header className={styles.top}>
        <CompanyInitial name={job.company} size="lg" />
        <div className={styles.topText}>
          <span className={styles.company}>{job.company}</span>
          {matchLabel && (
            <span className={styles.matchBadge}>
              {matchLabel} · {matchScore}%
            </span>
          )}
        </div>
      </header>

      <div className={styles.middle}>
        <h2 className={styles.title}>{job.title}</h2>
        <p className={styles.salary}>
          {formatSalary(job.salaryMin, job.salaryMax, job.category, job.externalUrl)}
        </p>
        <div className={styles.metaRow}>
          <span>{job.city ?? job.location ?? 'Flexible'}</span>
          <span className={styles.metaDot}>·</span>
          <span>{employmentType(job)}</span>
        </div>
      </div>

      <footer className={styles.bottom}>
        {job.tags.length > 0 && (
          <div className={styles.tags}>
            {job.tags.slice(0, 5).map((t) => (
              <span key={t.id} className={styles.tag}>{t.name}</span>
            ))}
          </div>
        )}
        <p className={styles.preview}>{truncateText(job.description, 120)}</p>
      </footer>
    </motion.article>
  );
}
