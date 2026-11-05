import { createContext, useContext, useEffect, useState } from "react";
import { USER_TOKEN, api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(USER_TOKEN);
    if (!token) {
      setLoading(false);
      return;
    }
    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem(USER_TOKEN))
      .finally(() => setLoading(false));
  }, []);

  function login(token, nextUser) {
    localStorage.setItem(USER_TOKEN, token);
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem(USER_TOKEN);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
