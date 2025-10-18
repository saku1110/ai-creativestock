import { useState, useEffect } from 'react';
import { database } from '../lib/supabase';
import { useUser } from './useUser';

interface AdminStatus {
  isAdmin: boolean;
  role?: string;
  permissions?: string[];
  loading: boolean;
  error?: Error | null;
}

export const useAdmin = (): AdminStatus => {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdmin: false,
    loading: true,
    error: null
  });
  
  const { user } = useUser();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        setAdminStatus({
          isAdmin: false,
          loading: false,
          error: null
        });
        return;
      }

      const allowedAdminEmails = ['rebirth.sakuraya@gmail.com'];
      const normalizedEmail = user.email?.toLowerCase() ?? '';

      // 開発環境では特定メールアドレスのみを管理者扱い
      if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        const isAllowed = allowedAdminEmails.includes(normalizedEmail);

        setAdminStatus({
          isAdmin: isAllowed,
          role: isAllowed ? 'admin' : undefined,
          permissions: isAllowed ? ['staging-review'] : undefined,
          loading: false,
          error: null
        });
        return;
      }

      if (!allowedAdminEmails.includes(normalizedEmail)) {
        setAdminStatus({
          isAdmin: false,
          loading: false,
          error: null
        });
        return;
      }

      try {
        const { isAdmin, role, permissions, error } = await database.checkAdminStatus(user.id);
        
        if (error) {
          setAdminStatus({
            isAdmin: false,
            loading: false,
            error: new Error(error.message)
          });
          return;
        }

        setAdminStatus({
          isAdmin,
          role,
          permissions,
          loading: false,
          error: null
        });
      } catch (error) {
        setAdminStatus({
          isAdmin: false,
          loading: false,
          error: error as Error
        });
      }
    };

    checkAdminStatus();
  }, [user?.id, user?.email]);

  return adminStatus;
};
