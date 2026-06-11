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
  status: import('./operations').CompanyStatus;
  isActive: boolean;
  openJobsCount: number;
  createdAt: string;
  updatedAt?: string;
}
