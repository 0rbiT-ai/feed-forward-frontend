import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SuccessModal({ visible, title, message, points, primaryLabel = 'Done', secondaryLabel, onPrimary, onSecondary, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}><View style={styles.card}>
        <View style={styles.icon}><MaterialCommunityIcons name="check" size={30} color="#059669" /></View>
        <Text style={styles.title}>{title}</Text><Text style={styles.message}>{message}</Text>
        {points != null && <View style={styles.points}><MaterialCommunityIcons name="star-four-points" size={17} color="#059669" /><Text style={styles.pointsText}>+{points} karma points earned</Text></View>}
        <TouchableOpacity style={styles.primary} onPress={onPrimary || onClose}><Text style={styles.primaryText}>{primaryLabel}</Text></TouchableOpacity>
        {secondaryLabel && <TouchableOpacity style={styles.secondary} onPress={onSecondary}><Text style={styles.secondaryText}>{secondaryLabel}</Text></TouchableOpacity>}
      </View></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
  icon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 21, fontWeight: '800', color: '#111827', textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 21, color: '#64748b', textAlign: 'center', marginTop: 8 },
  points: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#ecfdf5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 16 },
  pointsText: { color: '#047857', fontWeight: '800', fontSize: 13 },
  primary: { alignSelf: 'stretch', minHeight: 48, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondary: { padding: 12 },
  secondaryText: { color: '#475569', fontWeight: '700', fontSize: 14 },
});
