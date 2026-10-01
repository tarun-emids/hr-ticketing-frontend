import { createContext, useContext, useEffect, useState } from "react";
import { USERS } from "../data/users";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("hrdesk.user") ?? "null");
    return saved && USERS.some((u) => u.id === saved.id) ? saved : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem("hrdesk.user", JSON.stringify(user));
    else localStorage.removeItem("hrdesk.user");
  }, [user]);

  const value = {
    user,
    isAgent: user?.role === "agent",
    login: setUser,
    logout: () => setUser(null),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
