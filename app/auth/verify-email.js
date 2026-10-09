import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api/client';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { challengeId, destination = '' } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.verifyEmail(challengeId, otp);
      Alert.alert(
        'Email verified',
        'Your account is active. Sign in to continue.',
        [{ text: 'Continue', onPress: () => router.replace('/auth/login') }]
      );
    } catch (err) {
      setError(err.message || 'Could not verify your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#374151" />
        </TouchableOpacity>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="mail-check" size={38} color="#059669" />
        </View>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to {destination || 'your email address'}.
        </Text>
        <TextInput
          style={styles.input}
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor="#9ca3af"
          autoComplete="one-time-code"
          textAlign="center"
          letterSpacing={8}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity
          onPress={handleVerify}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Verify Email</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 20, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  iconContainer: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 16 },
  error: { color: '#b91c1c', backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 16 },
  button: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#9ca3af' },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
