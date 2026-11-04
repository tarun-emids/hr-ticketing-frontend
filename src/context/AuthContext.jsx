import { createContext, useContext, useEffect, useState } from "react";
import * as api from "../api/client";
import { clearAccessToken } from "../api/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [usersReady, setUsersReady] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      // Sessions created before real login went live carry no `via` marker —
      // treat them as mock leftovers and require a fresh sign-in.
      const stored = localStorage.getItem("hrdesk.user");
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed?.via === "password" ? parsed : null;
    } catch {
      return null;
    }
  });

  // User data is protected, so load it only after restoring or completing login.
  useEffect(() => {
    if (!user) {
      setUsers([]);
      setUsersReady(false);
      return undefined;
    }

    let alive = true;
    setUsersReady(false);
    api
      .listUsers()
      .then((list) => {
        if (!alive) return;
        setUsers(list);
        setUsersReady(true);
        // Drop a stored session whose id no longer exists (deprovisioned)
        setUser((cur) => (cur && list.some((u) => u.id === cur.id) ? cur : null));
      })
      .catch(() => {
        // Keep the session usable if loading the supporting user list fails.
        if (alive) setUsersReady(true);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    if (user) localStorage.setItem("hrdesk.user", JSON.stringify(user));
    else {
      localStorage.removeItem("hrdesk.user");
      clearAccessToken();
    }
  }, [user]);

  const value = {
    user,
    users,
    usersReady,
    isAgent: user?.role === "agent",
    // Login verifies the email and password against the backend account table.
    // Throws an Error
    // with a user-facing message on failure (invalid credentials etc.).
    login: async (email, password) => {
      const res = await api.login(email, password);
      const sessionUser = { ...res.user, via: "password" };
      setUser(sessionUser);
      return sessionUser;
    },
    logout: () => {
      clearAccessToken();
      setUser(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
