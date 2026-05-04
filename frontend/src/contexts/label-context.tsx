'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '@/lib/api';
import type { ApiLabel } from '@/lib/api';
import { useAuthContext } from '@/components/auth-provider';

interface LabelContextValue {
  labels: ApiLabel[];
  loading: boolean;
  addLabel: (name: string, color: string) => Promise<void>;
  removeLabel: (id: string) => Promise<void>;
}

const LabelContext = createContext<LabelContextValue>({
  labels: [],
  loading: false,
  addLabel: async () => {},
  removeLabel: async () => {},
});

export function useLabelContext() {
  return useContext(LabelContext);
}

export function LabelProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuthContext();
  const token = session?.access_token ?? '';
  const [labels, setLabels] = useState<ApiLabel[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLabels = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.getLabels(token);
      setLabels(data);
    } catch {
      // silently ignore — board still works without labels
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const addLabel = async (name: string, color: string) => {
    const created = await api.createLabel(token, { name, color });
    setLabels((prev) => [...prev, created]);
  };

  const removeLabel = async (id: string) => {
    await api.deleteLabel(token, id);
    setLabels((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <LabelContext.Provider value={{ labels, loading, addLabel, removeLabel }}>
      {children}
    </LabelContext.Provider>
  );
}
