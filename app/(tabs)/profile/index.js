import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { role, logout } = useAuth();
  const isRestaurant = role === 'RESTAURANT';

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Form edit states
  const [editedName, setEditedName] = useState('');
  const [editedOperatingBase, setEditedOperatingBase] = useState('');
  const [editedRadius, setEditedRadius] = useState('10');
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [role])
  );

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getProfile();
      setProfile(data);
      setEditedName(data?.name || '');
      setEditedOperatingBase(data?.address || data?.logisticsSetting?.operatingBase || '');
      setEditedRadius(String(data?.logisticsSetting?.defaultRadiusKm || '10'));
    } catch (err) {
      console.warn('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await api.updateProfile({
        name: editedName,
        operatingBase: editedOperatingBase,
        defaultRadiusKm: parseFloat(editedRadius) || 10,
      });
      setEditMode(false);
      Alert.alert('Saved', 'Profile and logistics preferences updated.');
      fetchProfile();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out of FeedForward?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/welcome');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading verified profile...</Text>
      </View>
    );
  }

  const karma = profile?.karmaScore ?? 100;
  const warnings = profile?.warningCount ?? 0;
  const strikes = profile?.strikeCount ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
          <Text style={styles.backBtnText}>Back to Feed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, isRestaurant && { backgroundColor: '#fff7ed' }]}>
              <MaterialCommunityIcons
                name={isRestaurant ? 'storefront' : 'charity'}
                size={38}
                color={isRestaurant ? '#ea580c' : '#10b981'}
              />
            </View>

            <View style={styles.profileMeta}>
              <Text style={styles.nameText}>{profile?.name || (isRestaurant ? 'Partner Kitchen' : 'Robin Hood Army')}</Text>
              <Text style={styles.roleBadge}>
                {isRestaurant ? 'VERIFIED DONOR PARTNER' : 'VERIFIED RESCUE NGO'}
              </Text>
              <Text style={styles.contactText}>{profile?.email || 'user@feedforward.org'}</Text>
              <Text style={styles.contactText}>{profile?.phone || '+91 98765 43210'}</Text>
            </View>
          </View>

          {/* Legal / Certification Badges */}
          <View style={styles.badgesRow}>
            {!isRestaurant ? (
              <>
                <View style={styles.legalBadge}>
                  <MaterialCommunityIcons name="certificate" size={14} color="#059669" />
                  <Text style={styles.legalBadgeText}>{profile?.taxExemption || 'Section 80G Certified'}</Text>
                </View>
                <View style={styles.legalBadge}>
                  <MaterialCommunityIcons name="identifier" size={14} color="#059669" />
                  <Text style={styles.legalBadgeText}>Darpan: {profile?.darpanId || 'KA/2026/019284'}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.legalBadge, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
                  <MaterialCommunityIcons name="shield-check" size={14} color="#c2410c" />
                  <Text style={[styles.legalBadgeText, { color: '#c2410c' }]}>
                    FSSAI: {profile?.fssaiNumber || '11223344556677'}
                  </Text>
                </View>
                <View style={[styles.legalBadge, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={14} color="#c2410c" />
                  <Text style={[styles.legalBadgeText, { color: '#c2410c' }]}>
                    {profile?.cuisineType || 'Multi-Cuisine'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Karma & Reputation Meter */}
        <View style={styles.karmaCard}>
          <View style={styles.karmaTopRow}>
            <View>
              <Text style={styles.karmaTitle}>Platform Trust & Karma</Text>
              <Text style={styles.karmaSub}>Based on on-time pickups and donation reliability</Text>
            </View>
            <View style={styles.karmaCircle}>
              <Text style={styles.karmaScoreNumber}>{karma}</Text>
              <Text style={styles.karmaMax}>/ 100</Text>
            </View>
          </View>

          <View style={styles.meterContainer}>
            <View style={[styles.meterFill, { width: `${Math.min(100, Math.max(10, karma))}%` }]} />
          </View>

          <View style={styles.trustFooterRow}>
            <View style={styles.trustItem}>
              <MaterialCommunityIcons name="check-decagram" size={15} color="#10b981" />
              <Text style={styles.trustItemText}>
                {karma >= 80 ? 'Gold Partner' : karma >= 50 ? 'Active Member' : 'Warning Zone'}
              </Text>
            </View>

            <View style={styles.trustItem}>
              <MaterialCommunityIcons
                name={strikes > 0 ? 'alert-octagon' : 'shield-check-outline'}
                size={15}
                color={strikes > 0 ? '#ef4444' : '#6b7280'}
              />
              <Text style={styles.trustItemText}>
                {strikes === 0 ? '0 Policy Strikes' : `${strikes} Strikes (Limit: 3)`}
              </Text>
            </View>
          </View>
        </View>

        {/* Impact Metrics */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rescue & Sustainability Impact</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#10b981" />
            <Text style={styles.metricNumber}>
              {!isRestaurant ? (profile?.impactStats?.totalMealsRescued ?? 3420) : (profile?.impactStats?.totalMealsDonated ?? 420)}
            </Text>
            <Text style={styles.metricLabel}>{!isRestaurant ? 'Meals Rescued' : 'Meals Donated'}</Text>
          </View>

          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color="#f59e0b" />
            <Text style={styles.metricNumber}>
              {profile?.impactStats?.foodWastePreventedKg ?? 1710} kg
            </Text>
            <Text style={styles.metricLabel}>Food Waste Prevented</Text>
          </View>

          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="molecule-co2" size={24} color="#059669" />
            <Text style={styles.metricNumber}>
              {profile?.impactStats?.co2eAvoidedTonnes ?? 4.28} T
            </Text>
            <Text style={styles.metricLabel}>CO2e Emissions Avoided</Text>
          </View>

          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="handshake-outline" size={24} color="#6366f1" />
            <Text style={styles.metricNumber}>
              {!isRestaurant ? (profile?.impactStats?.activeRestaurantPartners ?? 28) : '15'}
            </Text>
            <Text style={styles.metricLabel}>Active Network Partners</Text>
          </View>
        </View>

        {/* Operating Details & Address */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Operating Logistics & Location</Text>
          {!editMode && (
            <TouchableOpacity onPress={() => setEditMode(true)}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.detailsCard}>
          {editMode ? (
            <View style={styles.editForm}>
              <Text style={styles.inputLabel}>Organization / Kitchen Name</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
              />

              <Text style={styles.inputLabel}>Operating Base / Street Address</Text>
              <TextInput
                style={styles.input}
                value={editedOperatingBase}
                onChangeText={setEditedOperatingBase}
              />

              {!isRestaurant && (
                <>
                  <Text style={styles.inputLabel}>Pickup Radius (km)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editedRadius}
                    onChangeText={setEditedRadius}
                  />
                </>
              )}

              <View style={styles.editBtnRow}>
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={() => setEditMode(false)}
                >
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveEditBtn}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.saveEditText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.readonlyDetails}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color="#6b7280" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Operating Address</Text>
                  <Text style={styles.detailVal}>
                    {profile?.address || profile?.logisticsSetting?.operatingBase || 'Koramangala Community Depot, Bengaluru'}
                  </Text>
                </View>
              </View>

              {!isRestaurant && (
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="radius-outline" size={18} color="#6b7280" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Rescue Coverage Radius</Text>
                    <Text style={styles.detailVal}>{profile?.logisticsSetting?.defaultRadiusKm || 10} km radius</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="google-maps" size={18} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>GPS Coordinates</Text>
                  <Text style={styles.detailVal}>
                    {profile?.latitude ? `${profile.latitude.toFixed(4)}° N, ${profile.longitude?.toFixed(4)}° E` : '12.9352° N, 77.6245° E'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={18} color="#ef4444" />
          <Text style={styles.logoutBtnText}>Sign Out of FeedForward</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6b7280',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMeta: {
    flex: 1,
  },
  nameText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
    marginVertical: 2,
  },
  contactText: {
    fontSize: 12,
    color: '#64748b',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  legalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  legalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  karmaCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  karmaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  karmaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  karmaSub: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    maxWidth: 220,
  },
  karmaCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  karmaScoreNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
  },
  karmaMax: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 2,
  },
  meterContainer: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  trustFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingTop: 10,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  editText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  readonlyDetails: {
    gap: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  editForm: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 6,
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelEditBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  saveEditBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  saveEditText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 6,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dc2626',
  },
});