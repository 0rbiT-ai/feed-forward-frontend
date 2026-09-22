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

export default function VerifyOtpModal({ visible, reservation, onClose, onSuccess }) {
  const [pickupCode, setPickupCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTextChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPickupCode(cleaned);
    if (cleaned.length === 4) {
      // Finished 4 digits -> automatically close keyboard on iPhone so confirm button is visible!
      Keyboard.dismiss();
    }
  };

  const handleVerify = async () => {
    Keyboard.dismiss();
    if (!pickupCode.trim() || pickupCode.trim().length !== 4) {
      Alert.alert('Required', 'Please enter the 4-digit verification OTP shown on the NGO phone.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyHandoverOtp(reservation?.id, pickupCode.trim());
      Alert.alert(
        'Handover Verified! 🎉',
        `Successfully handed over ${reservation?.reservedServings} ${reservation?.quantityUnit || 'servings'} to ${reservation?.ngoName || 'NGO'}. +10 Karma points added to your restaurant profile!`,
        [{ text: 'Great!', onPress: () => {
          setPickupCode('');
          onSuccess?.();
          onClose();
        }}]
      );
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Invalid code. Please re-check with NGO.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    Keyboard.dismiss();
    setPickupCode('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleModalClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="shield-check" size={26} color="#10b981" />
                </View>
                <TouchableOpacity onPress={handleModalClose} style={styles.closeBtn}>
                  <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>Verify Collection OTP</Text>
              <Text style={styles.subtitle}>
                Enter the 4-digit handover code displayed on {reservation?.ngoName || 'the NGO representative'}'s phone.
              </Text>

              {/* Reservation Summary */}
              {reservation && (
                <View style={styles.summaryBox}>
                  <Text style={styles.foodTitle}>{reservation.foodName}</Text>
                  <Text style={styles.servingsCount}>
                    {reservation.reservedServings} {reservation.quantityUnit || 'portions'} locked
                  </Text>
                  <Text style={styles.ngoInfo}>NGO: {reservation.ngoName}</Text>
                </View>
              )}

              {/* OTP Input */}
              <View style={styles.inputHeaderRow}>
                <Text style={styles.inputLabel}>4-Digit In-App Handover OTP</Text>
                <TouchableOpacity onPress={Keyboard.dismiss} style={styles.doneTouch}>
                  <Text style={styles.doneTouchText}>Done</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.otpInput}
                placeholder="• • • •"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={4}
                value={pickupCode}
                onChangeText={handleTextChange}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              <TouchableOpacity
                style={styles.verifyBtn}
                activeOpacity={0.8}
                onPress={handleVerify}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={styles.btnRow}>
                    <MaterialCommunityIcons name="check-decagram" size={18} color="#ffffff" />
                    <Text style={styles.verifyBtnText}>Confirm Handover & Award Impact</Text>
                  </View>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
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
    marginBottom: 16,
    lineHeight: 18,
  },
  summaryBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  foodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  servingsCount: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  ngoInfo: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  doneTouch: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
  },
  doneTouchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  otpInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 10,
    textAlign: 'center',
    paddingVertical: 12,
    color: '#111827',
    marginBottom: 20,
  },
  verifyBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
