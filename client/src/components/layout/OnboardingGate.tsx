import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { hasCompletedOnboarding } from '@/lib/onboardingStorage';

interface OnboardingGateProps {
  children: React.ReactNode;
}

const BYPASS_PREFIXES = [
  '/admin',
  '/portal',
  '/landing',
  '/features',
  '/about',
  '/faq',
  '/privacy',
  '/terms',
  '/login',
  '/register',
  '/forgot-password',
];

function shouldBypassOnboarding(pathname: string): boolean {
  return BYPASS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  if (shouldBypassOnboarding(location.pathname)) {
    return children;
  }

  // Signed-in users never see the first-run welcome flow — profile state comes from the server.
  if (!isLoading && isAuthenticated) {
    if (location.pathname === '/welcome') {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  if (!hasCompletedOnboarding() && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />;
  }

  if (hasCompletedOnboarding() && location.pathname === '/welcome') {
    return <Navigate to="/swipe" replace />;
  }

  return children;
}
