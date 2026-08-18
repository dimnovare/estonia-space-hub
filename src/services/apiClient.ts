const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface ApiError extends Error {
  status?: number;
  code?: string;
  body?: unknown;
  /** Seconds from a `Retry-After` response header, when the server sent one and
   *  it was a delta-seconds value (the HTTP-date form is ignored). Lets a 429
   *  tell the user how long to wait instead of guessing. */
  retryAfter?: number;
}

/** Parse `Retry-After` delta-seconds. Returns undefined for absent/HTTP-date/junk. */
function parseRetryAfter(res: Response): number | undefined {
  const raw = res.headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw.trim());
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

// ── In-memory token store ──────────────────
// Access token: in-memory only (not persisted).
// Refresh token: HttpOnly cookie set by backend (XSS-safe).
// CSRF token: in-memory only; sent as X-CSRF-Token header on /auth/refresh.
let _accessToken: string | null = null;
let _csrfToken:   string | null = null;

export const tokenStore = {
  getAccess:  () => _accessToken,
  setAccess:  (t: string | null) => { _accessToken = t; },
  getCsrf:    () => _csrfToken,
  setCsrf:    (t: string | null) => { _csrfToken = t; },

  clear: () => {
    _accessToken = null;
    _csrfToken   = null;
  },
};

// ── Single-flight refresh ──────────────────
// On a hard reload several requests can 401 at once AND AuthContext fires its
// own bootstrap refresh. The backend rotates the refresh token single-use, so
// firing POST /auth/refresh more than once concurrently makes the 2nd+ calls
// present an already-rotated cookie → 401 → spurious logout. Dedupe every
// concurrent refresh onto ONE in-flight request.
export type RefreshResult =
  | { ok: true; data: any }
  | { ok: false; hardInvalid: boolean };

let _refreshPromise: Promise<RefreshResult> | null = null;

export function refreshAccessToken(): Promise<RefreshResult> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async (): Promise<RefreshResult> => {
    const csrf = tokenStore.getCsrf();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // Cookie-based refresh is accepted without a CSRF token; send it only when
    // we still hold it in memory (a reload clears it but the cookie is valid).
    if (csrf) headers["X-CSRF-Token"] = csrf;
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers,
      });
    } catch {
      return { ok: false, hardInvalid: false };   // network error → soft failure
    }
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.accessToken) {
        tokenStore.setAccess(data.accessToken);
        if (data.csrfToken) tokenStore.setCsrf(data.csrfToken);
        return { ok: true, data };
      }
      return { ok: false, hardInvalid: false };
    }
    // Only a hard 401 means the refresh cookie is genuinely invalid/expired.
    return { ok: false, hardInvalid: res.status === 401 };
  })().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

class ApiClient {
  private getToken(): string | null {
    return tokenStore.getAccess();
  }

