'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true, authError: null });

export function useAuthContext() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session) {
          setSession(session);
        } else {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!mounted) return;
          if (error) {
            setAuthError(error.message);
          } else {
            setSession(data.session);
          }
        }
      } catch (err) {
        if (mounted) setAuthError('Failed to initialize authentication');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Keep session in sync across tabs / token refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, authError }}>
      {children}
    </AuthContext.Provider>
  );
}
