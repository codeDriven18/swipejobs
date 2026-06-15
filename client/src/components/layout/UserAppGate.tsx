import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getHomeRouteForRole } from '@/lib/authRoutes';
import { getRefreshToken } from '@/lib/authStorage';
import { UserRole } from '@/models/auth';

interface UserAppGateProps {
  children: ReactNode;
}

/** Keeps admin and company accounts out of the job seeker app shell. */
export function UserAppGate({ children }: UserAppGateProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const hasSession = Boolean(getRefreshToken());

  if (isLoading && !hasSession) {
    return (
      <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading...
      </p>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.role === UserRole.Admin || user?.role === UserRole.Company) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />;
  }

  return children;
}

export function useAuthBootstrapReady() {
  const { isLoading } = useAuth();
  const [ready, setReady] = useState(!isLoading);
  const wasLoading = useRef(isLoading);

  useEffect(() => {
    if (wasLoading.current && !isLoading) {
      setReady(true);
    }
    wasLoading.current = isLoading;
  }, [isLoading]);

  return ready;
}
