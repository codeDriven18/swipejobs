import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import type { Job } from '@/models/job';
import { SwipeJobCard } from '@/components/jobs/SwipeJobCard';
import { IconHeart, IconX } from '@/components/icons/Icons';
import {
  STACK_LAYERS,
  STACK_STYLE,
  SWIPE_EXIT,
  SWIPE_EXIT_X,
  SWIPE_EXIT_Y,
  SWIPE_ROTATE_RANGE,
  SWIPE_SNAP_BACK,
  SWIPE_TAP_SLOP,
  SWIPE_THRESHOLD_X,
  SWIPE_THRESHOLD_Y,
} from './swipeConstants';
import styles from './PremiumSwipeDeck.module.css';

export type SwipeDirection = 'pass' | 'apply' | 'save';

export interface PremiumSwipeDeckHandle {
  dismiss: (direction: SwipeDirection) => void;
}

interface PremiumSwipeDeckProps {
  jobs: Job[];
  onDismiss: (job: Job, direction: SwipeDirection) => void;
  onTap: (job: Job) => void;
}

interface ExitState {
  job: Job;
  direction: SwipeDirection;
  /** Starting position for exit animation — preserves drag momentum */
  startX: number;
  startY: number;
  startRotate: number;
}

/** Position-only threshold. If position doesn't meet threshold, check velocity as a fallback. */
function resolveDirection(
  offset: { x: number; y: number },
  velocity?: { x: number; y: number },
): SwipeDirection | null {
  const absX = Math.abs(offset.x);
  const absY = Math.abs(offset.y);

  // Primary: position threshold
  if (offset.y <= -SWIPE_THRESHOLD_Y && absY > absX) return 'save';
  if (offset.x <= -SWIPE_THRESHOLD_X && absX >= absY) return 'pass';
  if (offset.x >= SWIPE_THRESHOLD_X && absX >= absY) return 'apply';

  // Fallback: fast flick even if position didn't cross threshold
  if (velocity) {
    const velAbsX = Math.abs(velocity.x);
    const velAbsY = Math.abs(velocity.y);
    const VELOCITY_THRESHOLD = 380;

    if (velocity.y <= -VELOCITY_THRESHOLD && velAbsY > velAbsX && absY > 20) return 'save';
    if (velocity.x <= -VELOCITY_THRESHOLD && velAbsX >= velAbsY && absX > 20) return 'pass';
    if (velocity.x >= VELOCITY_THRESHOLD && velAbsX >= velAbsY && absX > 20) return 'apply';
  }

  return null;
}

function exitTarget(direction: SwipeDirection) {
  if (direction === 'pass') return { x: -SWIPE_EXIT_X, y: 0, rotate: -SWIPE_ROTATE_RANGE };
  if (direction === 'apply') return { x: SWIPE_EXIT_X, y: 0, rotate: SWIPE_ROTATE_RANGE };
  return { x: 0, y: -SWIPE_EXIT_Y, rotate: 0 };
}

