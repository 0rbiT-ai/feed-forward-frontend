import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const getWebStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const getItemAsync = async (key) => {
  if (Platform.OS === 'web') return getWebStorage()?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
};

export const setItemAsync = async (key, value) => {
  if (Platform.OS === 'web') {
    getWebStorage()?.setItem(key, value);
    return;
  }
  return SecureStore.setItemAsync(key, value);
};

export const deleteItemAsync = async (key) => {
  if (Platform.OS === 'web') {
    getWebStorage()?.removeItem(key);
    return;
  }
  return SecureStore.deleteItemAsync(key);
};
