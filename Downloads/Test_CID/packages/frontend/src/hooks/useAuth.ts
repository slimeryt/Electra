import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { user, isLoading, isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    if (isLoading) checkAuth();
  }, []);

  return { user, isLoading, isAuthenticated };
}
