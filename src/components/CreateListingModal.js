import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/client';

const CATEGORIES = [
  { id: 'Cooked Food', label: 'Cooked Meal', type: 'COOKED_MEAL', defaultUnit: 'servings', icon: 'food-drumstick' },
  { id: 'Raw Ingredients', label: 'Raw Grains & Pulses', type: 'RAW_INGREDIENT', defaultUnit: 'kg', icon: 'barley' },
  { id: 'Bakery', label: 'Bakery & Bread', type: 'BAKERY', defaultUnit: 'servings', icon: 'bread-slice' },
  { id: 'Fresh Produce', label: 'Fresh Veggies & Fruits', type: 'PRODUCE', defaultUnit: 'kg', icon: 'carrot' },
];

const SAFE_WINDOWS = [
  { hours: 2, label: '2 Hours (Hot)' },
  { hours: 4, label: '4 Hours' },
  { hours: 12, label: '12 Hours (Today)' },
  { hours: 24, label: '24 Hours' },
  { hours: 72, label: '3 Days' },
  { hours: 168, label: '7 Days (Dry Goods)' },
];

export default function CreateListingModal({ visible, onClose, onSuccess }) {
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('30');
  const [unit, setUnit] = useState('servings');
  const [safeHours, setSafeHours] = useState(3);
  const [isVeg, setIsVeg] = useState(true);
  const [storageNotes, setStorageNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectCategory = (cat) => {
    setSelectedCat(cat);
    setUnit(cat.defaultUnit);
    if (cat.id === 'Raw Ingredients') {
      setSafeHours(168); // 7 days
      setStorageNotes('Dry ambient storage. Keep away from moisture.');
    } else if (cat.id === 'Cooked Food') {
      setSafeHours(3);
      setStorageNotes('Hot cooked food. Carry insulated thermal crates.');
    } else if (cat.id === 'Bakery') {
      setSafeHours(18);
      setStorageNotes('Ambient dry storage. Cardboard crates suitable.');
    } else {
      setSafeHours(48);
      setStorageNotes('Cool ambient or ventilated crates.');
    }
  };

  const handleSubmit = async () => {
    if (!foodName.trim()) {
      Alert.alert('Required', 'Please enter a name for the surplus food or item.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid portion or quantity amount.');
      return;
    }

    setLoading(true);
    try {
      await api.createRestaurantListing({
        foodName: foodName.trim(),
        category: selectedCat.id,
        itemType: selectedCat.type,
        quantityUnit: unit,
        totalServings: qty,
        safeUntilHours: safeHours,
        isVeg,
        dietary: isVeg ? ['Pure Veg'] : ['Non-Veg'],
        storageInstructions: storageNotes.trim() || 'Carry clean food containers.',
        imageUrl: selectedCat.id === 'Cooked Food'
          ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80'
          : selectedCat.id === 'Raw Ingredients'
          ? 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80'
          : selectedCat.id === 'Bakery'
          ? 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=80',
      });

      Alert.alert('Posted to Live Feed!', 'Surplus item has been broadcast to nearby NGOs in real time.');
      setFoodName('');
      onSuccess?.();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not post listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback accessible={false}>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerTitle}>Post Surplus Food</Text>
                  <Text style={styles.headerSub}>Broadcast instantly to local verified NGOs</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formScroll}
                keyboardShouldPersistTaps="handled"
              >
                {/* Category Selector */}
                <Text style={styles.fieldLabel}>Category / Item Type</Text>
                <View style={styles.catRow}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCat.id === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catCard, isSelected && styles.selectedCatCard]}
                        activeOpacity={0.8}
                        onPress={() => handleSelectCategory(cat)}
                      >
                        <MaterialCommunityIcons
                          name={cat.icon}
                          size={20}
                          color={isSelected ? '#ea580c' : '#6b7280'}
                        />
                        <Text style={[styles.catText, isSelected && styles.selectedCatText]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Food Name */}
                <Text style={styles.fieldLabel}>Item / Dish Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Vegetable Pulav, Rice Bags, Fresh Sourdough..."
                  placeholderTextColor="#9ca3af"
                  value={foodName}
                  onChangeText={setFoodName}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                {/* Quantity and Unit */}
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.fieldLabel}>Quantity</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="30"
                      keyboardType="numeric"
                      value={quantity}
                      onChangeText={setQuantity}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Unit</Text>
                    <View style={styles.unitSelector}>
                      {['servings', 'kg', 'crates'].map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[styles.unitChip, unit === u && styles.activeUnitChip]}
                          onPress={() => setUnit(u)}
                        >
                          <Text style={[styles.unitText, unit === u && styles.activeUnitText]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Safe Until Window */}
                <Text style={styles.fieldLabel}>Safe Until / Shelf Life</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.windowRow}>
                  {SAFE_WINDOWS.map((sw) => (
                    <TouchableOpacity
                      key={sw.hours}
                      style={[styles.windowChip, safeHours === sw.hours && styles.activeWindowChip]}
                      onPress={() => setSafeHours(sw.hours)}
                    >
                      <Text style={[styles.windowText, safeHours === sw.hours && styles.activeWindowText]}>
                        {sw.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Veg Toggle */}
                <View style={styles.vegRow}>
                  <View>
                    <Text style={styles.fieldLabel}>Pure Vegetarian?</Text>
                    <Text style={styles.subHint}>{isVeg ? 'Vegetarian compliant' : 'Contains non-veg items'}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.vegToggleBtn, isVeg ? styles.vegBtnActive : styles.nonVegBtn]}
                    onPress={() => setIsVeg(!isVeg)}
                  >
                    <Text style={[styles.vegBtnText, isVeg ? { color: '#059669' } : { color: '#dc2626' }]}>
                      {isVeg ? 'VEG' : 'NON-VEG'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Handling Notes */}
                <Text style={styles.fieldLabel}>Handling & Storage Instructions</Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  placeholder="e.g. Bring thermal crates, ambient temperature..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  value={storageNotes}
                  onChangeText={setStorageNotes}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  activeOpacity={0.8}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <View style={styles.submitRow}>
                      <MaterialCommunityIcons name="broadcast" size={20} color="#ffffff" />
                      <Text style={styles.submitText}>Broadcast to Live Feed</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  selectedCatCard: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  catText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  selectedCatText: {
    color: '#ea580c',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  unitChip: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  activeUnitChip: {
    backgroundColor: '#ea580c',
  },
  unitText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4b5563',
  },
  activeUnitText: {
    color: '#ffffff',
  },
  windowRow: {
    gap: 8,
    paddingBottom: 14,
  },
  windowChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  activeWindowChip: {
    backgroundColor: '#111827',
  },
  windowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  activeWindowText: {
    color: '#ffffff',
  },
  vegRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 6,
  },
  subHint: {
    fontSize: 11,
    color: '#9ca3af',
  },
  vegToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  vegBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  nonVegBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  vegBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  submitButton: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
