export interface Education {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
}

export interface Skill {
  id?: string;
  name: string;
  level?: string;
}

export interface Experience {
  id?: string;
  company: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
}

export type WorkArrangement = 'Any' | 'Remote' | 'Hybrid' | 'Onsite';
export type ProfileVisibilityLevel = 'Public' | 'EmployersOnly' | 'Private';

export interface UserProfile {
  id: string;
  userId?: string;
  externalUserId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  headline?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  location?: string;
  profileImageUrl?: string;
  linkedInUrl?: string;
  gitHubUrl?: string;
  websiteUrl?: string;
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
  preferredLocations?: string;
  workArrangement: WorkArrangement;
  emailNotifications: boolean;
  pushNotifications: boolean;
  jobAlerts: boolean;
  profileVisibility: ProfileVisibilityLevel;
  contactVisibility: ProfileVisibilityLevel;
  isProfileComplete: boolean;
  completionPercentage: number;
  educations: Education[];
  skills: Skill[];
  experiences: Experience[];
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateUserProfileRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  headline?: string;
  resumeUrl?: string;
  location?: string;
  linkedInUrl?: string;
  gitHubUrl?: string;
  websiteUrl?: string;
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
  preferredLocations?: string;
  workArrangement?: WorkArrangement;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  jobAlerts?: boolean;
  profileVisibility?: ProfileVisibilityLevel;
  contactVisibility?: ProfileVisibilityLevel;
  educations?: Education[];
  skills?: Skill[];
  experiences?: Experience[];
}

export interface ProfileCompleteness {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage?: number;
}

export interface CreateUserProfileRequest extends UpdateUserProfileRequest {
  externalUserId: string;
}

export function getProfileDisplayName(profile: Pick<UserProfile, 'firstName' | 'lastName'> | null | undefined): string {
  if (!profile) return '';
  return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
}

export function getProfileInitials(profile: Pick<UserProfile, 'firstName' | 'lastName' | 'email'> | null | undefined): string {
  if (!profile) return '?';
  const first = profile.firstName?.trim()?.[0] ?? '';
  const last = profile.lastName?.trim()?.[0] ?? '';
  const initials = `${first}${last}`.toUpperCase();
  if (initials) return initials;
  return profile.email?.[0]?.toUpperCase() ?? '?';
}
