/**
 * useAuth - 认证状态管理 Hook
 * 管理登录状态，localStorage 存储 token
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初始化：从 localStorage 恢复登录状态
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

  /** 登录 */
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

  /** 登出 */
  const logout = useCallback(() => {
    localStorage.removeItem('zhishi_token');
    localStorage.removeItem('zhishi_user');
    setToken(null);
    setUser(null);
  }, []);

  /** 更新用户信息 */
  const updateUser = useCallback((userData) => {
    localStorage.setItem('zhishi_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  /** 是否已认证 */
  const isAuthenticated = !!token;

  /** 是否新用户 */
  const isNewUser = user?.is_new_user;

  return {
    user,
    token,
    loading,
    isAuthenticated,
    isNewUser,
    login,
    logout,
    updateUser
  };
}

export default useAuth;
