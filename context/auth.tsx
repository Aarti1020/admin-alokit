"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { AdminUser } from "@/lib/types";

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setSession: (token: string, user: AdminUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const tokenKey = "alokit_admin_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(tokenKey);
    setToken(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  const setSession = useCallback((nextToken: string, nextUser: AdminUser) => {
    localStorage.setItem(tokenKey, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { adminAuthApi } = await import("@/lib/api");
    const response = await adminAuthApi.login({ email, password });
    setSession(response.data.token, response.data.user);
    router.replace("/dashboard");
  }, [router, setSession]);

  useEffect(() => {
    const storedToken = localStorage.getItem(tokenKey);

    if (!storedToken) {
      setLoading(false);
      if (pathname !== "/login") router.replace("/login");
      return;
    }

    setToken(storedToken);

    import("@/lib/api")
      .then(({ adminAuthApi }) => adminAuthApi.profile())
      .then((response) => {
        setUser(response.data);
        if (pathname === "/login") router.replace("/dashboard");
      })
      .catch(() => {
        toast.error("Your admin session has expired.");
        logout();
      })
      .finally(() => setLoading(false));
  }, [logout, pathname, router]);

  const value = useMemo(
    () => ({ user, token, loading, login, logout, setSession }),
    [user, token, loading, login, logout, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
