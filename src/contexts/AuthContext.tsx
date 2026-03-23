import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiClient } from "@/services/apiClient";
import type { UserRole } from "@/services/types";

export type { UserRole };

export interface MockUser {
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
  user: MockUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  role: UserRole;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateProfile: (updates: Partial<MockUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(raw: AuthResponse["user"]): MockUser {
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
  const [user, setUser] = useState<MockUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("ruumly-token");
      if (!token) { setIsInitializing(false); return; }
      try {
        // Use raw fetch so a 401 doesn't trigger the apiClient redirect loop
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/auth/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("invalid token");
        const raw: AuthResponse["user"] = await res.json();
        const normalized = normalizeUser(raw);
        setUser(normalized);
        localStorage.setItem("ruumly-auth", JSON.stringify(normalized));
      } catch {
        localStorage.removeItem("ruumly-token");
        localStorage.removeItem("ruumly-auth");
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const persist = (
    u: MockUser | null,
    token?: string,
    refresh?: string
  ) => {
    setUser(u);
    try {
      if (u) localStorage.setItem("ruumly-auth", JSON.stringify(u));
      else localStorage.removeItem("ruumly-auth");
      if (token) localStorage.setItem("ruumly-token", token);
      if (refresh) localStorage.setItem("ruumly-refresh", refresh);
      if (!u) {
        localStorage.removeItem("ruumly-token");
        localStorage.removeItem("ruumly-refresh");
      }
    } catch {}
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiClient.post<AuthResponse>("/auth/login", { email, password });
      persist(normalizeUser(res.user), res.accessToken, res.refreshToken);
    } catch (err: any) {
      throw new Error(err.message || "Sisselogimine ebaõnnestus");
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await apiClient.post<AuthResponse>("/auth/register", { name, email, password, confirmPassword: password });
      persist(normalizeUser(res.user), res.accessToken, res.refreshToken);
    } catch (err: any) {
      throw new Error(err.message || "Registreerimine ebaõnnestus");
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    try {
      const res = await apiClient.post<AuthResponse>("/auth/google", { credential });
      persist(normalizeUser(res.user), res.accessToken, res.refreshToken);
    } catch (err: any) {
      throw new Error(err.message || "Google sisselogimine ebaõnnestus");
    }
  }, []);

  const logout = useCallback(() => {
    const refresh = localStorage.getItem("ruumly-refresh") ?? "";
    if (refresh) {
      apiClient.post("/auth/logout", { refreshToken: refresh }).catch(() => {});
    }
    persist(null);
  }, []);

  const switchRole = useCallback((_role: UserRole) => {
    // Dev-only: not applicable with real auth
  }, []);

  const updateProfile = useCallback((updates: Partial<MockUser>) => {
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
