import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api, setAuthToken } from '../../src/api/client';

const ROLE_OPTIONS = [
  {
    id: 'NGO',
    label: 'NGO / Volunteer Collective',
    desc: 'Discover surplus food and reserve portions for communities',
    icon: 'account-group',
  },
  {
    id: 'RESTAURANT',
    label: 'Restaurant / Donor',
    desc: 'Post surplus listings and track your food rescue impact',
    icon: 'store',
  },
];

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('NGO');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [darpanId, setDarpanId] = useState('');
  const [address, setAddress] = useState('');
  const [locationCoords, setLocationCoords] = useState({ latitude: 12.9352, longitude: 77.6245 });
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      // Set typical metropolitan default coordinates if permission is skipped
      setLocationCoords({ latitude: 12.9352, longitude: 77.6245 });
      if (!address.trim()) {
        setAddress('Koramangala 5th Block, Bengaluru');
      }
    } catch (e) {
      console.warn('Location detection:', e.message);
    } finally {
      setLocating(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Please fill in your name, email, phone number, and password.');
      return;
    }
    if (selectedRole === 'RESTAURANT' && !fssaiNumber.trim()) {
      setError('FSSAI Food License Number is mandatory for restaurants.');
      return;
    }
    if (selectedRole === 'NGO' && !darpanId.trim()) {
      setError('NGO Darpan ID or Registration Number is mandatory for verification.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (phone.trim().replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role: selectedRole,
        address: address.trim() || 'Bengaluru Central',
        fssaiNumber: fssaiNumber.trim(),
        darpanId: darpanId.trim(),
        latitude: locationCoords.latitude,
        longitude: locationCoords.longitude,
      });
      if (data.accessToken) {
        setAuthToken(data.accessToken);
      }
      router.replace('/discover');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#374151" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="leaf-circle" size={44} color="#10b981" />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the surplus food rescue network</Text>
          </View>

          {/* Role Selection */}
          <Text style={styles.sectionLabel}>I am joining as a:</Text>
          <View style={styles.roleSelector}>
            {ROLE_OPTIONS.map((role) => (
              <TouchableOpacity
                key={role.id}
                onPress={() => setSelectedRole(role.id)}
                style={[
                  styles.roleCard,
                  selectedRole === role.id && styles.roleCardSelected,
                ]}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={role.icon}
                  size={28}
                  color={selectedRole === role.id ? '#059669' : '#9ca3af'}
                />
                <View style={styles.roleText}>
                  <Text
                    style={[
                      styles.roleLabel,
                      selectedRole === role.id && styles.roleLabelSelected,
                    ]}
                  >
                    {role.label}
                  </Text>
                  <Text style={styles.roleDesc}>{role.desc}</Text>
                </View>
                {selectedRole === role.id && (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#059669" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="domain" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={
                  selectedRole === 'NGO'
                    ? 'Organization / Collective Name'
                    : 'Restaurant or Kitchen Name'
                }
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Legal verification input */}
            {selectedRole === 'RESTAURANT' ? (
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#ea580c" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="FSSAI License Number (14 digits)"
                  placeholderTextColor="#9ca3af"
                  value={fssaiNumber}
                  onChangeText={setFssaiNumber}
                  keyboardType="numeric"
                  maxLength={14}
                />
              </View>
            ) : (
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="identifier" size={20} color="#059669" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="NGO Darpan ID (e.g. KA/2026/019284)"
                  placeholderTextColor="#9ca3af"
                  value={darpanId}
                  onChangeText={setDarpanId}
                  autoCapitalize="characters"
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="phone-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone number (Mandatory)"
                placeholderTextColor="#9ca3af"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>

            {/* Address & Location Picker */}
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Street Address / Operating Base"
                placeholderTextColor="#9ca3af"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleDetectLocation}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={16} color="#059669" />
              <Text style={styles.gpsBtnText}>
                {locating ? 'Detecting GPS...' : `GPS Lat/Long: ${locationCoords.latitude.toFixed(4)}, ${locationCoords.longitude.toFixed(4)}`}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Create password (min. 6 characters)"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Register Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleRegister}
            disabled={loading}
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.registerButtonText}>
                Create {selectedRole === 'NGO' ? 'NGO' : 'Restaurant'} Account
              </Text>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  backButton: {
    marginTop: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleSelector: {
    gap: 10,
    marginBottom: 20,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
    gap: 12,
  },
  roleCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  roleText: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 2,
  },
  roleLabelSelected: {
    color: '#065f46',
  },
  roleDesc: {
    fontSize: 11,
    color: '#9ca3af',
    lineHeight: 16,
  },
  form: {
    gap: 12,
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  eyeButton: {
    padding: 4,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    flex: 1,
  },
  registerButton: {
    backgroundColor: '#10b981',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  registerButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
});