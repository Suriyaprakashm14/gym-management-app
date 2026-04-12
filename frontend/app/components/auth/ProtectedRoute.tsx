'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  /** When role is not allowed, redirect here instead of /not-found */
  redirectPath?: string;
}

// Auth state is now resolved synchronously before paint (useIsomorphicLayoutEffect
// in AuthContext), so `loading` is false by the time this component renders.
// We no longer need a loading spinner here.
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, redirectPath = '/not-found' }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (allowedRoles?.length) {
      const hasRole = !!user?.role && allowedRoles.includes(user.role);
      if (!hasRole) router.replace(redirectPath);
    }
  }, [isAuthenticated, loading, router, allowedRoles, user?.role, redirectPath]);

  // While the layout effect hasn't run yet (SSR → hydration gap), render nothing
  // rather than a full-page spinner. The transition is imperceptible before paint.
  if (loading || !isAuthenticated) return null;

  if (allowedRoles?.length && (!user?.role || !allowedRoles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

