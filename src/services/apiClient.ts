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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 401) {
      if (token) {
        // Only redirect when a token was actually sent (expired/revoked session)
        localStorage.removeItem("ruumly-auth");
        localStorage.removeItem("ruumly-token");
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
    return response.json();
  }

  get<T>(endpoint: string) { return this.request<T>(endpoint); }
  post<T>(endpoint: string, body: unknown) { return this.request<T>(endpoint, { method: "POST", body }); }
  patch<T>(endpoint: string, body: unknown) { return this.request<T>(endpoint, { method: "PATCH", body }); }
  delete<T>(endpoint: string) { return this.request<T>(endpoint, { method: "DELETE" }); }
}

export const apiClient = new ApiClient();
