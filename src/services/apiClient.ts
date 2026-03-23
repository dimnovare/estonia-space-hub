const API_BASE_URL = import.meta.env.VITE_API_URL || "";

class ApiClient {
  private getToken(): string | null {
    try {
      return localStorage.getItem("ruumly-token");
    } catch {}
    return null;
  }

  async request<T>(endpoint: string, config: { method?: string; body?: unknown } = {}): Promise<T> {
    const { method = "GET", body } = config;
    const token = this.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error("Serveriga ei saada ühendust. Kontrolli internetiühendust.");
    }
    if (response.status === 401) {
      if (token) {
        const refresh = localStorage.getItem("ruumly-refresh");
        if (refresh) {
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken: refresh }),
            });
            if (refreshRes.ok) {
              const data = await refreshRes.json();
              localStorage.setItem("ruumly-token", data.accessToken);
              if (data.refreshToken) {
                localStorage.setItem("ruumly-refresh", data.refreshToken);
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
        localStorage.removeItem("ruumly-auth");
        localStorage.removeItem("ruumly-token");
        localStorage.removeItem("ruumly-refresh");
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }
    if (!response.ok) {
      let message = `API error: ${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody.message) message = errorBody.message;
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
