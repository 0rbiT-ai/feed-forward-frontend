import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as AuthStorage from '../storage/authStorage';
import { api, setAuthToken, loadAuthToken, subscribeAuthToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('NGO'); // 'NGO' | 'RESTAURANT'
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeAuthToken((hasToken) => {
    if (!hasToken) {
      setUser(null);
      setProfile(null);
      setRole('NGO');
      AuthStorage.deleteItemAsync('feedforward_user_role').catch(() => {});
      AuthStorage.deleteItemAsync('feedforward_user_info').catch(() => {});
    }
  }), []);

  const initAuth = useCallback(async () => {
    try {
      const token = await loadAuthToken();
      if (token) {
        const savedRole = await AuthStorage.getItemAsync('feedforward_user_role');
        const savedUser = await AuthStorage.getItemAsync('feedforward_user_info');
        if (savedRole) setRole(savedRole);
        if (savedUser) setUser(JSON.parse(savedUser));

        // Fetch fresh profile from backend
        try {
          const profileData = await api.getProfile();
          if (profileData) {
            setProfile(profileData);
            if (profileData.role) {
              setRole(profileData.role);
              await AuthStorage.setItemAsync('feedforward_user_role', profileData.role);
            }
          }
        } catch (pErr) {
          console.warn('Could not refresh profile on launch:', pErr.message);
        }
      }
    } catch (error) {
      console.warn('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Hydrate auth state from persistent storage once when the provider mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initAuth();
  }, [initAuth]);

  const login = async (email, password, channel = 'email') => {
    const data = await api.login(email, password, channel);
    return data;
  };

  const verifyLoginOtp = async (challengeId, otp) => {
    const data = await api.verifyLoginOtp(challengeId, otp);
    if (data?.user) {
      setUser(data.user);
      const userRole = data.user.role || 'NGO';
      setRole(userRole);
      await AuthStorage.setItemAsync('feedforward_user_role', userRole);
      await AuthStorage.setItemAsync('feedforward_user_info', JSON.stringify(data.user));
    }
    await refreshProfile();
    return data;
  };

  const register = async (registerData) => {
    const data = await api.register(registerData);
    if (data?.user) {
      setUser(data.user);
      const userRole = data.user.role || registerData.role || 'NGO';
      setRole(userRole);
      await AuthStorage.setItemAsync('feedforward_user_role', userRole);
      await AuthStorage.setItemAsync('feedforward_user_info', JSON.stringify(data.user));
    }
    await refreshProfile();
    return data;
  };

  const refreshProfile = async () => {
    try {
      const p = await api.getProfile();
      if (p) {
        setProfile(p);
        if (p.role) setRole(p.role);
      }
      return p;
    } catch (err) {
      console.warn('Error refreshing profile:', err.message);
      return null;
    }
  };

  const switchRole = async (newRole) => {
    setRole(newRole);
    await AuthStorage.setItemAsync('feedforward_user_role', newRole);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    setAuthToken(null);
    setUser(null);
    setProfile(null);
    setRole('NGO');
    await AuthStorage.deleteItemAsync('feedforward_user_role').catch(() => {});
    await AuthStorage.deleteItemAsync('feedforward_user_info').catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        profile,
        loading,
        login,
        verifyLoginOtp,
        register,
        logout,
        refreshProfile,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
