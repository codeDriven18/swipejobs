import type { UserProfile, WorkArrangement, ProfileVisibilityLevel } from '@/models/userProfile';

/** Ensures API responses always include new profile fields with safe defaults. */
export function normalizeUserProfile(raw: UserProfile): UserProfile {
  const completionPercentage =
    typeof raw.completionPercentage === 'number' && !Number.isNaN(raw.completionPercentage)
      ? Math.max(0, Math.min(100, raw.completionPercentage))
      : raw.isProfileComplete
        ? 100
        : 0;

  return {
    ...raw,
    completionPercentage,
    isProfileComplete: raw.isProfileComplete,
    workArrangement: (raw.workArrangement ?? 'Any') as WorkArrangement,
    emailNotifications: raw.emailNotifications ?? true,
    pushNotifications: raw.pushNotifications ?? true,
    jobAlerts: raw.jobAlerts ?? true,
    profileVisibility: (raw.profileVisibility ?? 'EmployersOnly') as ProfileVisibilityLevel,
    contactVisibility: (raw.contactVisibility ?? 'EmployersOnly') as ProfileVisibilityLevel,
    educations: raw.educations ?? [],
    skills: raw.skills ?? [],
    experiences: raw.experiences ?? [],
  };
}
