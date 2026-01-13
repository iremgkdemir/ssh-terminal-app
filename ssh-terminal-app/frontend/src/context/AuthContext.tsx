import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from "react";
import { authAPI } from '../lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  auth_provider: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuthData: (user: User, token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUserRaw = localStorage.getItem('user');
    if (storedToken) setToken(storedToken);
    if (storedUserRaw && storedUserRaw !== 'undefined' && storedUserRaw !== 'null') {
      try {
        const parsed = JSON.parse(storedUserRaw) as User;
        setUser(parsed);
      } catch {
        localStorage.removeItem('user');
        setUser(null);
      }
    }

    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    authAPI.getMe()
      .then(response => {
        const userData = (response.data as any)?.user ?? response.data;

        if (userData) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          localStorage.removeItem('user');
          setUser(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);


  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    const { user: userData, token: authToken } = response.data;

    setUser(userData ?? null);
    setToken(authToken ?? null);

    if (authToken) localStorage.setItem('token', authToken);
    else localStorage.removeItem('token');

    if (userData) localStorage.setItem('user', JSON.stringify(userData));
    else localStorage.removeItem('user'); 
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authAPI.register({ email, password, name });
    const { user: userData, token: authToken } = response.data;

    setUser(userData ?? null);
    setToken(authToken ?? null);

    if (authToken) localStorage.setItem('token', authToken);
    else localStorage.removeItem('token');

    if (userData) localStorage.setItem('user', JSON.stringify(userData));
    else localStorage.removeItem('user');

  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore logout errors
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const setAuthData = (userData: User, authToken: string) => {
    setUser(userData ?? null);
    setToken(authToken ?? null);

    if (authToken) localStorage.setItem('token', authToken);
    else localStorage.removeItem('token');

    if (userData) localStorage.setItem('user', JSON.stringify(userData));
    else localStorage.removeItem('user');

  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        setAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
