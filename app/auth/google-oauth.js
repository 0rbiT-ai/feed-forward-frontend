import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Linking, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { setAuthTokens, api } from '../../src/api/client';
import * as AuthStorage from '../../src/storage/authStorage';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5003';
const getRedirectUri = (mode) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'feedforward://auth/google';
  const redirect = new URL('/auth/google-callback', window.location.origin);
  redirect.searchParams.set('mode', mode);
  return redirect.toString();
};

export default function GoogleOAuthScreen() {
  const router = useRouter();
  const { mode: routeMode } = useLocalSearchParams();
  const mode = Array.isArray(routeMode) ? routeMode[0] : routeMode || 'sign-in';
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const handleCallbackUrl = async (url) => {
      try {
        const callback = new URL(url);
        const callbackError = callback.searchParams.get('error');
        if (callbackError) {
          const messages = {
            google_account_not_linked: 'This Google account is not linked to a FeedForward account. Sign in with your FeedForward email and password, then link Google from Profile.',
            google_account_already_linked: 'This Google account is already linked to another FeedForward account.',
            google_account_already_exists: 'A FeedForward account already uses this Google address. Sign in first, then link Google from Profile.',
            feedforward_account_not_verified: 'Verify your FeedForward account email before signing in with Google.',
            feedforward_account_not_found: 'Could not find the signed-in FeedForward account. Sign in again and retry linking Google.',
            google_email_mismatch: 'Choose the Google account that uses the same email address as your FeedForward account.',
            access_denied: 'Google sign-in was cancelled.',
            google_code_missing: 'Google did not return an authorization code.',
          };
          if (mounted) setError(messages[callbackError] || 'Google could not complete this request.');
          return;
        }

        if (mode === 'register') {
          const token = callback.searchParams.get('registrationToken');
          const email = callback.searchParams.get('googleEmail');
          if (!token || !email) throw new Error('Google did not return a valid registration link.');
          await AuthStorage.setItemAsync('feedforward_google_registration_token', token);
          await AuthStorage.setItemAsync('feedforward_google_registration_email', email);
          router.back();
          return;
        }

        if (mode === 'link') {
          if (callback.searchParams.get('linked') !== '1') throw new Error('Google account linking was not completed.');
          router.back();
          return;
        }

        const accessToken = callback.searchParams.get('accessToken');
        if (!accessToken) throw new Error('Google did not return an access token.');
        await setAuthTokens(accessToken, callback.searchParams.get('refreshToken'));
        router.replace('/discover');
      } catch (callbackError) {
        if (mounted) setError(callbackError.message || 'Google sign-in could not be completed.');
      }
    };

    const handleDeepLink = ({ url }) => { void handleCallbackUrl(url); };
    const handleWebMessage = (event) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'feedforward-google-oauth-callback' || typeof event.data.url !== 'string') return;
      void handleCallbackUrl(event.data.url);
    };
    const webChannel = Platform.OS === 'web' && typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new window.BroadcastChannel('feedforward-google-oauth')
      : null;
    if (webChannel) webChannel.onmessage = (event) => {
      if (event.data?.type === 'feedforward-google-oauth-callback' && typeof event.data.url === 'string') void handleCallbackUrl(event.data.url);
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('message', handleWebMessage);
    const startOAuth = async () => {
      try {
        const redirectUri = getRedirectUri(mode);
        let authorizationUrl;
        if (mode === 'link') {
          authorizationUrl = await api.createGoogleLinkSession(redirectUri);
        } else {
          const purpose = mode === 'register' ? 'register' : 'sign-in';
          authorizationUrl = `${apiBaseUrl}/auth/google?purpose=${purpose}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        }
        await Linking.openURL(authorizationUrl);
      } catch (openError) {
        if (mounted) setError(openError.message || 'Could not open Google sign-in.');
      }
    };
    void startOAuth();

    return () => {
      mounted = false;
      subscription.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('message', handleWebMessage);
      webChannel?.close();
    };
  }, [mode, router]);

  const title = mode === 'link' ? 'Link your Google account' : mode === 'register' ? 'Connect Google to registration' : 'Continue with Google';
  const helper = mode === 'link'
    ? 'Choose the Google account you want to link to this FeedForward account.'
    : mode === 'register'
      ? 'Your verified Google address will be linked to the account you create.'
      : 'Google sign-in works for accounts already linked to FeedForward.';

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}><MaterialCommunityIcons name="google" size={40} color="#ffffff" /></View>
      {!error ? <ActivityIndicator size="large" color="#10b981" style={styles.spinner} /> : null}
      <Text style={styles.text}>{error ? 'Google could not continue' : title}</Text>
      <Text style={styles.subtext}>{error || helper}</Text>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backButtonText}>{error ? 'Back' : 'Cancel'}</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 32 },
  iconContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  spinner: { marginBottom: 16 },
  text: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtext: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  backButton: { marginTop: 22, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f1f5f9' },
  backButtonText: { color: '#334155', fontWeight: '700' },
});
