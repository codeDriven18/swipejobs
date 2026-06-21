import type { Education, Experience } from '@/models/userProfile';
import type { PortalApplicantDetail } from '@/models/portalApplicant';

export function formatProfileDate(iso?: string): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function formatExperienceRange(exp: Experience): string {
  const start = formatProfileDate(exp.startDate);
  const end = exp.isCurrent ? 'Present' : formatProfileDate(exp.endDate);
  if (start && end) return `${start} – ${end}`;
  if (start) return `${start} – Present`;
  if (end) return end;
  return 'Dates not listed';
}

export function formatEducationRange(edu: Education): string {
  const start = formatProfileDate(edu.startDate);
  const end = edu.isCurrent ? 'Present' : formatProfileDate(edu.endDate);
  if (start && end) return `${start} – ${end}`;
  if (start) return `${start} – Present`;
  if (end) return end;
  return '';
}

export function estimateYearsExperience(experiences: Experience[]): number | null {
  const withDates = experiences.filter((e) => e.startDate);
  if (withDates.length === 0) return experiences.length > 0 ? null : 0;

  let totalMonths = 0;
  for (const exp of withDates) {
    const start = new Date(exp.startDate!);
    const end = exp.isCurrent || !exp.endDate ? new Date() : new Date(exp.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    totalMonths += Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  }
  if (totalMonths <= 0) return null;
  return Math.max(1, Math.round(totalMonths / 12));
}

export function getApplicantProofLinks(applicant: Pick<
  PortalApplicantDetail,
  'linkedInUrl' | 'gitHubUrl' | 'websiteUrl'
>): { id: string; label: string; url: string }[] {
  const links: { id: string; label: string; url: string }[] = [];
  if (applicant.linkedInUrl?.trim()) {
    links.push({ id: 'linkedin', label: 'LinkedIn', url: applicant.linkedInUrl.trim() });
  }
  if (applicant.gitHubUrl?.trim()) {
    links.push({ id: 'github', label: 'GitHub', url: applicant.gitHubUrl.trim() });
  }
  if (applicant.websiteUrl?.trim()) {
    links.push({ id: 'portfolio', label: 'Portfolio', url: applicant.websiteUrl.trim() });
  }
  return links;
}

export function getApplicantCompleteness(applicant: PortalApplicantDetail): {
  score: number;
  items: { label: string; done: boolean }[];
} {
  const items = [
    { label: 'Professional headline', done: Boolean(applicant.headline?.trim()) },
    { label: 'About summary', done: Boolean(applicant.bio?.trim()) },
    { label: 'Work experience', done: applicant.experiences.length > 0 },
    { label: 'Skills listed', done: applicant.skills.length >= 3 },
    { label: 'Education', done: applicant.educations.length > 0 },
    { label: 'Resume uploaded', done: applicant.hasResume },
    { label: 'Professional link', done: getApplicantProofLinks(applicant).length > 0 },
  ];
  const done = items.filter((i) => i.done).length;
  return { score: Math.round((done / items.length) * 100), items };
}

export function formatResumeSize(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
