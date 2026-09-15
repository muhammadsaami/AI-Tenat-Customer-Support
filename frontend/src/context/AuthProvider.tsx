import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi } from "@/services/api/endpoints";
import {
  isMockMode,
  refreshSession,
  getStoredTokens,
  clearStoredTokens,
  storeTokens,
  sessionExpiredEventName,
} from "@/services/api/client";
import type { UserOut } from "@/types/api";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

type AuthStatus = "idle" | "authenticating" | "authenticated";

const AuthContext = createContext<{
  user: AppUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  status: "idle",
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

const DEMO_SESSION_KEY = "sp-demo-session";

function humanizeEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function userFromMe(me: UserOut): AppUser {
  return {
    id: me.id,
    name: humanizeEmail(me.email),
    email: me.email,
    role: me.role,
    tenantId: me.tenant_id,
  };
}

function tenantNameFrom(name: string, email: string): string {
  const clean = name.trim();
  if (clean) return `${clean}'s workspace`;
  const domain = email.split("@")[1] ?? "supportpilot";
  return domain.split(".")[0] + " workspace";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const demo = isMockMode();

  const [user, setUser] = useState<AppUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("authenticating");

  const boot = useCallback(async () => {
    if (demo) {
      try {
        const raw = localStorage.getItem(DEMO_SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as AppUser;
          setUser(saved);
          setStatus("authenticated");
          return;
        }
      } catch {
        /* ignore corrupt demo session */
      }
      setStatus("idle");
      return;
    }

    const hasTokens = !!getStoredTokens().refresh || !!getStoredTokens().access;
    if (!hasTokens) {
      setStatus("idle");
      return;
    }

    setStatus("authenticating");
    try {
      const me = await authApi.me();
      setUser(userFromMe(me));
      setStatus("authenticated");
    } catch {
      const ok = await refreshSession();
      if (ok) {
        try {
          const me = await authApi.me();
          setUser(userFromMe(me));
          setStatus("authenticated");
          return;
        } catch {
          /* fall through to signed-out state */
        }
      }
      clearStoredTokens();
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      setStatus("idle");
    }
  }, [demo]);

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    if (demo) return;
    const onExpired = () => {
      clearStoredTokens();
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      setStatus("idle");
    };
    window.addEventListener(sessionExpiredEventName(), onExpired);
    return () => window.removeEventListener(sessionExpiredEventName(), onExpired);
  }, [demo]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (demo) {
        const saved = {
          id: "user_demo",
          name: humanizeEmail(email) || "Sara Ali",
          email: email.trim().toLowerCase(),
          role: "Admin",
          tenantId: "demo",
        } as AppUser;
        localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(saved));
        setUser(saved);
        setStatus("authenticated");
        return;
      }
      const tokens = await authApi.login({ email, password });
      storeTokens(tokens.access_token, tokens.refresh_token);
      const me = await authApi.me();
      setUser(userFromMe(me));
      setStatus("authenticated");
    },
    [demo]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      if (demo) {
        const saved = {
          id: "user_demo",
          name: name.trim() || humanizeEmail(email),
          email: email.trim().toLowerCase(),
          role: "Admin",
          tenantId: "demo",
        } as AppUser;
        localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(saved));
        setUser(saved);
        setStatus("authenticated");
        return;
      }
      const tokens = await authApi.register({
        tenant_name: tenantNameFrom(name, email),
        admin_email: email.trim().toLowerCase(),
        admin_password: password,
      });
      storeTokens(tokens.access_token, tokens.refresh_token);
      const me = await authApi.me();
      setUser(userFromMe(me));
      setStatus("authenticated");
    },
    [demo]
  );

  const logout = useCallback(async () => {
    const refresh = getStoredTokens().refresh;
    if (!demo && refresh) {
      try {
        await authApi.logout({ refresh_token: refresh });
      } catch {
        /* local sign-out must succeed even if the server is unreachable */
      }
    }
    clearStoredTokens();
    localStorage.removeItem(DEMO_SESSION_KEY);
    setUser(null);
    setStatus("idle");
  }, [demo]);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}