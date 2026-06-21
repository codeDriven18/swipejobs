import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/models/auth';
import { PortalLoadingShell } from '@/portal/shell/PortalLoadingShell';

interface PortalGateProps {
  children: React.ReactNode;
}

export function PortalGate({ children }: PortalGateProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PortalLoadingShell />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.role !== UserRole.Company && user?.role !== UserRole.Admin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
