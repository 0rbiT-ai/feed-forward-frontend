import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Redirect, Stack, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { loadAuthToken, subscribeAuthToken, api, getAuthToken } from '../src/api/client';
import { AuthProvider } from '../src/context/AuthContext';

function RootNavigation() {
  const segments = useSegments();
  const [authReady, setAuthReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  const registerPushToken = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      if (token) await api.registerDeviceToken(token);
    } catch (error) {
      console.warn('Push token registration skipped:', error.message);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeAuthToken(setHasToken);
    loadAuthToken()
      .then((token) => {
        // Another startup request may have already rejected and cleared an
        // expired token while this storage read was still resolving.
        const activeToken = token && getAuthToken() === token;
        setHasToken(Boolean(activeToken));
        if (activeToken && Platform.OS !== 'web') registerPushToken();
      })
      .finally(() => setAuthReady(true));
    return unsubscribe;
  }, []);

  const inAuthGroup = segments[0] === 'auth';

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
      {!authReady ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : !hasToken && !inAuthGroup ? (
        <Redirect href="/auth/welcome" />
      ) : hasToken && inAuthGroup ? (
        <Redirect href="/discover" />
      ) : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
