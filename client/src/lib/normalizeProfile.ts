import type { UserProfile, WorkArrangement, ProfileVisibilityLevel } from '@/models/userProfile';

/** Ensures API responses always include new profile fields with safe defaults. */
export function normalizeUserProfile(raw: UserProfile): UserProfile {
  return {
    ...raw,
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
