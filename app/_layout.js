import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Redirect, Stack, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { loadAuthToken, subscribeAuthToken } from '../src/api/client';

export default function RootLayout() {
  const segments = useSegments();
  const [authReady, setAuthReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeAuthToken(setHasToken);
    loadAuthToken()
      .then((token) => setHasToken(Boolean(token)))
      .finally(() => setAuthReady(true));
    return unsubscribe;
  }, []);

  const inAuthGroup = segments[0] === 'auth';

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}