import type { ProfileFormState } from '@/lib/profileForm';

export interface ProfileProgress {
  percentage: number;
  completedSteps: number;
  totalSteps: number;
  missing: string[];
}

const STEPS = ['Identity', 'Professional', 'Preferences'] as const;

function filledEducation(e: ProfileFormState['educations'][number]) {
  return Boolean(e.institution.trim() || e.degree.trim());
}

function filledSkill(s: ProfileFormState['skills'][number]) {
  return Boolean(s.name.trim());
}

function filledExperience(e: ProfileFormState['experiences'][number]) {
  return Boolean(e.company.trim() || e.title.trim());
}

export function calculateProfileProgress(state: ProfileFormState): ProfileProgress {
  const checks: { label: string; done: boolean; weight: number }[] = [
    { label: 'First name', done: Boolean(state.firstName.trim()), weight: 8 },
    { label: 'Last name', done: Boolean(state.lastName.trim()), weight: 8 },
    { label: 'Email', done: Boolean(state.email.trim()), weight: 10 },
    { label: 'Phone', done: Boolean(state.phone.trim()), weight: 10 },
    { label: 'Headline', done: Boolean(state.headline.trim()), weight: 8 },
    { label: 'Location', done: Boolean(state.location.trim()), weight: 5 },
    { label: 'Bio', done: Boolean(state.bio.trim()), weight: 5 },
    { label: 'Resume', done: Boolean(state.resumeName.trim()), weight: 10 },
    {
      label: 'Education, skill, or experience',
      done: state.educations.some(filledEducation)
        || state.skills.some(filledSkill)
        || state.experiences.some(filledExperience),
      weight: 36,
    },
  ];

  const earned = checks.filter((c) => c.done).reduce((sum, c) => sum + c.weight, 0);
  const missing = checks.filter((c) => !c.done).map((c) => c.label);

  let completedSteps = 0;
  const identityDone = state.firstName.trim() && state.lastName.trim() && state.email.trim();
  const professionalDone = state.educations.some(filledEducation)
    || state.skills.some(filledSkill)
    || state.experiences.some(filledExperience);
  const preferencesDone = Boolean(state.preferredLocations.trim() || state.desiredSalaryMin.trim());
  if (identityDone) completedSteps++;
  if (professionalDone) completedSteps++;
  if (preferencesDone) completedSteps++;

  return {
    percentage: earned,
    completedSteps,
    totalSteps: STEPS.length,
    missing,
  };
}

export { STEPS as PROFILE_STEPS };
