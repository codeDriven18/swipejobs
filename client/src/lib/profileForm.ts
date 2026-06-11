import type {
  Education,
  Experience,
  Skill,
  UpdateUserProfileRequest,
  UserProfile,
  WorkArrangement,
  ProfileVisibilityLevel,
} from '@/models/userProfile';

export interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  headline: string;
  location: string;
  resumeName: string;
  linkedInUrl: string;
  gitHubUrl: string;
  websiteUrl: string;
  desiredSalaryMin: string;
  desiredSalaryMax: string;
  preferredLocations: string;
  workArrangement: WorkArrangement;
  emailNotifications: boolean;
  pushNotifications: boolean;
  jobAlerts: boolean;
  profileVisibility: ProfileVisibilityLevel;
  contactVisibility: ProfileVisibilityLevel;
  educations: Education[];
  skills: Skill[];
  experiences: Experience[];
}

export const emptyEducation = (): Education => ({
  institution: '', degree: '', fieldOfStudy: '', isCurrent: false,
});

export const emptySkill = (): Skill => ({ name: '', level: '' });

export const emptyExperience = (): Experience => ({
  company: '', title: '', description: '', isCurrent: false,
});

export function profileToFormState(profile: UserProfile): ProfileFormState {
  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    bio: profile.bio ?? '',
    headline: profile.headline ?? '',
    location: profile.location ?? '',
    resumeName: profile.resumeFileName ?? profile.resumeUrl?.replace('local://', '') ?? '',
    linkedInUrl: profile.linkedInUrl ?? '',
    gitHubUrl: profile.gitHubUrl ?? '',
    websiteUrl: profile.websiteUrl ?? '',
    desiredSalaryMin: profile.desiredSalaryMin?.toString() ?? '',
    desiredSalaryMax: profile.desiredSalaryMax?.toString() ?? '',
    preferredLocations: profile.preferredLocations ?? '',
    workArrangement: profile.workArrangement ?? 'Any',
    emailNotifications: profile.emailNotifications ?? true,
    pushNotifications: profile.pushNotifications ?? true,
    jobAlerts: profile.jobAlerts ?? true,
    profileVisibility: profile.profileVisibility ?? 'EmployersOnly',
    contactVisibility: profile.contactVisibility ?? 'EmployersOnly',
    educations: profile.educations.length ? profile.educations : [emptyEducation()],
    skills: profile.skills.length ? profile.skills : [emptySkill()],
    experiences: profile.experiences.length ? profile.experiences : [emptyExperience()],
  };
}

export function formStateToPayload(form: ProfileFormState): UpdateUserProfileRequest {
  const parseSalary = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : undefined;
  };

  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || undefined,
    bio: form.bio.trim() || undefined,
    headline: form.headline.trim() || undefined,
    location: form.location.trim() || undefined,
    resumeUrl: undefined,
    linkedInUrl: form.linkedInUrl.trim() || undefined,
    gitHubUrl: form.gitHubUrl.trim() || undefined,
    websiteUrl: form.websiteUrl.trim() || undefined,
    desiredSalaryMin: parseSalary(form.desiredSalaryMin),
    desiredSalaryMax: parseSalary(form.desiredSalaryMax),
    preferredLocations: form.preferredLocations.trim() || undefined,
    workArrangement: form.workArrangement,
    emailNotifications: form.emailNotifications,
    pushNotifications: form.pushNotifications,
    jobAlerts: form.jobAlerts,
    profileVisibility: form.profileVisibility,
    contactVisibility: form.contactVisibility,
    educations: form.educations.filter((e) => e.institution.trim() || e.degree.trim()),
    skills: form.skills.filter((s) => s.name.trim()),
    experiences: form.experiences.filter((e) => e.company.trim() || e.title.trim()),
  };
}
