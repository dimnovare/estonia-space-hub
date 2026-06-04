const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface ApiError extends Error {
  status?: number;
  code?: string;
  body?: unknown;
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

class ApiClient {
  private getToken(): string | null {
    return tokenStore.getAccess();
  }

  async request<T>(endpoint: string, config: { method?: string; body?: unknown } = {}): Promise<T> {
    const { method = "GET", body } = config;
    const token = this.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const lang = localStorage.getItem("ruumly-lang") || "et";
    headers["Accept-Language"] = lang;
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
        const csrf = tokenStore.getCsrf();
        try {
          const refreshHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (!csrf) throw new Error("Session expired. Please log in again.");
          refreshHeaders["X-CSRF-Token"] = csrf;
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method:      "POST",
            credentials: "include",
            headers:     refreshHeaders,
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            tokenStore.setAccess(data.accessToken);
            if (data.csrfToken) tokenStore.setCsrf(data.csrfToken);
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
          }
        } catch {}
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

  get<T>(endpoint: string) { return this.request<T>(endpoint); }
  post<T>(endpoint: string, body: unknown) { return this.request<T>(endpoint, { method: "POST", body }); }
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
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    headers["Accept-Language"] = localStorage.getItem("ruumly-lang") || "et";
    if (body) headers["Content-Type"] = "application/json";
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
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
