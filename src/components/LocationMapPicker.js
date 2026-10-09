import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const DEFAULT_POINT = { latitude: 12.9352, longitude: 77.6245 };

export default function LocationMapPicker({ visible, initialPoint, initialAddress = '', onClose, onConfirm }) {
  const [point, setPoint] = useState(initialPoint || DEFAULT_POINT);
  const [address, setAddress] = useState(initialAddress);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPoint(initialPoint || DEFAULT_POINT);
    setAddress(initialAddress || '');
  }, [visible, initialPoint?.latitude, initialPoint?.longitude, initialAddress]);

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const matches = await Location.geocodeAsync(query.trim());
      if (matches.length) {
        setPoint({ latitude: matches[0].latitude, longitude: matches[0].longitude });
        setAddress(query.trim());
      }
    } finally { setBusy(false); }
  };

  const useGps = async () => {
    setBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: result.coords.latitude, longitude: result.coords.longitude };
      setPoint(next);
      const places = await Location.reverseGeocodeAsync(next).catch(() => []);
      if (places[0]) setAddress([places[0].name, places[0].street, places[0].district, places[0].city].filter(Boolean).join(', '));
    } finally { setBusy(false); }
  };

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.screen}>
    <View style={styles.header}><TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="arrow-left" size={24} color="#111827" /></TouchableOpacity><Text style={styles.title}>Choose your location</Text></View>
    <Text style={styles.note}>Interactive map selection is available in the iOS and Android app. Search an address here or use GPS.</Text>
    <View style={styles.search}><TextInput style={styles.input} placeholder="Street, area, or landmark" value={query} onChangeText={setQuery} onSubmitEditing={search} /><TouchableOpacity onPress={search} style={styles.searchButton}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchText}>Search</Text>}</TouchableOpacity></View>
    <View style={styles.coord}><MaterialCommunityIcons name="map-marker" size={22} color="#059669" /><Text style={styles.coordText}>{address || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}</Text></View>
    <TouchableOpacity style={styles.gps} onPress={useGps}><Text style={styles.gpsText}>Use current GPS location</Text></TouchableOpacity>
    <TouchableOpacity style={styles.confirm} onPress={() => { onConfirm({ ...point, address }); onClose(); }}><Text style={styles.confirmText}>Confirm location</Text></TouchableOpacity>
  </SafeAreaView></Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 19, fontWeight: '800', color: '#111827' },
  note: { color: '#64748b', lineHeight: 20, fontSize: 13, marginBottom: 16 },
  search: { flexDirection: 'row', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden' },
  input: { flex: 1, minWidth: 0, padding: 13, color: '#111827', letterSpacing: 0 },
  searchButton: { minWidth: 78, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  searchText: { color: '#fff', fontWeight: '800' },
  coord: { marginTop: 18, borderRadius: 12, backgroundColor: '#f8fafc', padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' },
  coordText: { color: '#334155', fontWeight: '700', flex: 1 },
  gps: { marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: '#ecfdf5', alignItems: 'center' },
  gpsText: { color: '#047857', fontWeight: '700' },
  confirm: { marginTop: 'auto', backgroundColor: '#10b981', borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '800' },
});
