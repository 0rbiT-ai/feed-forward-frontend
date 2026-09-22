import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken, loadAuthToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('NGO'); // 'NGO' | 'RESTAURANT'
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      const token = await loadAuthToken();
      if (token) {
        const savedRole = await SecureStore.getItemAsync('feedforward_user_role');
        const savedUser = await SecureStore.getItemAsync('feedforward_user_info');
        if (savedRole) setRole(savedRole);
        if (savedUser) setUser(JSON.parse(savedUser));

        // Fetch fresh profile from backend
        try {
          const profileData = await api.getProfile();
          if (profileData) {
            setProfile(profileData);
            if (profileData.role) {
              setRole(profileData.role);
              await SecureStore.setItemAsync('feedforward_user_role', profileData.role);
            }
          }
        } catch (pErr) {
          console.warn('Could not refresh profile on launch:', pErr.message);
        }
      }
    } catch (e) {
      console.warn('Auth initialization error:', e);
    } finally {
      setLoading(false);
    }
  };

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
      await SecureStore.setItemAsync('feedforward_user_role', userRole);
      await SecureStore.setItemAsync('feedforward_user_info', JSON.stringify(data.user));
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
      await SecureStore.setItemAsync('feedforward_user_role', userRole);
      await SecureStore.setItemAsync('feedforward_user_info', JSON.stringify(data.user));
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
    await SecureStore.setItemAsync('feedforward_user_role', newRole);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    setAuthToken(null);
    setUser(null);
    setProfile(null);
    setRole('NGO');
    await SecureStore.deleteItemAsync('feedforward_user_role').catch(() => {});
    await SecureStore.deleteItemAsync('feedforward_user_info').catch(() => {});
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
