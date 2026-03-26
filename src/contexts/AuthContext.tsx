import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiClient, tokenStore } from "@/services/apiClient";
import type { UserRole } from "@/services/types";

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
  };
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  role: UserRole;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, inviteCode?: string) => Promise<string>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateProfile: (updates: Partial<AppUser>) => void;
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
    hasGoogleAccount: (raw as any).hasGoogleAccount ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const refresh = tokenStore.getRefresh();
    const stored = localStorage.getItem("ruumly-auth");

    if (!refresh) {
      // No refresh token — user is logged out
      setIsInitializing(false);
      return;
    }

    // Try to restore session via refresh token
    fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.accessToken) {
          tokenStore.setAccess(data.accessToken);
          if (data.refreshToken) tokenStore.setRefresh(data.refreshToken);
          // Use stored profile for instant UI while we have a valid token
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
    refresh?: string
  ) => {
    setUser(u);
    try {
      if (u) localStorage.setItem("ruumly-auth", JSON.stringify(u));
      else localStorage.removeItem("ruumly-auth");
    } catch {}
    tokenStore.setAccess(token ?? null);
    tokenStore.setRefresh(refresh ?? null);
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiClient.post<AuthResponse>("/auth/login", { email, password });
      persist(normalizeUser(res.user), res.accessToken, res.refreshToken);
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
      persist(normalizeUser(res.user), res.accessToken, res.refreshToken);
    } catch (err: any) {
      throw new Error(err.message || "error.googleFailed");
    }
  }, []);

  const logout = useCallback(() => {
    const refresh = tokenStore.getRefresh();
    if (refresh) {
      apiClient.post("/auth/logout", { refreshToken: refresh }).catch(() => {});
    }
    persist(null);
    window.location.href = "/login";
  }, []);

  const switchRole = useCallback((_role: UserRole) => {
    // Dev-only: not applicable with real auth
  }, []);

  const updateProfile = useCallback((updates: Partial<AppUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      try { localStorage.setItem("ruumly-auth", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isInitializing,
      role: user?.role || "guest",
      login, register, loginWithGoogle, logout, switchRole, updateProfile,
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
