import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo + Brand */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="leaf-circle" size={72} color="#10b981" />
        </View>
        <Text style={styles.title}>FeedForward</Text>
        <Text style={styles.tagline}>Rescue food. Feed communities.</Text>
        <Text style={styles.description}>
          A real-time marketplace connecting restaurants with verified NGOs to
          rescue surplus food before it's wasted.
        </Text>
      </View>

      {/* Feature Highlights */}
      <View style={styles.featuresSection}>
        {[
          {
            icon: 'radar',
            title: 'Live Discovery Feed',
            desc: 'Nearby surplus listings updated in real-time via Redis Geo',
          },
          {
            icon: 'lock-check-outline',
            title: 'Atomic Reservation Lock',
            desc: 'One tap locks your portion — no double-booking',
          },
          {
            icon: 'chart-line',
            title: 'Verified Impact Reports',
            desc: 'Meals rescued, kg waste prevented, CO₂ avoided — all tracked',
          },
        ].map((f) => (
          <View key={f.icon} style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <MaterialCommunityIcons name={f.icon} size={22} color="#059669" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsSection}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/auth/register')}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Get Started — Join as NGO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/auth/login')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Sign In to Your Account</Text>
        </TouchableOpacity>

      </View>

      <Text style={styles.footerText}>
        By continuing you agree to our Terms of Service and Privacy Policy
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 54,
  },
  logoContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  featuresSection: {
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },
  buttonsSection: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  otpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#10b981',
    gap: 8,
  },
  otpButtonText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
  },
});