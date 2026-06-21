import { JobCategory } from '@/models/enums';

/** Mirrors backend JobBrandingDefaults for campaign cover previews. */
export function resolveCampaignCoverUrl(category: JobCategory, title: string): string {
  if (category === JobCategory.Gig) return '/job-images/default.svg';

  const t = title.toLowerCase();
  if (t.includes('design') || t.includes('ux') || t.includes('ui')) return '/job-images/design.svg';
  if (t.includes('market') || t.includes('growth') || t.includes('content')) return '/job-images/marketing.svg';
  if (t.includes('product') || t.includes('pm ')) return '/job-images/product.svg';
  if (t.includes('data') || t.includes('analyst') || t.includes('ml') || t.includes('machine learning')) {
    return '/job-images/data.svg';
  }
  return '/job-images/engineering.svg';
}
