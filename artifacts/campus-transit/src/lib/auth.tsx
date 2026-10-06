import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

type Profile = { id: string; full_name: string | null; email: string | null; phone: string | null; role: 'admin' | 'driver' | 'student' };
type AuthValue = { user: User | null; profile: Profile | null; loading: boolean; configError: boolean; refreshProfile: () => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshProfile = async () => {
    const { data: { user: current } } = await supabase.auth.getUser();
    setUser(current);
    if (!current) { setProfile(null); return; }
    const { data, error } = await supabase.from('profiles').select('id,full_name,email,phone,role').eq('id', current.id).maybeSingle();
    if (error) throw error;
    setProfile(data as Profile | null);
  };
  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUser(data.user);
      if (data.user) {
        const { data: p } = await supabase.from('profiles').select('id,full_name,email,phone,role').eq('id', data.user.id).maybeSingle();
        if (active) setProfile(p as Profile | null);
      }
      if (active) setLoading(false);
    }).catch(() => active && setLoading(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) { setProfile(null); setLoading(false); }
      else window.setTimeout(() => { refreshProfile().catch(() => setProfile(null)).finally(() => setLoading(false)); }, 0);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const value = useMemo(() => ({ user, profile, loading, configError: !isSupabaseConfigured, refreshProfile }), [user, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
