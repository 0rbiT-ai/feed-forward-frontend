import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/client';

const CANCEL_REASONS = [
  'Vehicle breakdown / Transport delay',
  'Volunteer team unavailable',
  'Shelter destination full / capacity reached',
  'Safety or weather emergency',
  'Accidental reservation',
];

export default function CancelReservationModal({ visible, reservation, onClose, onSuccess }) {
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirmCancel = async () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a reason for dropping this reservation.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.cancelReservation(
        reservation?.id,
        selectedReason,
        notes.trim()
      );

      Alert.alert(
        'Reservation Cancelled',
        `Portions have been restored to the live rescue feed. ${res.penalty || '-15 Karma points applied to reputation.'}`,
        [{ text: 'OK', onPress: () => {
          onSuccess?.();
          onClose();
        }}]
      );
    } catch (err) {
      Alert.alert('Cancellation Error', err.message || 'Could not cancel reservation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.warningIconCircle}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#ef4444" />
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>Drop Reservation</Text>
              <Text style={styles.subtitle}>
                Please specify why your NGO is unable to complete this pickup from {reservation?.restaurant || 'the partner'}.
              </Text>

              {/* Karma Warning Box */}
              <View style={styles.warningBox}>
                <MaterialCommunityIcons name="shield-alert-outline" size={18} color="#b91c1c" />
                <Text style={styles.warningText}>
                  Dropping locked portions incurs a <Text style={{ fontWeight: '800' }}>-15 Karma penalty</Text>. Portions will be immediately returned to the feed for other NGOs.
                </Text>
              </View>

              {/* Reason Selection */}
              <Text style={styles.label}>Select Primary Reason</Text>
              <View style={styles.reasonsList}>
                {CANCEL_REASONS.map((r) => {
                  const isSelected = selectedReason === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.reasonOption, isSelected && styles.selectedReasonOption]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedReason(r)}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.reasonText, isSelected && styles.selectedReasonText]}>{r}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Additional Notes */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.label}>Additional Details (Optional)</Text>
                <TouchableOpacity onPress={Keyboard.dismiss}>
                  <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.notesInput}
                placeholder="Brief explanation for the restaurant partner..."
                placeholderTextColor="#9ca3af"
                value={notes}
                onChangeText={setNotes}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.8}
                onPress={handleConfirmCancel}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.cancelBtnText}>Confirm Cancellation & Release Food</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
    padding: 22,
    width: '100%',
    maxWidth: 390,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  warningText: {
    fontSize: 11,
    color: '#991b1b',
    flex: 1,
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  reasonsList: {
    gap: 6,
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  selectedReasonOption: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  radioCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#ef4444',
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  reasonText: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '500',
  },
  selectedReasonText: {
    color: '#991b1b',
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#111827',
    marginBottom: 16,
  },
  cancelBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
