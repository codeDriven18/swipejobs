import { JobCategory } from '@/models/enums';

export function formatSalary(
  min?: number,
  max?: number,
  category?: JobCategory,
  externalUrl?: string,
) {
  if (!min && !max) return 'Salary not listed';
  const currency = externalUrl?.startsWith('swipejobs:showcase:') ? '$' : '€';
  const suffix = category === JobCategory.Gig ? '/hr' : '/mo';
  if (min && max) return `${currency}${min.toLocaleString()}–${max.toLocaleString()}${suffix}`;
  if (min) return `From ${currency}${min.toLocaleString()}${suffix}`;
  return `Up to ${currency}${max!.toLocaleString()}${suffix}`;
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}