  async request<T>(
    endpoint: string,
    config: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const { method = "GET", body, headers: extraHeaders } = config;
    const token = this.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const lang = localStorage.getItem("ruumly-lang") || "et";
    headers["Accept-Language"] = lang;
    // Per-call headers, e.g. the anonymous claim session (X-Claim-Session).
    // Merged last but never able to displace Authorization for a logged-in user
    // — an anonymous flow must not be able to spoof one.
    if (extraHeaders) {
      for (const [key, value] of Object.entries(extraHeaders)) {
        if (key.toLowerCase() === "authorization") continue;
        headers[key] = value;
      }
    }
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      const lang = localStorage.getItem("ruumly-lang") || "et";
      const messages: Record<string, string> = {
        et: "Serveriga ei saada ühendust. Kontrolli internetiühendust.",
        en: "Cannot connect to server. Check your internet connection.",
        ru: "Не удаётся подключиться к серверу. Проверьте интернет.",
        lv: "Nevar izveidot savienojumu ar serveri. Pārbaudiet interneta savienojumu.",
        lt: "Nepavyko prisijungti prie serverio. Patikrinkite interneto ryšį.",
      };
      throw new Error(messages[lang] || messages.et);
    }
    if (response.status === 401) {
     if (token) {
        try {
          // Single-flight: dedupe with AuthContext bootstrap + other concurrent
          // 401s so the rotating refresh cookie is spent only once (see
          // refreshAccessToken). Prevents the rotation-race spurious logout.
          const result = await refreshAccessToken();
          // A transient refresh failure (5xx / network) is NOT an expired session.
          // Surface a retryable error and KEEP the session — don't log the user out
          // on a server blip (mirrors AuthContext bootstrap's soft-failure tolerance).
          // Only a hard 401 from /auth/refresh (result.hardInvalid) clears below.
          if (result.ok === false && !result.hardInvalid) {
            const transient = new Error("Temporary server error. Please try again.") as ApiError;
            transient.status = 503;
            throw transient;
          }
          if (result.ok && result.data?.accessToken) {
            const data = result.data;
            const retryHeaders: Record<string, string> = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.accessToken}`,
            };
            const lang = localStorage.getItem("ruumly-lang") || "et";
            retryHeaders["Accept-Language"] = lang;
            const retry = await fetch(`${API_BASE_URL}${endpoint}`, {
              method,
              headers: retryHeaders,
              credentials: "include",
              body: body ? JSON.stringify(body) : undefined,
            });
            if (retry.ok) {
              const cl = retry.headers.get("content-length");
              const ct = retry.headers.get("content-type") ?? "";
              if (retry.status === 204 || cl === "0" || !ct.includes("application/json")) {
                return undefined as unknown as T;
              }
              return retry.json() as Promise<T>;
            }
            // Refresh succeeded but the retried request failed for a non-auth
            // reason (genuine 403/404/5xx that merely coincided with an expired
            // token). The session is still valid — do NOT clear/redirect.
            // Surface the real error from the retry response using the same
            // standard non-ok parsing as below.
            if (retry.status !== 401) {
              let message = `API error: ${retry.status}`;
              let errorCode: string | undefined;
              let errorBodyRaw: unknown = undefined;
              try {
                const errorBody = await retry.json();
                errorBodyRaw = errorBody;
                if (typeof errorBody?.error === "string") errorCode = errorBody.error;
                if (errorBody.message) {
                  message = errorBody.message;
                } else if (errorBody.error) {
                  message = errorBody.error;
                } else if (errorBody.errors) {
                  const msgs = Object.values(errorBody.errors).flat().filter(Boolean);
                  if (msgs.length > 0) message = (msgs as string[]).join(". ");
                } else if (errorBody.title) {
                  message = errorBody.title;
                }
              } catch {}
              const err = new Error(message) as ApiError;
              err.status = retry.status;
              if (errorCode) err.code = errorCode;
              if (errorBodyRaw !== undefined) err.body = errorBodyRaw;
              const retryAfterSecs = parseRetryAfter(retry);
              if (retryAfterSecs !== undefined) err.retryAfter = retryAfterSecs;
              throw err;
            }
            // retry is AGAIN 401 — fall through to the genuine-expired-session
            // clear/redirect path below.
          }
        } catch (e) {
          // Re-throw the ApiError we built from a non-ok retry above; only swallow
          // network/parse errors so a genuine refresh/network failure still clears.
          if (e instanceof Error && (e as ApiError).status !== undefined) throw e;
        }
        tokenStore.clear();
        localStorage.removeItem("ruumly-auth");
        const lang = localStorage.getItem("ruumly-lang") || "et";
        window.location.href = `/${lang}/login`;
      }
      throw new Error("Unauthorized");
    }
    if (!response.ok) {
      let message = `API error: ${response.status}`;
      let errorCode: string | undefined;
      let errorBodyRaw: unknown = undefined;
      try {
        const errorBody = await response.json();
        errorBodyRaw = errorBody;
        if (typeof errorBody?.error === "string") errorCode = errorBody.error;
        if (errorBody.message) {
          message = errorBody.message;
        } else if (errorBody.error) {
          message = errorBody.error;
        } else if (errorBody.errors) {
          const msgs = Object.values(errorBody.errors).flat().filter(Boolean);
          if (msgs.length > 0) message = (msgs as string[]).join(". ");
        } else if (errorBody.title) {
          message = errorBody.title;
        }
      } catch {}
      const err = new Error(message) as ApiError;
      err.status = response.status;
      if (errorCode) err.code = errorCode;
      if (errorBodyRaw !== undefined) err.body = errorBodyRaw;
      const retryAfterSecs = parseRetryAfter(response);
      if (retryAfterSecs !== undefined) err.retryAfter = retryAfterSecs;
      throw err;
    }
    // 204 No Content or empty body — return undefined safely
    const contentLength = response.headers.get("content-length");
    const contentType   = response.headers.get("content-type") ?? "";

    if (
      response.status === 204 ||
      contentLength === "0" ||
      !contentType.includes("application/json")
    ) {
      return undefined as unknown as T;
    }
    return response.json();
  }

  get<T>(endpoint: string, headers?: Record<string, string>) { return this.request<T>(endpoint, { headers }); }
  post<T>(endpoint: string, body: unknown, headers?: Record<string, string>) { return this.request<T>(endpoint, { method: "POST", body, headers }); }
  put<T>(endpoint: string, body: unknown, headers?: Record<string, string>) { return this.request<T>(endpoint, { method: "PUT", body, headers }); }
  patch<T>(endpoint: string, body: unknown) { return this.request<T>(endpoint, { method: "PATCH", body }); }
  delete<T>(endpoint: string) { return this.request<T>(endpoint, { method: "DELETE" }); }

  /**
   * Multipart form upload (e.g. docx). Does NOT set Content-Type — the browser
   * adds the multipart boundary. Returns parsed JSON. Refresh-on-401 is not
   * retried here (a FormData body can't be safely replayed); caller handles 401.
   */
  async postForm<T>(endpoint: string, form: FormData): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    headers["Accept-Language"] = localStorage.getItem("ruumly-lang") || "et";
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      credentials: "include",
      body: form,
    });
    if (!response.ok) {
      let message = `API error: ${response.status}`;
      let errorBodyRaw: unknown = undefined;
      try {
        const errorBody = await response.json();
        errorBodyRaw = errorBody;
        if (errorBody?.message) message = errorBody.message;
        else if (errorBody?.error) message = errorBody.error;
        else if (errorBody?.title) message = errorBody.title;
      } catch {}
      const err = new Error(message) as ApiError;
      err.status = response.status;
      if (errorBodyRaw !== undefined) err.body = errorBodyRaw;
      throw err;
    }
    const ct = response.headers.get("content-type") ?? "";
    if (response.status === 204 || !ct.includes("application/json")) {
      return undefined as unknown as T;
    }
    return response.json();
  }

  /**
   * Fetch a binary response (e.g. application/pdf) as a Blob. The endpoint may
   * also return a JSON `{ url }` — in that case the JSON is parsed and returned
   * via the `json` field so callers can branch.
   */
  async fetchBinary(
    endpoint: string,
    config: { method?: string; body?: unknown } = {}
  ): Promise<{ blob?: Blob; json?: { url?: string } }> {
    const { method = "GET", body } = config;

    const send = () => {
      const token = this.getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      headers["Accept-Language"] = localStorage.getItem("ruumly-lang") || "et";
      if (body) headers["Content-Type"] = "application/json";
      return fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
    };

    let response = await send();

    // Refresh-and-retry once on 401, exactly as `request` does. Without it this
    // path was the only authenticated fetch in the app that simply failed when
    // an access token expired mid-flight — and it is the path used for the
    // things where that is most visible: a contract PDF being signed, a provider
    // export, and the admin lead-photo gallery, where every tile in the grid
    // fails at once and reads as "the photos are gone" rather than "log in again".
    //
    // Deliberately does NOT log the user out on failure. `refreshAccessToken` is
    // single-flight and distinguishes an expired session from a server blip, but
    // acting on that distinction is `request`'s job in one place; here we retry
    // once and otherwise report the original failure.
    if (response.status === 401 && this.getToken()) {
      const result = await refreshAccessToken();
      if (result.ok) response = await send();
    }

    if (!response.ok) {
      let message = `API error: ${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody?.message) message = errorBody.message;
        else if (errorBody?.error) message = errorBody.error;
      } catch {}
      const err = new Error(message) as ApiError;
      err.status = response.status;
      throw err;
    }
    const ct = response.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return { json: await response.json() };
    }
    return { blob: await response.blob() };
  }
}

export const apiClient = new ApiClient();
