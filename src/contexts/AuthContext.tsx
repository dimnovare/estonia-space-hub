import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
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
}

interface AuthContextType {
  user: MockUser | null;
  isAuthenticated: boolean;
  role: UserRole;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateProfile: (updates: Partial<MockUser>) => void;
}

const MOCK_USERS: Record<UserRole, MockUser> = {
  guest: { id: "", name: "", email: "", role: "guest", createdAt: "" },
  customer: { id: "u1", name: "Andres Tamm", email: "andres@email.com", role: "customer", phone: "+372 5551 2345", createdAt: "2025-11-05" },
  provider: { id: "u4", name: "Maria Saar", email: "maria@laopind.ee", role: "provider", company: "Laobox OÜ", phone: "+372 5123 4567", createdAt: "2025-10-20" },
  admin: { id: "u5", name: "Peeter Kuusk", email: "peeter@ruumly.eu", role: "admin", phone: "+372 5555 1234", createdAt: "2025-09-01" },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(() => {
    try {
      const stored = localStorage.getItem("ruumly-auth");
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const persist = (u: MockUser | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem("ruumly-auth", JSON.stringify(u));
      else localStorage.removeItem("ruumly-auth");
    } catch {}
  };

  const login = useCallback(async (_email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 800));
    persist(MOCK_USERS.customer);
  }, []);

  const register = useCallback(async (_name: string, _email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 800));
    persist(MOCK_USERS.customer);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 800));
    persist(MOCK_USERS.customer);
  }, []);

  const logout = useCallback(() => persist(null), []);

  const switchRole = useCallback((role: UserRole) => {
    if (role === "guest") { persist(null); return; }
    persist(MOCK_USERS[role]);
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
