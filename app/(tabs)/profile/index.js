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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { api } from '../../../src/api/client';
import LocationPicker from '../../../src/components/LocationPicker';

export default function ProfileScreen({ navigation }) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);

  // Form edit states
  const [editedName, setEditedName] = useState('');
  const [editedOperatingBase, setEditedOperatingBase] = useState('');
  const [editedRadius, setEditedRadius] = useState('8');
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
      setEditedName(data.name || '');
      setEditedOperatingBase(data.logisticsSetting?.operatingBase || '');
      setEditedRadius(String(data.logisticsSetting?.defaultRadiusKm || '8'));
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
        defaultRadiusKm: parseFloat(editedRadius) || 8,
      });
      setEditMode(false);
      Alert.alert('Success', 'Profile details updated.');
      fetchProfile();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLocationFromMap = async (locationData) => {
    try {
      await api.updateProfile({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        operatingBase: locationData.operatingBase,
        defaultRadiusKm: locationData.defaultRadiusKm,
      });
      Alert.alert(
        'Map Location Synced',
        `Coordinates updated (${locationData.latitude.toFixed(4)}° N, ${locationData.longitude.toFixed(4)}° E). Redis Geo index and PostGIS radius refreshed to ${locationData.defaultRadiusKm} km.`
      );
      fetchProfile();
    } catch (err) {
      Alert.alert('Error', 'Failed to update map coordinates.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await api.logout();
          router.replace('/auth/welcome');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading NGO profile...</Text>
      </View>
    );
  }

  if (!profile) return null;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollViewContent}
      showsVerticalScrollIndicator={false}
    >
      {!editMode ? (
        <>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons name="account-group" size={44} color="#059669" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileTagline}>{profile.tagline}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.verificationBadge}>
                  <MaterialCommunityIcons name="shield-check" size={14} color="#059669" />
                  <Text style={styles.verificationText}>NGO Darpan ID: {profile.darpanId}</Text>
                </View>
                <View style={styles.taxBadge}>
                  <Text style={styles.taxText}>{profile.taxExemption}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Impact Statistics Section */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Verified Rescue Impact</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {profile.impactStats?.totalMealsRescued?.toLocaleString() || '3,420'}
                </Text>
                <Text style={styles.statLabel}>Meals Rescued</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  +{profile.impactStats?.foodWastePreventedKg?.toLocaleString() || '1,710'} kg
                </Text>
                <Text style={styles.statLabel}>Waste Prevented</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  -{profile.impactStats?.co2eAvoidedTonnes || '4.28'}t
                </Text>
                <Text style={styles.statLabel}>CO₂e Avoided</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {profile.impactStats?.activeRestaurantPartners || '28'}
                </Text>
                <Text style={styles.statLabel}>Donor Partners</Text>
              </View>
            </View>
          </View>

          {/* Logistics & Location Section */}
          <View style={styles.statsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.statsSectionTitle}>Logistics & Geographic Range</Text>
              <TouchableOpacity
                onPress={() => setMapPickerVisible(true)}
                style={styles.mapPinButton}
              >
                <MaterialCommunityIcons name="map-marker-radius" size={15} color="#059669" />
                <Text style={styles.mapPinText}>Edit on Map</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setMapPickerVisible(true)}
              style={styles.logisticsItem}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="map-marker" size={22} color="#ef4444" />
              <View style={styles.logisticsInfo}>
                <Text style={styles.logisticsLabel}>Operating Base (Redis Geo Index)</Text>
                <Text style={styles.logisticsValue}>
                  {profile.logisticsSetting?.operatingBase || 'Koramangala Depot'}
                </Text>
                <Text style={styles.coordsSubtext}>
                  Lat: {profile.latitude?.toFixed(4) || '12.9352'}° N, Lng: {profile.longitude?.toFixed(4) || '77.6245'}° E
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <View style={styles.logisticsItem}>
              <MaterialCommunityIcons name="radar" size={22} color="#10b981" />
              <View style={styles.logisticsInfo}>
                <Text style={styles.logisticsLabel}>Proximity Radius</Text>
                <Text style={styles.logisticsValue}>
                  {profile.logisticsSetting?.defaultRadiusKm || 8} km circular boundary
                </Text>
              </View>
            </View>

            <View style={styles.logisticsItem}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={22} color="#6b7280" />
              <View style={styles.logisticsInfo}>
                <Text style={styles.logisticsLabel}>Dispatch Mode</Text>
                <Text style={styles.logisticsValue}>
                  {profile.logisticsSetting?.mode || 'NGO Representative Self-Pickup'}
                </Text>
              </View>
            </View>
          </View>

          {/* Edit Profile Action Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setEditMode(true)}
            style={styles.editButton}
          >
            <MaterialCommunityIcons name="pencil-outline" size={18} color="#ffffff" />
            <Text style={styles.editButtonText}>Edit Details</Text>
          </TouchableOpacity>
        </>
      ) : (
        /* Edit Mode Form */
        <View style={styles.editFormContainer}>
          <Text style={styles.editFormTitle}>Edit Organization Details</Text>

          <View style={styles.editFormGroup}>
            <Text style={styles.editFormLabel}>Organization Name</Text>
            <TextInput
              style={styles.editFormInput}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Enter NGO name"
            />
          </View>

          <View style={styles.editFormGroup}>
            <Text style={styles.editFormLabel}>Operating Depot Address</Text>
            <TextInput
              style={styles.editFormInput}
              value={editedOperatingBase}
              onChangeText={setEditedOperatingBase}
              placeholder="e.g. Koramangala Depot"
            />
          </View>

          <View style={styles.editFormGroup}>
            <Text style={styles.editFormLabel}>Search Radius (km)</Text>
            <TextInput
              style={styles.editFormInput}
              value={editedRadius}
              onChangeText={setEditedRadius}
              keyboardType="numeric"
              placeholder="e.g. 8"
            />
          </View>

          <View style={styles.editFormActions}>
            <TouchableOpacity
              onPress={() => setEditMode(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isSaving}
              style={styles.saveButton}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleLogout}
        style={styles.logoutButton}
      >
        <MaterialCommunityIcons name="logout" size={18} color="#dc2626" />
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Google Maps / Location Picker Modal */}
      <LocationPicker
        visible={mapPickerVisible}
        currentLat={profile.latitude || 12.9352}
        currentLng={profile.longitude || 77.6245}
        currentBaseName={profile.logisticsSetting?.operatingBase || 'Koramangala Depot'}
        currentRadius={profile.logisticsSetting?.defaultRadiusKm || 8}
        onClose={() => setMapPickerVisible(false)}
        onSaveLocation={handleSaveLocationFromMap}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    paddingBottom: 36,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  avatarContainer: {
    backgroundColor: '#d1fae5',
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileTagline: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  verificationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  taxBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  taxText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  mapPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  mapPinText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    width: '48%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  logisticsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  logisticsInfo: {
    flex: 1,
    marginLeft: 12,
  },
  logisticsLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  logisticsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  coordsSubtext: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 12,
  },
  logoutButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
  },
  editFormContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  editFormTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  editFormGroup: {
    marginBottom: 14,
  },
  editFormLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  editFormInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  editFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});