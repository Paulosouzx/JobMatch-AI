import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

export type AccessState = 'checking' | 'granted' | 'denied' | 'error';

interface AuthState {
  session: Session | null;
  loading: boolean;
  access: AccessState;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<AccessState>('checking');
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setAccess('checking');
      return;
    }
    let active = true;
    setAccess('checking');
    supabase.rpc('jm_ensure_profile').then(({ error }) => {
      if (!active) return;
      if (!error) setAccess('granted');
      else setAccess(/signups are disabled/i.test(error.message) ? 'denied' : 'error');
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      access,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, access],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
