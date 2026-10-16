"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  apiRequest,
  getAccessToken,
  setAccessToken,
} from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session when the application loads or refreshes.
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const response = await apiRequest("/api/v1/auth/refresh", {
          method: "POST",
          retry: false,
        });

        const token = response?.data?.accessToken;
        const currentUser = response?.data?.user;

        if (token && active) {
          setAccessToken(token);
          setUser(currentUser || null);
        }
      } catch {
        if (active) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
      retry: false,
    });

    const token = response?.data?.accessToken;
    const currentUser = response?.data?.user;

    if (!token || !currentUser) {
      throw new Error("Login response did not contain a user and access token.");
    }

    setAccessToken(token);
    setUser(currentUser);

    return currentUser;
  }, []);


  const register = useCallback(async ({ name, email, password, avatar }) => {
    const formData = new FormData();

    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);

    if (avatar) {
      formData.append("avatar", avatar);
    }

    const response = await apiRequest("/api/v1/auth/register", {
      method: "POST",
      body: formData,
      retry: false,
    });

    const token = response?.data?.accessToken;
    const currentUser = response?.data?.user;

    if (!token || !currentUser) {
      throw new Error(
        "Registration response did not contain a user and access token."
      );
    }

    setAccessToken(token);
    setUser(currentUser);

    return currentUser;
  }, []);


  const logout = useCallback(async () => {
    try {
      await apiRequest("/api/v1/auth/logout", {
        method: "POST",
        token: getAccessToken(),
        retry: false,
      });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user && getAccessToken()),
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}