import type { Job } from '@/models/job';

export type MatchTier = 'featured' | 'strong' | 'good' | null;

export function getMatchTier(job: Job): MatchTier {
  if ((job.trendingBadges?.length ?? 0) > 0) return 'featured';
  if (job.tags.length >= 3) return 'strong';
  if (job.tags.length >= 1) return 'good';
  return null;
}

export function getMatchLabel(job: Job): string | null {
  const tier = getMatchTier(job);
  if (tier === 'featured') return 'Featured';
  if (tier === 'strong') return 'Strong match';
  if (tier === 'good') return 'Good match';
  return null;
}

export function getMatchScore(job: Job): number {
  const tier = getMatchTier(job);
  if (tier === 'featured') return 95;
  if (tier === 'strong') return 82;
  if (tier === 'good') return 71;
  if (job.isRemote) return 68;
  return 64;
}
