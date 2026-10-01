import { createContext, useContext, useEffect, useState } from "react";
import * as api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // restore the locally saved session immediately (single flash-free boot);
    // replaced by the authoritative user after the /api/auth/me check below.
    const { user: saved } = api.getStoredCredentials();
    return saved?.id ? saved : null;
  });

  // Re-hydrate from the server with the persisted token. 401 = the token
  // stopped being valid (server DB reset) -> api client drops it; then
  // RequireAuth redirects to /login on the next render.
  useEffect(() => {
    const { token } = api.getStoredCredentials();
    if (!token) return undefined;
    let alive = true;
    api
      .me()
      .then((u) => {
        if (alive) setUser(u);
      })
      .catch((e) => {
        if (alive && e.status === 401) setUser(null);
        // network error (backend down): keep showing the saved user —
        // the screens will surface their own connectivity errors.
      });
    return () => {
      alive = false;
    };
  }, []);

  const value = {
    user,
    isAgent: user?.role === "agent",
    /** POST /api/auth/login {userId} -> {token,user}; persists credentials. */
    login: async (userId) => {
      const { token, user: u } = await api.login(userId);
      api.saveCredentials(token, u);
      setUser(u);
      return u;
    },
    /** POST /api/auth/logout (best effort) + clear local credentials. */
    logout: async () => {
      await api.logout();
      api.clearCredentials();
      setUser(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
