import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Layers3, LockKeyhole, Mail, Tag, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AuthServiceError } from '@/auth/authService';
import './login.css';

// ─── Lockout helpers ──────────────────────────────────────────────────────────

/** sessionStorage key; stores the lockout expiry as a Unix-ms timestamp string. */
const LOCKOUT_KEY = 'skinlab_lockout_until';

/** Format a positive number of whole seconds as MM:SS or HH:MM:SS. */
function formatCountdown(totalSeconds: number): string {
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Read the remaining lockout seconds from sessionStorage (0 if none / expired). */
function readStoredLockout(): number {
  try {
    const raw = sessionStorage.getItem(LOCKOUT_KEY);
    if (!raw) return 0;
    const expiresAt = parseInt(raw, 10);
    if (!Number.isFinite(expiresAt)) return 0;
    const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

/** Persist a lockout that expires `seconds` from now into sessionStorage. */
function storeLockout(seconds: number): void {
  try {
    const expiresAt = Date.now() + seconds * 1000;
    sessionStorage.setItem(LOCKOUT_KEY, String(expiresAt));
  } catch { /* sessionStorage unavailable – graceful degradation */ }
}

/** Remove any stored lockout record. */
function clearStoredLockout(): void {
  try { sessionStorage.removeItem(LOCKOUT_KEY); } catch { /* ignore */ }
}

// ─── useLockout hook ──────────────────────────────────────────────────────────

/**
 * Manages the client-side 429 rate-limit lockout countdown.
 *
 * Returns:
 *   - `locked`      – true while countdown > 0
 *   - `countdown`   – remaining seconds (0 when unlocked)
 *   - `startLockout(seconds)` – begin a lockout for the given duration
 */
function useLockout() {
  const [countdown, setCountdown] = useState<number>(() => readStoredLockout());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    stopInterval();
    intervalRef.current = setInterval(() => {
      const remaining = readStoredLockout();
      if (remaining <= 0) {
        setCountdown(0);
        clearStoredLockout();
        stopInterval();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, [stopInterval]);

  // On mount: if there is an active stored lockout, resume the countdown.
  useEffect(() => {
    const remaining = readStoredLockout();
    if (remaining > 0) {
      setCountdown(remaining);
      startInterval();
    }
    return stopInterval; // clean up on unmount
  }, [startInterval, stopInterval]);

  const startLockout = useCallback((seconds: number) => {
    // Guard: ignore nonsensical values.
    const safe = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60;
    storeLockout(safe);
    setCountdown(safe);
    startInterval();
  }, [startInterval]);

  return { locked: countdown > 0, countdown, startLockout };
}

// ─── Brand ───────────────────────────────────────────────────────────────────

function Brand({ className = '' }: { className?: string }) {
  return <div className={`login-brand ${className}`} aria-label="SkinLab"><span>SkinLab</span><i /></div>;
}

function validateCredentials(id: string, pass: string): string | null {
  const trimmed = id.trim();
  if (!trimmed) {
    return 'Enter your User ID or email address.';
  }
  if (trimmed.length < 3) {
    return 'User ID must be at least 3 characters.';
  }
  if (trimmed.length > 80) {
    return 'User ID cannot exceed 80 characters.';
  }
  if (trimmed.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return 'Please enter a valid email address.';
    }
  } else {
    const idRegex = /^[A-Za-z0-9._@+-]+$/;
    if (!idRegex.test(trimmed)) {
      return 'User ID can only contain letters, numbers, and . _ @ + - characters.';
    }
  }
  if (!pass) {
    return 'Enter your password.';
  }
  return null;
}

// ─── Login page ───────────────────────────────────────────────────────────────

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(notice || '');
  const [success, setSuccess] = useState(Boolean(notice));
  const inFlightRef = useRef(false);
  const lastSubmittedRef = useRef<{ id: string; time: number } | null>(null);

  const { locked, countdown, startLockout } = useLockout();

  // The button is unavailable while a request is in-flight OR during lockout.
  const blocked = loading || locked;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (blocked || inFlightRef.current) return; // prevent duplicate / locked submissions

    // Fast synchronous validation (< 100ms) before contacting backend
    const tValStart = performance.now();
    const validationError = validateCredentials(userId, password);
    const tValEnd = performance.now();
    if (import.meta.env.DEV) {
      console.log(`[AUTH] Frontend validation: ${(tValEnd - tValStart).toFixed(2)}ms`);
    }

    if (validationError) {
      setMessage(validationError);
      setSuccess(false);
      return;
    }

    // Prevent duplicate rapid submissions with identical credentials within 1s
    const now = Date.now();
    if (lastSubmittedRef.current && lastSubmittedRef.current.id === userId.trim() && now - lastSubmittedRef.current.time < 1000) {
      return;
    }
    lastSubmittedRef.current = { id: userId.trim(), time: now };

    inFlightRef.current = true;
    setMessage('');
    setSuccess(false);
    setLoading(true);

    const tLoginStart = performance.now();
    try {
      await signIn(userId.trim(), password);
      const tLoginEnd = performance.now();
      if (import.meta.env.DEV) {
        console.log(`[AUTH] Complete login finished in ${(tLoginEnd - tLoginStart).toFixed(2)}ms`);
      }
      const requestedPath = (location.state as { from?: string } | null)?.from;
      let internalPath: string | undefined;
      if (requestedPath) {
        try {
          const requestedUrl = new URL(requestedPath, window.location.origin);
          if (requestedUrl.origin === window.location.origin) internalPath = `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`;
        } catch { /* Fall back to the home page. */ }
      }
      navigate(internalPath || '/', { replace: true });
    } catch (error) {
      if (error instanceof AuthServiceError && error.status === 429) {
        // Activate the lockout countdown. Use the backend's retryAfter value if
        // present and sane; fall back to 60 s so the button is never stuck forever.
        const seconds = typeof error.retryAfter === 'number' && error.retryAfter > 0
          ? error.retryAfter : 60;
        startLockout(seconds);
        // Show a fixed rate-limit message; the countdown on the button is enough
        // context — the per-minute message from authService already says "wait".
        setMessage('Too many login attempts. Please wait before trying again.');
      } else {
        setMessage(error instanceof Error ? error.message : 'Unable to log in. Please try again.');
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  // Label for the submit button.
  const buttonLabel = loading
    ? 'Logging in…'
    : locked
      ? `Try again in ${formatCountdown(countdown)}`
      : 'Log In';

  return <main className="login-page">
    <span className="login-corner login-corner-lime" />
    <span className="login-corner login-corner-orange" />
    <span className="login-corner login-corner-blue" />
    <section className="login-showcase" aria-label="SkinLab marketplace">
      <Brand className="showcase-brand" />
      <div className="showcase-copy">
        <div className="eyebrow"><span>Laptop skins marketplace</span><i /></div>
        <h1>Personalize<br />Your Laptop <span className="color-dots"><i/><i/><i/><i/></span></h1>
        <p>Explore 500+ premium laptop skins<br className="desktop-break"/> and give your device a unique look.</p>
      </div>
      <div className="product-art"><span className="lime-orb"/><img src="/assets/banners/hero-laptop.png" alt="Laptop featuring a London landmarks skin" /></div>
      <div className="market-stats">
        <div><Layers3/><p><b>500+</b><span>Designs</span></p></div><i/>
        <div><Tag/><p><b>20+</b><span>Categories</span></p></div><i/>
        <div><Users/><p><b>10K+</b><span>Happy Users</span></p></div>
      </div>
    </section>
    <section className="login-main" aria-labelledby="welcome-heading">
      <Brand className="mobile-brand" />
      <div className="mobile-product"><img src="/assets/banners/hero-laptop.png" alt="London landmarks laptop skin" /></div>
      <div className="login-card">
        <h2 id="welcome-heading">Welcome Back</h2><span className="welcome-underline" />
        <p className="login-subtitle">Log in to your SkinLab account.</p>
        <form onSubmit={submit} noValidate>
          <label className="login-field"><Mail aria-hidden="true"/><span className="sr-only">User ID</span><input type="text" name="username" autoComplete="username" placeholder="Enter your User ID" value={userId} onChange={e=>setUserId(e.target.value)} required /></label>
          <label className="login-field"><LockKeyhole aria-hidden="true"/><span className="sr-only">Password</span><input type={visible ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} required /><button className="visibility-button" type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={()=>setVisible(v=>!v)}>{visible ? <Eye/> : <EyeOff/>}</button></label>
          <div className="login-options"><span className="text-xs text-brand-navy/60">Account access is managed by the Main Admin.</span></div>
          {message && <p className={`login-message ${success ? 'is-success' : ''}`} role="status">{message}</p>}
          <button
            className={`login-submit${locked ? ' is-locked' : ''}`}
            type="submit"
            disabled={blocked}
            aria-live="polite"
            aria-label={locked ? `Login locked. ${buttonLabel}` : undefined}
          >
            {buttonLabel}
            {!blocked && <ArrowRight aria-hidden="true"/>}
          </button>
        </form>
      </div>
    </section>
  </main>;
}