export const PremiumSwipeDeck = forwardRef<PremiumSwipeDeckHandle, PremiumSwipeDeckProps>(
  function PremiumSwipeDeck({ jobs, onDismiss, onTap }, ref) {
    const topJob = jobs[0];
    const stackJobs = jobs.slice(0, STACK_LAYERS);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 0, 200], [-SWIPE_ROTATE_RANGE, 0, SWIPE_ROTATE_RANGE]);

    const passOpacity = useTransform(x, [-SWIPE_THRESHOLD_X, -24, 0], [1, 0.35, 0]);
    const applyOpacity = useTransform(x, [0, 24, SWIPE_THRESHOLD_X], [0, 0.35, 1]);
    const saveOpacity = useTransform(y, [0, -24, -SWIPE_THRESHOLD_Y], [0, 0.35, 1]);

    const [exitState, setExitState] = useState<ExitState | null>(null);
    const exitLockedRef = useRef(false);
    const draggedRef = useRef(false);
    const topJobRef = useRef(topJob);
    topJobRef.current = topJob;

    useEffect(() => {
      if (exitLockedRef.current) return;
      x.set(0);
      y.set(0);
      draggedRef.current = false;
    }, [topJob?.id, x, y]);

    const finishExit = useCallback(() => {
      exitLockedRef.current = false;
      // Reset motion values so the next top card starts at centre, not at
      // the drag-release position (which caused the "frozen card" ghost bug).
      x.set(0);
      y.set(0);
      setExitState(null);
    }, [x, y]);

    /**
     * Commit and animate the top card out.
     * fromDrag=true: capture current x/y/rotate so exit continues from where the drag ended.
     * fromDrag=false (button press): animate from center.
     */
    const flyOut = useCallback((direction: SwipeDirection, fromDrag = false) => {
      if (exitLockedRef.current || !topJobRef.current) return;
      const job = topJobRef.current;

      const startX = fromDrag ? x.get() : 0;
      const startY = fromDrag ? y.get() : 0;
      const startRotate = fromDrag ? rotate.get() : 0;

      exitLockedRef.current = true;
      x.stop();
      y.stop();

      if (!fromDrag) {
        x.set(0);
        y.set(0);
      }

      onDismiss(job, direction);
      setExitState({ job, direction, startX, startY, startRotate });
    }, [onDismiss, x, y, rotate]);

    useImperativeHandle(ref, () => ({
      dismiss: (direction: SwipeDirection) => flyOut(direction, false),
    }), [flyOut]);

    const handleDragStart = () => {
      draggedRef.current = false;
    };

    const handleDrag = (_: unknown, info: PanInfo) => {
      if (Math.abs(info.offset.x) > SWIPE_TAP_SLOP || Math.abs(info.offset.y) > SWIPE_TAP_SLOP) {
        draggedRef.current = true;
      }
    };

    const handleDragEnd = (_: unknown, info: PanInfo) => {
      if (exitLockedRef.current) return;

      const direction = resolveDirection(info.offset, info.velocity);
      if (direction) {
        flyOut(direction, true);
        return;
      }

      void Promise.all([
        animate(x, 0, SWIPE_SNAP_BACK),
        animate(y, 0, SWIPE_SNAP_BACK),
      ]);

      if (!draggedRef.current && topJobRef.current) {
        onTap(topJobRef.current);
      }
    };

    return (
      <div className={styles.deck}>
        {stackJobs.slice(1).reverse().map((job, reverseIndex) => {
          const layerIndex = stackJobs.length - 1 - reverseIndex;
          const layer = STACK_STYLE[layerIndex] ?? STACK_STYLE[2];
          return (
            <div
              key={job.id}
              className={styles.stackCard}
              style={{
                zIndex: 10 - layerIndex,
                transform: `translateY(${layer.y}px) scale(${layer.scale}) rotate(${layer.rotate}deg)`,
                opacity: layer.opacity,
              }}
            >
              <SwipeJobCard job={job} interactive={false} />
            </div>
          );
        })}

        {topJob && !exitState && (
          <motion.div
            key={topJob.id}
            className={styles.topCard}
            style={{ x, y, rotate, zIndex: 20 }}
            drag={!exitLockedRef.current}
            dragElastic={0}
            dragMomentum={false}
            dragPropagation={false}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          >
            <motion.div
              className={styles.passOverlay}
              style={{ opacity: passOpacity }}
              aria-hidden
            />
            <motion.div
              className={styles.applyOverlay}
              style={{ opacity: applyOpacity }}
              aria-hidden
            />
            <motion.div
              className={`${styles.stamp} ${styles.stampPass}`}
              style={{ opacity: passOpacity }}
            >
              <IconX size={28} />
              <span>SKIP</span>
            </motion.div>
            <motion.div
              className={`${styles.stamp} ${styles.stampApply}`}
              style={{ opacity: applyOpacity }}
            >
              <IconHeart size={28} />
              <span>APPLY</span>
            </motion.div>
            <motion.span
              className={`${styles.stamp} ${styles.stampSave}`}
              style={{ opacity: saveOpacity }}
            >
              SAVE
            </motion.span>
            <SwipeJobCard job={topJob} interactive dragX={x} dragY={y} />
          </motion.div>
        )}

        {exitState && (
          <motion.div
            key={`exit-${exitState.job.id}`}
            className={styles.topCard}
            style={{ zIndex: 30, pointerEvents: 'none' }}
            initial={{ x: exitState.startX, y: exitState.startY, rotate: exitState.startRotate }}
            animate={exitTarget(exitState.direction)}
            transition={SWIPE_EXIT}
            onAnimationComplete={finishExit}
          >
            <SwipeJobCard job={exitState.job} interactive={false} />
          </motion.div>
        )}
      </div>
    );
  },
);
