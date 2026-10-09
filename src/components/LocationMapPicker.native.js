import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Expo Go does not include MapLibre's native modules. Load it only in a custom
// development/production binary so Expo Go can still use address search and GPS.
let MapLibre = null;
if (Constants.executionEnvironment !== 'storeClient') {
  try {
    MapLibre = require('@maplibre/maplibre-react-native');
  } catch (error) {
    console.warn('MapLibre is unavailable in this native build:', error?.message);
  }
}

const DEFAULT_POINT = { latitude: 12.9352, longitude: 77.6245 };
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export default function LocationMapPicker({ visible, initialPoint, initialAddress = '', onClose, onConfirm }) {
  const mapRef = useRef(null);
  const [point, setPoint] = useState(initialPoint || DEFAULT_POINT);
  const [address, setAddress] = useState(initialAddress);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const initialLatitude = initialPoint?.latitude ?? DEFAULT_POINT.latitude;
  const initialLongitude = initialPoint?.longitude ?? DEFAULT_POINT.longitude;

  // Reset the selection when the modal opens so changes made by the caller are reflected.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!visible) return;
    const nextPoint = { latitude: initialLatitude, longitude: initialLongitude };
    setPoint(nextPoint);
    setAddress(initialAddress || '');
    setQuery('');
    mapRef.current?.jumpTo({ center: [nextPoint.longitude, nextPoint.latitude], zoom: 15 });
  }, [visible, initialLatitude, initialLongitude, initialAddress]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const searchAddress = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const matches = await Location.geocodeAsync(query.trim());
      if (matches.length) {
        const nextPoint = { latitude: matches[0].latitude, longitude: matches[0].longitude };
        setPoint(nextPoint);
        setAddress(query.trim());
        mapRef.current?.flyTo({ center: [nextPoint.longitude, nextPoint.latitude], zoom: 15, duration: 350 });
      }
    } finally {
      setBusy(false);
    }
  };

  const useCurrentLocation = async () => {
    setBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextPoint = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setPoint(nextPoint);
      mapRef.current?.flyTo({ center: [nextPoint.longitude, nextPoint.latitude], zoom: 15, duration: 350 });
      const results = await Location.reverseGeocodeAsync(nextPoint).catch(() => []);
      const place = results[0];
      if (place) setAddress([place.name, place.street, place.district, place.city].filter(Boolean).join(', '));
    } finally {
      setBusy(false);
    }
  };

  const confirmPoint = async () => {
    let selectedAddress = address;
    if (!selectedAddress) {
      const results = await Location.reverseGeocodeAsync(point).catch(() => []);
      const place = results[0];
      selectedAddress = place ? [place.name, place.street, place.district, place.city].filter(Boolean).join(', ') : '';
    }
    onConfirm({ ...point, address: selectedAddress });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={22} color="#111827" /></TouchableOpacity>
          <View style={{ flex: 1 }}><Text style={styles.title}>Choose your location</Text><Text style={styles.subtitle}>{MapLibre ? 'Move the pin to your operating address' : 'Search an address or use GPS to set your location'}</Text></View>
        </View>
        <View style={styles.searchRow}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748b" />
          <TextInput style={styles.searchInput} placeholder="Search street, area, or landmark" value={query} onChangeText={setQuery} onSubmitEditing={searchAddress} returnKeyType="search" />
          <TouchableOpacity onPress={searchAddress} disabled={busy} style={styles.searchButton}>{busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchButtonText}>Search</Text>}</TouchableOpacity>
        </View>
        {MapLibre ? (
          <MapLibre.Map
            style={styles.map}
            mapStyle={MAP_STYLE}
            attribution
            logo
            attributionPosition={{ bottom: 8, right: 8 }}
            logoPosition={{ bottom: 8, left: 8 }}
            onPress={(event) => {
              const [longitude, latitude] = event.nativeEvent.lngLat;
              setPoint({ latitude, longitude });
              setAddress('');
            }}
          >
            <MapLibre.Camera
              ref={mapRef}
              initialViewState={{ center: [point.longitude, point.latitude], zoom: 13 }}
            />
            <MapLibre.ViewAnnotation
              lngLat={[point.longitude, point.latitude]}
              draggable
              anchor="bottom"
              onDragEnd={(event) => {
                const [longitude, latitude] = event.nativeEvent.lngLat;
                setPoint({ latitude, longitude });
                setAddress('');
              }}
            >
              <View style={styles.marker}><MaterialCommunityIcons name="map-marker" size={38} color="#059669" /></View>
            </MapLibre.ViewAnnotation>
          </MapLibre.Map>
        ) : (
          <View style={[styles.map, styles.mapFallback]}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={36} color="#059669" />
            <Text style={styles.mapFallbackTitle}>Map preview needs a development build</Text>
            <Text style={styles.mapFallbackText}>You can still search an address or use GPS here.</Text>
          </View>
        )}
        <View style={styles.bottomCard}>
          <View style={styles.addressRow}><MaterialCommunityIcons name="map-marker" size={19} color="#059669" /><Text style={styles.address} numberOfLines={2}>{address || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}</Text></View>
          <TouchableOpacity style={styles.gpsButton} onPress={useCurrentLocation} disabled={busy}><MaterialCommunityIcons name="crosshairs-gps" size={17} color="#047857" /><Text style={styles.gpsText}>Use current location</Text></TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={confirmPoint}><Text style={styles.confirmText}>Confirm location</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, paddingLeft: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', minHeight: 48, gap: 8 },
  searchInput: { flex: 1, minWidth: 0, color: '#111827', fontSize: 14, letterSpacing: 0 },
  searchButton: { alignSelf: 'stretch', minWidth: 68, backgroundColor: '#059669', borderTopRightRadius: 11, borderBottomRightRadius: 11, alignItems: 'center', justifyContent: 'center' },
  searchButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  map: { flex: 1 },
  mapFallback: { alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f1f5f9', gap: 8 },
  mapFallbackTitle: { color: '#334155', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  mapFallbackText: { color: '#64748b', fontSize: 13, textAlign: 'center' },
  marker: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44 },
  bottomCard: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  address: { flex: 1, fontSize: 14, fontWeight: '700', color: '#334155' },
  gpsButton: { minHeight: 42, borderRadius: 10, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  gpsText: { color: '#047857', fontSize: 13, fontWeight: '700' },
  confirmButton: { minHeight: 48, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
