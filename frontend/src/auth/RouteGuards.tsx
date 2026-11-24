import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PageLoader } from '@/components/ui/PageLoader';
import { type AppRole } from './authService';
import { useAuth } from './AuthContext';

function VerificationError() {
  const { error, refreshProfile, signOut } = useAuth();
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
    <h1 className="font-display text-2xl font-bold text-brand-navy">We couldn’t verify your access</h1>
    <p className="text-sm text-brand-navy/65">{error || 'The authentication service is unavailable. Protected content stays hidden until your session can be verified.'}</p>
    <div className="flex gap-3">
      <button type="button" onClick={() => void refreshProfile()} className="rounded-full bg-brand-lime px-5 py-3 text-sm font-bold text-brand-navy">Try again</button>
      <button type="button" onClick={() => void signOut()} className="rounded-full border border-brand-border px-5 py-3 text-sm font-bold text-brand-navy">Log out</button>
    </div>
  </main>;
}

function UnauthorizedPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-100 flex items-center justify-center text-amber-600 mb-2">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="font-display text-2xl font-bold text-brand-navy">Access Denied</h1>
      <p className="text-sm text-brand-navy/65">Your account does not have permission to access this administration section.</p>
      <div className="flex gap-3 mt-2">
        <button type="button" onClick={() => navigate('/', { replace: true })} className="rounded-full bg-brand-lime px-5 py-2.5 text-sm font-bold text-brand-navy">Return to Store</button>
        <button type="button" onClick={() => void signOut().finally(() => navigate('/login', { replace: true }))} className="rounded-full border border-brand-border px-5 py-2.5 text-sm font-bold text-brand-navy">Log out</button>
      </div>
    </main>
  );
}

export function ProtectedRoute({ roles, children }: { roles: AppRole[]; children?: ReactNode }) {
  const { accessToken, profile, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center"><PageLoader /></div>;
  if (!accessToken) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (status === 'error') return <VerificationError />;
  if (!profile) return <VerificationError />;
  if (profile.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  if (!roles.includes(profile.role)) return <UnauthorizedPage />;
  return children ?? <Outlet />;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { accessToken, profile, status } = useAuth();
  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center"><PageLoader /></div>;
  if (accessToken && status === 'error') return <VerificationError />;
  if (accessToken && profile) return <Navigate to="/" replace />;
  return children;
}
