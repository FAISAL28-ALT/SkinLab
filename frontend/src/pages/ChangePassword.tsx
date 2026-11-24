import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { authService } from '@/auth/authService';

export function ChangePassword() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  if (!profile) return <Navigate to="/login" replace />;
  if (!profile.mustChangePassword) return <Navigate to="/" replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) { setMessage('Passwords do not match.'); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}/.test(password)) {
      setMessage('Use at least 8 characters with uppercase, lowercase, number, and special character.'); return;
    }
    setLoading(true); setMessage('');
    try { await authService.changePassword(password); await refreshProfile(); navigate('/', { replace: true }); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update your password.'); }
    finally { setLoading(false); }
  };
  return <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
    <form className="w-full space-y-4 rounded-2xl border border-brand-border bg-white p-7 shadow-sm" onSubmit={submit}>
      <div><h1 className="font-display text-2xl font-extrabold text-brand-navy">Set a new password</h1><p className="mt-2 text-sm text-brand-navy/65">For security, change the initial administrator password before continuing.</p></div>
      <input className="w-full rounded-xl border border-brand-border px-4 py-3" type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <input className="w-full rounded-xl border border-brand-border px-4 py-3" type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
      {message && <p className="text-sm text-red-600" role="status">{message}</p>}
      <button className="w-full rounded-full bg-brand-lime px-5 py-3 text-sm font-bold text-brand-navy disabled:opacity-60" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
    </form>
  </main>;
}
