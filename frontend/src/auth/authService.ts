export type AppRole = 'SHOP_ADMIN';
export interface SessionItem {
  id: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  mustChangePassword: boolean;
  shopId: string | null;
  shop: { id: string; name: string; slug: string; logoUrl: string | null } | null;
}
export class AuthServiceError extends Error {
  /** HTTP status code from the response, when available. */
  readonly status?: number;
  /**
   * For HTTP 429 responses: the number of seconds the client must wait before
   * retrying. Used by the Login component to drive the lockout countdown.
   */
  readonly retryAfter?: number;
  constructor(message: string, status?: number, retryAfter?: number) {
    super(message);
    this.name = 'AuthServiceError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const apiUrl = ((import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4000/api').replace(/\/$/, '');
let accessToken: string | null = null;
let cachedProfile: UserProfile | null = null;
let refreshFlight: Promise<string | null> | null = null;
let logoutHandler: (() => void) | null = null;
export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('skinlab:access-token', { detail: token }));
}
export function getAccessToken(): string | null { return accessToken; }
export function setAuthFailureHandler(handler: (() => void) | null) { logoutHandler = handler; }

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as { success?: boolean; data?: T; error?: { message?: string; retryAfter?: number } } | null;
  if (!response.ok || !payload?.success) {
    // Build a user-facing fallback keyed on HTTP status.
    // For 429 we always use a friendly rate-limit message regardless of the
    // backend message text so it is never confused with a credential error.
    const retryAfter = payload?.error?.retryAfter;
    const fallback = response.status === 429
      ? (retryAfter != null
          ? `Too many login attempts. Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`
          : 'Too many login attempts. Please wait before trying again.')
      : response.status === 401 ? 'Incorrect User ID or Password.'
      : response.status === 403 ? 'This account is not authorized to access the application.'
      : response.status >= 500 ? 'Authentication is temporarily unavailable.' : 'Unable to complete the request.';
    // For 429 always use our friendly message; for other statuses prefer the
    // server's message if present (it may be more specific, e.g. CSRF errors).
    const message = response.status === 429 ? fallback : (payload?.error?.message || fallback);
    throw new AuthServiceError(message, response.status, response.status === 429 ? retryAfter : undefined);
  }
  return payload.data as T;
}
async function refreshAccessToken(): Promise<string | null> {
  if (!refreshFlight) {
    refreshFlight = (async () => {
      try {
        const response = await fetch(`${apiUrl}/auth/refresh`, { method: 'POST', credentials: 'include', cache: 'no-store' });
        const data = await parseResponse<{ access_token: string; user?: UserProfile }>(response);
        setAccessToken(data.access_token);
        if (data.user) {
          cachedProfile = data.user;
        }
        return accessToken;
      } catch {
        setAccessToken(null);
        cachedProfile = null;
        return null;
      }
      finally { refreshFlight = null; }
    })();
  }
  return refreshFlight;
}
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const authPath = ['/auth/login', '/auth/refresh', '/auth/logout'].includes(path);
  const isGet = !init.method || init.method.toUpperCase() === 'GET';
  const cacheMode: RequestCache = (!isGet || authPath) ? 'no-store' : 'default';

  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken && !authPath) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  // Create timeout signal (20s) if caller didn't provide one
  const controller = init.signal ? null : new AbortController();
  const timeoutId = controller ? setTimeout(() => controller.abort(new Error('Network timeout after 20s')), 20_000) : null;
  const signal = init.signal || controller?.signal;

  const executeFetch = async () => {
    return fetch(`${apiUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      cache: cacheMode,
      signal,
    });
  };

  try {
    let response: Response;
    try {
      response = await executeFetch();
    } catch (networkErr) {
      // Safe retry once for idempotent GET requests on flaky networks
      if (isGet && !signal?.aborted) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        response = await executeFetch();
      } else {
        throw networkErr;
      }
    }

    if (response.status === 401 && !authPath && accessToken) {
      const nextToken = await refreshAccessToken();
      if (!nextToken) {
        logoutHandler?.();
        return response;
      }
      headers.set('Authorization', `Bearer ${nextToken}`);
      response = await executeFetch();
      if (response.status === 401) {
        setAccessToken(null);
        logoutHandler?.();
      }
    }
    return response;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await apiFetch(path, init); }
  catch { throw new AuthServiceError('Unable to reach the authentication service.'); }
  return parseResponse<T>(response);
}

export const authService = {
  async restore(): Promise<{ accessToken: string; profile: UserProfile } | null> {
    const token = await refreshAccessToken();
    if (!token) return null;
    try {
      const profile = cachedProfile || await this.getProfile();
      return { accessToken: token, profile };
    }
    catch {
      await this.signOut().catch(() => undefined);
      return null;
    }
  },
  async signIn(userId: string, password: string): Promise<{ accessToken: string; profile: UserProfile }> {
    const result = await request<{ access_token: string; user: UserProfile }>('/auth/login', { method: 'POST', body: JSON.stringify({ userId, password }) });
    accessToken = result.access_token;
    cachedProfile = result.user;
    return { accessToken: result.access_token, profile: result.user };
  },
  async getProfile(): Promise<UserProfile> {
    const profile = await request<UserProfile>('/auth/me');
    cachedProfile = profile;
    return profile;
  },
  async updateProfile(data: { username?: string; fullName?: string; email?: string }): Promise<UserProfile> {
    const updated = await request<UserProfile>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) });
    cachedProfile = updated;
    return updated;
  },
  changePassword(password: string, currentPassword?: string): Promise<{ message: string }> {
    return request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(currentPassword ? { password, currentPassword } : { password }),
    });
  },
  getSessions(): Promise<SessionItem[]> {
    return request<SessionItem[]>('/auth/sessions');
  },
  revokeSession(sessionId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
  },
  revokeAllSessions(): Promise<{ message: string }> {
    return request<{ message: string }>('/auth/logout-all', { method: 'POST' });
  },
  checkEmail(email: string): Promise<{ available: boolean; reason?: string; message?: string }> {
    return request<{ available: boolean; reason?: string; message?: string }>(`/auth/check-email?email=${encodeURIComponent(email)}`);
  },
  changeEmail(newEmail: string, currentPassword: string): Promise<{ message: string; user: UserProfile }> {
    return request<{ message: string; user: UserProfile }>('/auth/change-email', {
      method: 'POST',
      body: JSON.stringify({ newEmail, currentPassword }),
    });
  },
  async signOut(): Promise<void> {
    cachedProfile = null;
    try { await fetch(`${apiUrl}/auth/logout`, { method: 'POST', headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, credentials: 'include', cache: 'no-store' }); }
    finally { setAccessToken(null); }
  },
};

export function roleLandingPath(_role?: AppRole): string { return '/'; }
