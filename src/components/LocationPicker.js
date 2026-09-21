import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Known hubs for rapid geographic testing & presets
const POPULAR_HUBS = [
  { name: 'Koramangala 5th Block', lat: 12.9352, lng: 77.6245, area: 'South Bengaluru' },
  { name: 'Indiranagar 100ft Rd', lat: 12.9719, lng: 77.6412, area: 'East Bengaluru' },
  { name: 'HSR Layout Sector 4', lat: 12.9121, lng: 77.6446, area: 'South-East Bengaluru' },
  { name: 'Whitefield ITPL', lat: 12.9850, lng: 77.7310, area: 'East Bengaluru' },
  { name: 'Jayanagar 4th Block', lat: 12.9299, lng: 77.5824, area: 'South Bengaluru' },
  { name: 'MG Road / Brigade Rd', lat: 12.9756, lng: 77.6066, area: 'Central Bengaluru' },
];

export default function LocationPicker({
  visible,
  currentLat = 12.9352,
  currentLng = 77.6245,
  currentBaseName = 'Koramangala Depot',
  currentRadius = 8,
  onClose,
  onSaveLocation,
}) {
  const [selectedLat, setSelectedLat] = useState(currentLat);
  const [selectedLng, setSelectedLng] = useState(currentLng);
  const [baseName, setBaseName] = useState(currentBaseName);
  const [radiusKm, setRadiusKm] = useState(currentRadius);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const handleSelectPreset = (hub) => {
    setSelectedLat(hub.lat);
    setSelectedLng(hub.lng);
    setBaseName(hub.name);
  };

  const handleUseCurrentGPS = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location access is needed to detect your GPS coordinates. Please enable it in Settings.'
        );
        setIsLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      setSelectedLat(parseFloat(latitude.toFixed(6)));
      setSelectedLng(parseFloat(longitude.toFixed(6)));
      setBaseName('Current GPS Location');
    } catch (err) {
      Alert.alert('GPS Error', 'Could not retrieve your location. Try selecting a hub manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleConfirm = () => {
    onSaveLocation({
      latitude: parseFloat(selectedLat),
      longitude: parseFloat(selectedLng),
      operatingBase: baseName,
      defaultRadiusKm: parseFloat(radiusKm),
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Map Location & Proximity</Text>
              <Text style={styles.subtitle}>Set operating base for Redis Geo / PostGIS matching</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Interactive Map Visual Representation */}
            <View style={styles.mapVisualContainer}>
              <View style={styles.mapCanvas}>
                {/* Radar Grid Overlay */}
                <View style={styles.radarCircleOuter} />
                <View style={styles.radarCircleInner} />

                {/* Map Marker Pin */}
                <View style={styles.markerContainer}>
                  <MaterialCommunityIcons name="map-marker" size={40} color="#ef4444" />
                  <View style={styles.markerBadge}>
                    <Text style={styles.markerBadgeText}>NGO Base</Text>
                  </View>
                </View>

                {/* Nearby Restaurant Mock Radar Dots */}
                <View style={[styles.radarDot, { top: 30, left: 50 }]} />
                <View style={[styles.radarDot, { bottom: 40, right: 60 }]} />
                <View style={[styles.radarDot, { top: 60, right: 90 }]} />
              </View>

              {/* Coordinates Pill */}
              <View style={styles.coordPill}>
                <MaterialCommunityIcons name="crosshairs-gps" size={16} color="#10b981" />
                <Text style={styles.coordText}>
                  {selectedLat.toFixed(4)}° N, {selectedLng.toFixed(4)}° E
                </Text>
                <Text style={styles.radiusPillText}>Radius: {radiusKm} km</Text>
              </View>
            </View>

            {/* Base Name Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Operating Base / Address</Text>
              <TextInput
                style={styles.input}
                value={baseName}
                onChangeText={setBaseName}
                placeholder="e.g. Koramangala Community Depot"
              />
            </View>

            {/* Operating Radius Slider / Buttons */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Rescue Proximity Radius</Text>
              <View style={styles.radiusSelector}>
                {[3, 5, 8, 12, 20].map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRadiusKm(r)}
                    style={[styles.radiusBtn, radiusKm === r && styles.radiusBtnActive]}
                  >
                    <Text style={[styles.radiusBtnText, radiusKm === r && styles.radiusBtnTextActive]}>
                      {r} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* GPS Locate Button */}
            <TouchableOpacity
              onPress={handleUseCurrentGPS}
              disabled={isLocating}
              style={styles.gpsButton}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <>
                  <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#10b981" />
                  <Text style={styles.gpsButtonText}>Detect My Current GPS Coordinates</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Quick Hub Presets */}
            <Text style={styles.sectionHeader}>Select from Major Logistics Hubs</Text>
            <View style={styles.hubGrid}>
              {POPULAR_HUBS.map((hub) => {
                const isSelected = selectedLat === hub.lat && selectedLng === hub.lng;
                return (
                  <TouchableOpacity
                    key={hub.name}
                    onPress={() => handleSelectPreset(hub)}
                    style={[styles.hubCard, isSelected && styles.hubCardSelected]}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? 'check-circle' : 'map-marker-outline'}
                      size={18}
                      color={isSelected ? '#10b981' : '#6b7280'}
                    />
                    <View style={styles.hubInfo}>
                      <Text style={[styles.hubName, isSelected && styles.hubNameSelected]}>
                        {hub.name}
                      </Text>
                      <Text style={styles.hubArea}>{hub.area}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  scrollBody: {
    padding: 20,
  },
  mapVisualContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f0fdf4',
  },
  mapCanvas: {
    height: 160,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarCircleOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: 'rgba(167, 243, 208, 0.2)',
  },
  radarCircleInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#6ee7b7',
    backgroundColor: 'rgba(110, 231, 183, 0.3)',
  },
  markerContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  markerBadge: {
    backgroundColor: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: -4,
  },
  markerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  radarDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  coordPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  coordText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
    flex: 1,
  },
  radiusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fafafa',
  },
  radiusSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginHorizontal: 3,
    backgroundColor: '#ffffff',
  },
  radiusBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  radiusBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  radiusBtnTextActive: {
    color: '#ffffff',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
    marginBottom: 20,
  },
  gpsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  hubGrid: {
    gap: 8,
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  hubCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  hubInfo: {
    marginLeft: 10,
    flex: 1,
  },
  hubName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  hubNameSelected: {
    color: '#059669',
  },
  hubArea: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#10b981',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
