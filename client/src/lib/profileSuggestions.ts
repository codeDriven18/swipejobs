import type { UserProfile } from '@/models/userProfile';

export type ProfileSuggestionId =
  | 'photo'
  | 'headline'
  | 'skills'
  | 'experience'
  | 'resume';

export interface ProfileSuggestion {
  id: ProfileSuggestionId;
  label: string;
  actionLabel: string;
}

const SUGGESTION_DEFS: ProfileSuggestion[] = [
  { id: 'photo', label: 'Add profile photo', actionLabel: 'Upload photo' },
  { id: 'headline', label: 'Add headline', actionLabel: 'Add headline' },
  { id: 'skills', label: 'Add skills', actionLabel: 'Add skills' },
  { id: 'experience', label: 'Add experience', actionLabel: 'Add experience' },
  { id: 'resume', label: 'Upload resume', actionLabel: 'Upload CV' },
];

export function getProfileSuggestions(profile: UserProfile | null): ProfileSuggestion[] {
  if (!profile) return SUGGESTION_DEFS;

  const missing: ProfileSuggestionId[] = [];

  if (!profile.profileImageUrl?.trim()) missing.push('photo');
  if (!profile.headline?.trim()) missing.push('headline');
  if (!profile.skills.some((s) => s.name.trim())) missing.push('skills');
  if (!profile.experiences.some((e) => e.company.trim() || e.title.trim())) missing.push('experience');
  if (!profile.resumeFileName?.trim() && !profile.resumeUrl?.trim()) missing.push('resume');

  return SUGGESTION_DEFS.filter((s) => missing.includes(s.id));
}

export function calculateCompletionPercent(profile: UserProfile | null): number {
  if (!profile) return 0;
  const total = SUGGESTION_DEFS.length + 3;
  let done = 0;

  if (profile.profileImageUrl?.trim()) done++;
  if (profile.headline?.trim()) done++;
  if (profile.skills.some((s) => s.name.trim())) done++;
  if (profile.experiences.some((e) => e.company.trim() || e.title.trim())) done++;
  if (profile.resumeFileName?.trim() || profile.resumeUrl?.trim()) done++;
  if (profile.firstName.trim() && profile.lastName.trim()) done++;
  if (profile.location?.trim()) done++;
  if (profile.bio?.trim()) done++;

  return Math.round((done / total) * 100);
}

const DISMISSED_KEY = 'swipejobs-profile-suggestions-dismissed';

export function getDismissedSuggestions(): ProfileSuggestionId[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ProfileSuggestionId[]) : [];
  } catch {
    return [];
  }
}

export function dismissSuggestion(id: ProfileSuggestionId): void {
  const current = getDismissedSuggestions();
  if (!current.includes(id)) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...current, id]));
  }
}

export function clearDismissedSuggestions(): void {
  localStorage.removeItem(DISMISSED_KEY);
}
