'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '@/lib/api';
import type { ApiTeamMember } from '@/lib/api';
import { useAuthContext } from '@/components/auth-provider';

interface TeamContextValue {
  members: ApiTeamMember[];
  loading: boolean;
  addMember: (name: string, color: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextValue>({
  members: [],
  loading: false,
  addMember: async () => {},
  removeMember: async () => {},
});

export function useTeamContext() {
  return useContext(TeamContext);
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuthContext();
  const token = session?.access_token ?? '';
  const [members, setMembers] = useState<ApiTeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.getTeamMembers(token);
      setMembers(data);
    } catch {
      // silently ignore — board still works without team members
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async (name: string, color: string) => {
    const created = await api.createTeamMember(token, { name, color });
    setMembers((prev) => [...prev, created]);
  };

  const removeMember = async (id: string) => {
    await api.deleteTeamMember(token, id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <TeamContext.Provider value={{ members, loading, addMember, removeMember }}>
      {children}
    </TeamContext.Provider>
  );
}
