import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService, setAccessToken, setAuthFailureHandler, type UserProfile } from './authService';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'error';
interface AuthContextValue {
  accessToken: string | null;
  profile: UserProfile | null;
  status: AuthStatus;
  error: string | null;
  signIn(userId: string, password: string): Promise<UserProfile>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<UserProfile | null>;
  updateProfile(data: { username?: string; fullName?: string; email?: string }): Promise<UserProfile>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const invalidate = useCallback(() => {
    setAccessToken(null); setToken(null); setProfile(null); setStatus('unauthenticated'); setError(null);
  }, []);
  useEffect(() => { setAuthFailureHandler(invalidate); return () => setAuthFailureHandler(null); }, [invalidate]);
  useEffect(() => {
    const update = (event: Event) => setToken((event as CustomEvent<string | null>).detail);
    window.addEventListener('skinlab:access-token', update);
    return () => window.removeEventListener('skinlab:access-token', update);
  }, []);

  useEffect(() => {
    let active = true;
    void authService.restore().then((restored) => {
      if (!active) return;
      if (!restored) { setAccessToken(null); setToken(null); setProfile(null); setStatus('unauthenticated'); return; }
      setAccessToken(restored.accessToken); setToken(restored.accessToken); setProfile(restored.profile); setStatus('authenticated');
    }).catch(() => {
      if (active) {
        setAccessToken(null);
        setToken(null);
        setProfile(null);
        setStatus('unauthenticated');
      }
    });
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async (userId: string, password: string) => {
    // Do NOT set status to 'loading' here — that would unmount the Login page
    // (via GuestRoute's loading guard) and discard its local error/loading state.
    // The Login component manages its own loading spinner independently.
    setError(null);
    try {
      const result = await authService.signIn(userId, password);
      setAccessToken(result.accessToken); setToken(result.accessToken); setProfile(result.profile); setStatus('authenticated');
      return result.profile;
    } catch (cause) {
      // Keep status as 'unauthenticated' so the Login page stays mounted and
      // can display the error returned by the thrown cause.
      setAccessToken(null); setToken(null); setProfile(null); setStatus('unauthenticated');
      setError(cause instanceof Error ? cause.message : 'Unable to log in.'); throw cause;
    }
  }, []);

  const signOut = useCallback(async () => {
    try { await authService.signOut(); } finally { invalidate(); }
  }, [invalidate]);

  const refreshProfile = useCallback(async () => {
    try {
      const next = await authService.getProfile(); setProfile(next); setStatus('authenticated'); return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify your account.'); setStatus('error'); return null;
    }
  }, []);

  const updateProfile = useCallback(async (data: { username?: string; fullName?: string; email?: string }) => {
    const updated = await authService.updateProfile(data);
    setProfile(updated);
    return updated;
  }, []);

  const value = useMemo(() => ({ accessToken, profile, status, error, signIn, signOut, refreshProfile, updateProfile }), [accessToken, profile, status, error, signIn, signOut, refreshProfile, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
