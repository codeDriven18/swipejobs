import type { Job } from '@/models/job';
import type { MotionValue } from 'framer-motion';
import { SwipeCard } from '@/components/jobs/SwipeCard';

interface SwipeJobCardProps {
  job: Job;
  interactive?: boolean;
  dragX?: MotionValue<number>;
  dragY?: MotionValue<number>;
}

export function SwipeJobCard({ job, interactive = true, dragX, dragY }: SwipeJobCardProps) {
  void interactive;
  return <SwipeCard job={job} dragX={dragX} dragY={dragY} />;
}
