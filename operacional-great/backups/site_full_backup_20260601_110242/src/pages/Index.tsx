import { Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import { safeGetItem } from '@/lib/safeStorage';

const Index = () => {
  const hasStoredUser = useMemo(() => {
    const stored = safeGetItem('great_user');
    if (!stored) return false;

    try {
      const parsed = JSON.parse(stored) as { email?: string; name?: string } | null;
      return Boolean(parsed?.email && parsed?.name);
    } catch {
      return false;
    }
  }, []);

  return (
    <Navigate
      to={hasStoredUser ? '/operacional/dashboard' : '/login'}
      replace
    />
  );
};

export default Index;
