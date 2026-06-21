export interface Company {
  id: string;
  name: string;
  slug: string;
  description: string;
  industry: string;
  location: string;
  companySize: string;
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  linkedInUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  culture?: string;
  benefits?: string;
  hiringPhilosophy?: string;
  status: import('./operations').CompanyStatus;
  isActive: boolean;
  openJobsCount: number;
  createdAt: string;
  updatedAt?: string;
}
