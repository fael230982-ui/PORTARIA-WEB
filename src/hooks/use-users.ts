'use client';

import { useQuery } from '@tanstack/react-query';
import { getUsers } from '@/services/users.service';
import type { UserResponse } from '@/types/user';

export function useUsers(enabled = true) {
  return useQuery<UserResponse[]>({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled,
    staleTime: 60 * 1000,
  });
}
