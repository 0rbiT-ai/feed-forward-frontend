import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api/client';

export default function OtpVerifyScreen() {
  const router = useRouter();
  const { challengeId, channel = 'email', destination = '' } = useLocalSearchParams();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRefs = useRef([]);

  const handleOtpChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (!digit && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) return setError('Enter the complete 6-digit code.');
    setLoading(true);
    setError(null);
    try {
      await api.verifyLoginOtp(challengeId, code);
      router.replace('/discover');
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
      setOtp(['', '', '', '', '', '']);
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
        <View style={styles.header}>
          <View style={styles.iconCircle}><MaterialCommunityIcons name="shield-check" size={36} color="#059669" /></View>
          <Text style={styles.title}>Verify your sign-in</Text>
          <Text style={styles.subtitle}>We sent a one-time code by {channel} to{"\n"}<Text style={styles.highlight}>{destination}</Text></Text>
        </View>
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput key={index} ref={(ref) => (inputRefs.current[index] = ref)} style={styles.otpBox} value={digit} onChangeText={(text) => handleOtpChange(text, index)} keyboardType="number-pad" maxLength={1} selectTextOnFocus />
          ))}
        </View>
        {error && <View style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={16} color="#dc2626" /><Text style={styles.errorText}>{error}</Text></View>}
        <TouchableOpacity onPress={handleVerify} disabled={loading} style={styles.actionButton}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Verify & Sign In</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 24 },
  backButton: { marginTop: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingVertical: 42 },
  iconCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 25, fontWeight: '800', color: '#111827', marginTop: 16 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21, marginTop: 8 },
  highlight: { color: '#059669', fontWeight: '700' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  otpBox: { width: 46, height: 56, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, textAlign: 'center', fontSize: 22, color: '#111827' },
  error: { flexDirection: 'row', gap: 8, backgroundColor: '#fee2e2', padding: 12, borderRadius: 10, marginTop: 20 },
  errorText: { color: '#991b1b', flex: 1 },
  actionButton: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
