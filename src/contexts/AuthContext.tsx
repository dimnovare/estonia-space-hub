import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiClient, tokenStore } from "@/services/apiClient";
import type { UserRole } from "@/services/types";
import { localizedHref } from "@/i18n/routing";

export type { UserRole };

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  company?: string;
  phone?: string;
  createdAt: string;
  status?: "active" | "blocked";
  registeredAt?: string;
  bookingsCount?: number;
  hasGoogleAccount?: boolean;
  supplierId?: string;
}

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    company?: string;
    phone?: string;
    avatar?: string;
    registeredAt: string;
    bookingsCount: number;
    supplierId?: string;
    hasGoogleAccount?: boolean;
  };
  accessToken:  string;
  refreshToken: string;
  csrfToken?:   string;   // present from backend v2 — store in-memory for X-CSRF-Token header
  isNewUser?:   boolean;  // true only for a brand-new Google registration (backend v3)
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  role: UserRole;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, inviteCode?: string) => Promise<string>;
  loginWithGoogle: (credential: string) => Promise<{ isNewUser: boolean }>;
  logout: () => void;
  updateProfile: (updates: Partial<AppUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

function normalizeUser(raw: AuthResponse["user"]): AppUser {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role.toLowerCase() as UserRole,
    status: (raw.status?.toLowerCase() ?? "active") as "active" | "blocked",
    company: raw.company ?? undefined,
    phone: raw.phone ?? undefined,
    avatar: raw.avatar ?? undefined,
    createdAt: raw.registeredAt,
    registeredAt: raw.registeredAt,
    bookingsCount: raw.bookingsCount,
    hasGoogleAccount: raw.hasGoogleAccount ?? false,
    supplierId: raw.supplierId || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("ruumly-auth");

    // Skip optimistic refresh for first-time visitors — no point hitting
    // /auth/refresh when there's no session marker (saves a 401 round-trip).
    if (!stored) {
      tokenStore.clear();
      setIsInitializing(false);
      return;
    }

    // Cookie-based refresh: credentials: "include" sends the HttpOnly cookie.
    fetch(`${API_BASE_URL}/auth/refresh`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.accessToken) {
          tokenStore.setAccess(data.accessToken);
          if (data.csrfToken) tokenStore.setCsrf(data.csrfToken);
          // Use stored profile for instant UI while token is valid
          const profile = stored ? JSON.parse(stored) : null;
          if (profile) setUser(profile);
        } else {
          tokenStore.clear();
          localStorage.removeItem("ruumly-auth");
        }
      })
      .catch(() => {
        tokenStore.clear();
        localStorage.removeItem("ruumly-auth");
      })
      .finally(() => setIsInitializing(false));
  }, []);

  const persist = (
    u: AppUser | null,
    token?: string,
    csrf?: string
  ) => {
    setUser(u);
    try {
      if (u) localStorage.setItem("ruumly-auth", JSON.stringify(u));
      else localStorage.removeItem("ruumly-auth");
    } catch {}
    tokenStore.setAccess(token ?? null);
    tokenStore.setCsrf(csrf ?? null);
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiClient.post<AuthResponse>("/auth/login", { email, password });
      persist(normalizeUser(res.user), res.accessToken, res.csrfToken);
    } catch (err: any) {
      throw new Error(err.message || "error.loginFailed");
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, inviteCode?: string): Promise<string> => {
    try {
      const currentLang = localStorage.getItem("ruumly-lang") ?? "et";
      await apiClient.post("/auth/register", { name, email, password, confirmPassword: password, inviteCode, language: currentLang });
      // Don't persist session — user must verify email first
      return email;
    } catch (err: any) {
      throw new Error(err.message || "error.registerFailed");
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    try {
      const res = await apiClient.post<AuthResponse>("/auth/google", { credential });
      persist(normalizeUser(res.user), res.accessToken, res.csrfToken);
      return { isNewUser: res.isNewUser ?? false };
    } catch (err: any) {
      throw new Error(err.message || "error.googleFailed");
    }
  }, []);

  const logout = useCallback(() => {
    fetch(`${API_BASE_URL}/auth/logout`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json", Authorization: `Bearer ${tokenStore.getAccess() ?? ""}` },
    }).catch(() => {});
    persist(null);
    window.location.href = localizedHref("/login");
  }, []);

  const updateProfile = useCallback(async (updates: Partial<AppUser>) => {
    // Persist to backend first; only update local state if the API call succeeds.
    const updatedRaw = await apiClient.patch<AuthResponse["user"]>("/auth/me", {
      name: updates.name,
      phone: updates.phone,
      company: updates.company,
    });

    const normalized = normalizeUser(updatedRaw);
    setUser((prev) => {
      const merged = prev ? { ...prev, ...normalized } : normalized;
      try { localStorage.setItem("ruumly-auth", JSON.stringify(merged)); } catch {}
      return merged;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isInitializing,
      role: user?.role || "guest",
      login, register, loginWithGoogle, logout, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
