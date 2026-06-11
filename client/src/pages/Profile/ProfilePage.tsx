import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/models/auth';
import { EmployerProfilePage } from './EmployerProfilePage';
import { JobSeekerProfilePage } from './JobSeekerProfilePage';

export function ProfilePage() {
  const { user } = useAuth();
  if (user?.role === UserRole.Company) {
    return <EmployerProfilePage />;
  }
  return <JobSeekerProfilePage />;
}
