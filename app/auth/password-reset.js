import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';

export default function PasswordResetScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState('email');
  const [challengeId, setChallengeId] = useState(null);
  const [destination, setDestination] = useState('');
  const [resetToken, setResetToken] = useState(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRefs = useRef([]);

  const sendCode = async () => {
    if (!identifier.trim()) return setError(channel === 'email' ? 'Enter your email address.' : 'Enter your phone number.');
    setLoading(true); setError(null);
    try {
      const data = await api.requestPasswordReset(identifier.trim().toLowerCase(), channel);
      setChallengeId(data.challengeId); setDestination(data.destination);
    } catch (err) { setError(err.message || 'Could not send reset code.'); }
    finally { setLoading(false); }
  };

  const verifyCode = async () => {
    const code = otp.join('');
    if (code.length !== 6) return setError('Enter the complete 6-digit code.');
    setLoading(true); setError(null);
    try { const data = await api.verifyPasswordReset(challengeId, code); setResetToken(data.resetToken); }
    catch (err) { setError(err.message || 'Invalid or expired code.'); }
    finally { setLoading(false); }
  };

  const completeReset = async () => {
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true); setError(null);
    try { await api.completePasswordReset(resetToken, password); router.replace('/discover'); }
    catch (err) { setError(err.message || 'Could not reset password.'); }
    finally { setLoading(false); }
  };

  const updateOtp = (text, index) => {
    const next = [...otp]; next[index] = text.replace(/[^0-9]/g, '').slice(-1); setOtp(next);
    if (next[index] && index < 5) inputRefs.current[index + 1]?.focus();
  };

  return (
    <SafeAreaView style={styles.safeArea}><View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><MaterialCommunityIcons name="arrow-left" size={22} color="#374151" /></TouchableOpacity>
      <View style={styles.header}><MaterialCommunityIcons name="lock-reset" size={52} color="#10b981" /><Text style={styles.title}>Reset password</Text><Text style={styles.subtitle}>{resetToken ? 'Choose a new password.' : challengeId ? `Enter the code sent to ${destination}` : 'Verify your identity first.'}</Text></View>
      {!challengeId && <>
        <TextInput style={styles.input} placeholder={channel === 'email' ? 'Email address' : 'Phone number'} placeholderTextColor="#9ca3af" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" keyboardType={channel === 'email' ? 'email-address' : 'phone-pad'} />
        <View style={styles.channelRow}>{['email', 'phone'].map((item) => <TouchableOpacity key={item} onPress={() => setChannel(item)} style={[styles.channel, channel === item && styles.channelSelected]}><Text style={channel === item ? styles.selectedText : styles.channelText}>{item === 'email' ? 'Email' : 'Phone'}</Text></TouchableOpacity>)}</View>
        <TouchableOpacity onPress={sendCode} style={styles.actionButton} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Send reset code</Text>}</TouchableOpacity>
      </>}
      {challengeId && !resetToken && <><View style={styles.otpRow}>{otp.map((digit, index) => <TextInput key={index} ref={(ref) => (inputRefs.current[index] = ref)} style={styles.otpBox} value={digit} onChangeText={(text) => updateOtp(text, index)} keyboardType="number-pad" maxLength={1} />)}</View><TouchableOpacity onPress={verifyCode} style={styles.actionButton} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Verify code</Text>}</TouchableOpacity></>}
      {resetToken && <><TextInput style={styles.input} placeholder="New password" placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword} secureTextEntry /><TouchableOpacity onPress={completeReset} style={styles.actionButton} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Set new password</Text>}</TouchableOpacity></>}
      {error && <Text style={styles.error}>{error}</Text>}
    </View></SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: '#fff' }, container: { flex: 1, paddingHorizontal: 24 }, backButton: { marginTop: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }, header: { alignItems: 'center', paddingVertical: 40 }, title: { fontSize: 26, fontWeight: '800', color: '#111827', marginTop: 12 }, subtitle: { color: '#6b7280', textAlign: 'center', marginTop: 8 }, input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 15, fontSize: 15, color: '#111827' }, channelRow: { flexDirection: 'row', gap: 10, marginTop: 12 }, channel: { flex: 1, alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10 }, channelSelected: { borderColor: '#10b981', backgroundColor: '#ecfdf5' }, channelText: { color: '#6b7280' }, selectedText: { color: '#059669', fontWeight: '700' }, otpRow: { flexDirection: 'row', justifyContent: 'space-between' }, otpBox: { width: 46, height: 56, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, textAlign: 'center', fontSize: 22 }, actionButton: { backgroundColor: '#10b981', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 }, actionText: { color: '#fff', fontWeight: '700' }, error: { color: '#b91c1c', marginTop: 16, textAlign: 'center' } });
