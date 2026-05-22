import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "./api";
import type { AuthSession, User } from "../types/api";

interface AuthState {
  loading: boolean;
  user: User | null;
  session: AuthSession | null;
}

interface AuthCtx extends AuthState {
  signIn: (session: AuthSession) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, session: null });

  useEffect(() => {
    if (!getToken()) {
      void api.auth.devLogin()
        .then(s => { setToken(s.token); setState({ loading: false, user: s.user, session: s }); })
        .catch(() => setState({ loading: false, user: null, session: null }));
      return;
    }
    void api.auth.me()
      .then(s => setState({ loading: false, user: s.user, session: s }))
      .catch(() => {
        setToken(null);
        setState({ loading: false, user: null, session: null });
      });
  }, []);

  const signIn = useCallback((session: AuthSession) => {
    setToken(session.token);
    setState({ loading: false, user: session.user, session });
  }, []);

  const signOut = useCallback(async () => {
    try { await api.auth.logout(); } catch {}
    setToken(null);
    setState({ loading: false, user: null, session: null });
  }, []);

  const value = useMemo<AuthCtx>(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
