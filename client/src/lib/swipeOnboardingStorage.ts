export const SWIPE_ONBOARDING_COMPLETE_KEY = 'swipejobs-swipe-onboarding-complete';

export function hasCompletedSwipeOnboarding(): boolean {
  try {
    return localStorage.getItem(SWIPE_ONBOARDING_COMPLETE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markSwipeOnboardingComplete(): void {
  try {
    localStorage.setItem(SWIPE_ONBOARDING_COMPLETE_KEY, '1');
  } catch {
    /* ignore */
  }
}
