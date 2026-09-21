import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Linking, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { setAuthToken } from '../../src/api/client';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5003';

/**
 * Google OAuth Screen
 *
 * NOTE: expo-google-sign-in is deprecated in Expo SDK 49+.
 * The correct approach for Google auth in Expo is:
 *   - expo-auth-session (web OAuth flow)
 *   - OR Google Identity Services via WebView
 *   - OR backend redirect via /auth/google endpoint
 *
 * For the mobile NGO app, the backend /auth/google endpoint handles
 * the full OAuth redirect flow via a WebBrowser session.
 * This screen shows a loading state and the backend does the actual auth.
 */
export default function GoogleOAuthScreen() {
  const router = useRouter();
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const handleDeepLink = ({ url }) => {
      try {
        const callback = new URL(url);
        const accessToken = callback.searchParams.get('accessToken');
        if (!accessToken) throw new Error('Google did not return an access token');
        setAuthToken(accessToken);
        router.replace('/discover');
      } catch (callbackError) {
        if (mounted) setError(callbackError.message);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    Linking.openURL(`${apiBaseUrl}/auth/google?redirect_uri=${encodeURIComponent('feedforward://auth/google')}`)
      .catch((openError) => mounted && setError(openError.message));

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (error) Alert.alert('Google sign-in failed', error, [{ text: 'Back', onPress: () => router.replace('/auth/login') }]);
  }, [error, router]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="google" size={40} color="#ffffff" />
      </View>
      <ActivityIndicator size="large" color="#10b981" style={styles.spinner} />
      <Text style={styles.text}>{error ? 'Unable to connect to Google' : 'Connecting to Google...'}</Text>
      <Text style={styles.subtext}>
        {error || 'Complete sign-in in your browser to continue.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});