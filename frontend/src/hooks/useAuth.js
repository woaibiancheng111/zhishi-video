/**
 * useAuth - 认证状态管理 Hook
 * 管理登录状态，localStorage 存储 token
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('zhishi_token');
    const savedUser = localStorage.getItem('zhishi_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('zhishi_user');
      }
    }

    setLoading(false);
  }, []);

  const login = useCallback(async (phone, code) => {
    const res = await api.login(phone, code);
    if (res.success) {
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('zhishi_token', newToken);
      localStorage.setItem('zhishi_user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || '登录失败');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('zhishi_token');
    localStorage.removeItem('zhishi_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    localStorage.setItem('zhishi_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: !!token,
    isNewUser: user?.is_new_user,
    login,
    logout,
    updateUser
  }), [user, token, loading, login, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export default useAuth;
