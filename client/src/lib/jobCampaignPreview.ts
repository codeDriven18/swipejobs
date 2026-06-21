import { formatSalary } from '@/lib/jobFormat';
import { resolveCampaignCoverUrl } from '@/lib/jobCampaignCover';
import type { Company } from '@/models/company';
import type { Job } from '@/models/job';
import { JobCategory, JobLevel } from '@/models/enums';

export interface JobCampaignFormState {
  title: string;
  description: string;
  location: string;
  city: string;
  category: JobCategory;
  level: JobLevel;
  isRemote: boolean;
  salaryMin: string;
  salaryMax: string;
  coverImageUrl: string;
  isActive: boolean;
}

export function buildCampaignPreviewJob(
  form: JobCampaignFormState,
  company: Company | null,
): Job {
  const salaryMin = form.salaryMin ? Number(form.salaryMin) : undefined;
  const salaryMax = form.salaryMax ? Number(form.salaryMax) : undefined;
  const title = form.title.trim() || 'Your role title';
  const description = form.description.trim() || 'Your role description will appear here for candidates browsing SwipeJobs.';
  const coverUrl = form.coverImageUrl.trim() || resolveCampaignCoverUrl(form.category, title);
  const locationLabel = [form.city.trim(), form.location.trim()].filter(Boolean).join(', ')
    || (form.isRemote ? 'Remote' : 'Location flexible');

  return {
    id: 'campaign-preview',
    title,
    description,
    companyId: company?.id ?? 'preview-company',
    company: company?.name ?? 'Your company',
    companyLogoUrl: company?.logoUrl,
    companySlug: company?.slug,
    companyIndustry: company?.industry,
    location: form.location.trim() || undefined,
    city: form.city.trim() || undefined,
    category: form.category,
    level: form.level,
    isRemote: form.isRemote,
    isActive: form.isActive,
    salaryMin,
    salaryMax,
    jobImageUrl: coverUrl,
    sourceId: 'portal',
    sourceName: company?.name,
    tags: [],
    displayTitle: title,
    displayCompany: company?.name ?? 'Your company',
    displaySalary: formatSalary(salaryMin, salaryMax, form.category),
    displayLocation: locationLabel,
    displaySummary: description.length > 120 ? `${description.slice(0, 117).trim()}…` : description,
    createdAt: new Date().toISOString(),
  };
}

export function getCampaignReadiness(form: JobCampaignFormState): {
  score: number;
  items: { label: string; done: boolean }[];
} {
  const items = [
    { label: 'Role title', done: form.title.trim().length >= 3 },
    { label: 'Role description', done: form.description.trim().length >= 40 },
    { label: 'Location or remote', done: form.isRemote || Boolean(form.city.trim() || form.location.trim()) },
    { label: 'Salary range', done: Boolean(form.salaryMin || form.salaryMax) },
    { label: 'Custom cover image', done: Boolean(form.coverImageUrl.trim()) },
  ];
  const score = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { score, items };
}
