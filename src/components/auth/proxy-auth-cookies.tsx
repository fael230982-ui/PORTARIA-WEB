'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function ProxyAuthCookies() {
  const { token, user } = useAuth();
  const cookieSecure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (token) {
      document.cookie = `camera_proxy_token=${encodeURIComponent(token)}; Path=/api/proxy; SameSite=Lax${cookieSecure}`;
    } else {
      document.cookie = `camera_proxy_token=; Path=/api/proxy; Max-Age=0; SameSite=Lax${cookieSecure}`;
    }

    if (user?.role === 'MORADOR' && user.selectedUnitId) {
      document.cookie = `camera_selected_unit_id=${encodeURIComponent(user.selectedUnitId)}; Path=/api/proxy; SameSite=Lax${cookieSecure}`;
    } else {
      document.cookie = `camera_selected_unit_id=; Path=/api/proxy; Max-Age=0; SameSite=Lax${cookieSecure}`;
    }
  }, [cookieSecure, token, user?.role, user?.selectedUnitId]);

  return null;
}
