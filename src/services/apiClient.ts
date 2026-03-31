const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// ── In-memory token store ──────────────────
// Access token: in-memory only (not persisted).
// Refresh token: sessionStorage (survives refresh,
// cleared on tab close, not readable cross-origin).
let _accessToken: string | null = null;

export const tokenStore = {
  getAccess: () => _accessToken,
  setAccess: (t: string | null) => {
    _accessToken = t;
  },
  getRefresh: () => {
    try { return sessionStorage.getItem("ruumly-refresh"); } catch { return null; }
  },
  setRefresh: (t: string | null) => {
    try {
      if (t) sessionStorage.setItem("ruumly-refresh", t);
      else sessionStorage.removeItem("ruumly-refresh");
    } catch {}
  },
  clear: () => {
    _accessToken = null;
    try { sessionStorage.removeItem("ruumly-refresh"); } catch {}
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
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      const lang = localStorage.getItem("ruumly-lang") || "et";
      const msg = lang === "en" ? "Cannot connect to server. Check your internet connection."
                : lang === "ru" ? "Не удаётся подключиться к серверу. Проверьте интернет."
                : "Serveriga ei saada ühendust. Kontrolli internetiühendust.";
      throw new Error(msg);
    }
    if (response.status === 401) {
      if (token) {
        const refresh = tokenStore.getRefresh();
        if (refresh) {
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken: refresh }),
            });
            if (refreshRes.ok) {
              const data = await refreshRes.json();
              tokenStore.setAccess(data.accessToken);
              if (data.refreshToken) {
                tokenStore.setRefresh(data.refreshToken);
              }
              const retryHeaders: Record<string, string> = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.accessToken}`,
              };
              const retry = await fetch(`${API_BASE_URL}${endpoint}`, {
                method,
                headers: retryHeaders,
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
        }
        tokenStore.clear();
        localStorage.removeItem("ruumly-auth");
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }
    if (!response.ok) {
      let message = `API error: ${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody.message) {
          message = errorBody.message;
        } else if (errorBody.errors) {
          const msgs = Object.values(errorBody.errors).flat().filter(Boolean);
          if (msgs.length > 0) message = (msgs as string[]).join(". ");
        } else if (errorBody.title) {
          message = errorBody.title;
        }
      } catch {}
      const err = new Error(message);
      (err as any).status = response.status;
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
}

export const apiClient = new ApiClient();
