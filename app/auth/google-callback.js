import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function GoogleOAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const message = {
      type: 'feedforward-google-oauth-callback',
      url: window.location.href,
    };
    if ('BroadcastChannel' in window) {
      const channel = new window.BroadcastChannel('feedforward-google-oauth');
      channel.postMessage(message);
      channel.close();
    }
    const opener = window.opener;
    if (!opener || opener.closed) return;
    opener.postMessage(message, window.location.origin);
    window.close();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={styles.title}>Returning to FeedForward…</Text>
      <Text style={styles.message}>If this tab stays open, switch back to FeedForward to continue.</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace(params.mode === 'register' ? '/auth/register' : '/auth/login')}>
        <Text style={styles.buttonText}>Return to FeedForward</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#fff' },
  title: { marginTop: 16, color: '#111827', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  message: { marginTop: 8, color: '#64748b', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  button: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f1f5f9' },
  buttonText: { color: '#334155', fontWeight: '700' },
});
