import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function NgoOtpModal({ visible, reservation, onClose }) {
  if (!reservation) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SHOW TO RESTAURANT</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Handover Verification Code</Text>
          <Text style={styles.subtitle}>
            Read out or display this 4-digit code to the restaurant manager at pickup dock.
          </Text>

          {/* Large In-App OTP Card */}
          <View style={styles.otpBox}>
            <MaterialCommunityIcons name="shield-key" size={32} color="#059669" />
            <Text style={styles.otpText}>{reservation.pickupCode}</Text>
            <Text style={styles.codeNote}>Code ID: {reservation.id}</Text>
          </View>

          {/* Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Restaurant:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{reservation.restaurant}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Food Item:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{reservation.foodName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Portions Locked:</Text>
              <Text style={styles.detailValue}>{reservation.reservedServings} {reservation.quantityUnit || 'servings'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pickup Deadline:</Text>
              <Text style={[styles.detailValue, { color: '#f59e0b', fontWeight: '800' }]}>
                {reservation.pickupDeadline}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Instructions:</Text>
              <Text style={styles.instructionText}>{reservation.pickupInstructions}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={styles.doneBtnText}>Close Code Window</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  otpBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#bbf7d0',
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 18,
  },
  otpText: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 8,
    color: '#047857',
    marginTop: 4,
  },
  codeNote: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  detailsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    maxWidth: '65%',
  },
  instructionText: {
    fontSize: 11,
    color: '#4b5563',
    maxWidth: '65%',
    textAlign: 'right',
  },
  doneBtn: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
