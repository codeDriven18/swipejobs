import type { UserProfile } from '@/models/userProfile';

/** Minimum completion % before mandatory prompts and onboarding redirects are suppressed. */
export const PROFILE_COMPLETION_THRESHOLD = 80;

/**
 * Profile completion from persisted backend data (profiles/me or dashboard).
 * Never use local-only calculators for gating or banners.
 */
export function getProfileCompletionPercent(profile: UserProfile | null | undefined): number {
  if (!profile) return 0;
  if (typeof profile.completionPercentage === 'number' && !Number.isNaN(profile.completionPercentage)) {
    return Math.max(0, Math.min(100, profile.completionPercentage));
  }
  if (profile.isProfileComplete) return 100;
  return 0;
}

export function isProfileSubstantiallyComplete(profile: UserProfile | null | undefined): boolean {
  return getProfileCompletionPercent(profile) >= PROFILE_COMPLETION_THRESHOLD;
}

/** Mandatory completion banners and hub prompts — voluntary wizard links are still allowed. */
export function shouldShowMandatoryCompletionPrompts(profile: UserProfile | null | undefined): boolean {
  return !isProfileSubstantiallyComplete(profile);
}
