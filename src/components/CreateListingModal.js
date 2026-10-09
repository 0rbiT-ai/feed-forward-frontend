import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

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

export default function CreateListingModal({ visible, onClose, onSuccess, listing = null }) {
  const { profile } = useAuth();
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('30');
  const [unit, setUnit] = useState('servings');
  const [safeHours, setSafeHours] = useState(3);
  const [isVeg, setIsVeg] = useState(true);
  const [storageNotes, setStorageNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imagePreviewUri, setImagePreviewUri] = useState(null);
  const [selectedImageAsset, setSelectedImageAsset] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [imageSourceChooserVisible, setImageSourceChooserVisible] = useState(false);

  const handleSelectCategory = (cat) => {
    setSelectedCat(cat);
    setUnit(cat.defaultUnit);
    setStorageNotes('');
    if (cat.id === 'Raw Ingredients') {
      setSafeHours(168); // 7 days
    } else if (cat.id === 'Cooked Food') {
      setSafeHours(3);
    } else if (cat.id === 'Bakery') {
      setSafeHours(18);
    } else {
      setSafeHours(48);
    }
  };

  // Rehydrate this modal's form whenever it opens or the edited listing changes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!visible) return;
    if (listing) {
      const category = CATEGORIES.find(cat => cat.id === listing.category) || CATEGORIES[0];
      setSelectedCat(category);
      setFoodName(listing.foodName || '');
      setQuantity(String(listing.totalServings || 1));
      setUnit(listing.quantityUnit || category.defaultUnit);
      setSafeHours(Math.max(1, Math.round((new Date(listing.safeUntil) - Date.now()) / 3600000)));
      setIsVeg(Boolean(listing.isVeg));
      setStorageNotes(listing.storageInstructions || '');
      setImageUrl(listing.imageUrl || null);
      setImagePreviewUri(listing.imageUrl || null);
      setSelectedImageAsset(null);
    } else {
      handleSelectCategory(CATEGORIES[0]);
      setFoodName('');
      setQuantity('30');
      setStorageNotes('');
      setImageUrl(null);
      setImagePreviewUri(null);
      setSelectedImageAsset(null);
    }
    setImageUploadError('');
    setImageSourceChooserVisible(false);
  }, [listing, visible]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectImageAsset = async (source) => {
    setImageUploadError('');
    setImageUploading(true);
    try {
      let result;
      if (source === 'camera') {
        if (Platform.OS !== 'web') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) throw new Error('Allow camera access to take an item photo.');
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setImagePreviewUri(asset.uri);
      setSelectedImageAsset(asset);
      setImageUrl(null);
    } catch (error) {
      setImageUploadError(error.message || 'Could not select the photo. Try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!foodName.trim()) {
      Alert.alert('Required', 'Please enter a name for the surplus food or item.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0 || qty > 10000) {
      Alert.alert('Invalid Quantity', 'Enter a quantity between 1 and 10,000.');
      return;
    }
    const customSafeHours = Number(safeHours);
    if (!Number.isInteger(customSafeHours) || customSafeHours < 1 || customSafeHours > 168) {
      Alert.alert('Invalid Safe Until', 'Enter a whole number of hours between 1 and 168.');
      return;
    }
    if (profile?.approvalStatus !== 'APPROVED' || profile?.latitude === null || profile?.longitude === null) {
      Alert.alert(
        'Profile Incomplete',
        'Your restaurant must be approved and have valid GPS coordinates before posting food.'
      );
      return;
    }
    if (imageUploading) return;
    if (!imageUrl && !selectedImageAsset) {
      setImageUploadError(imagePreviewUri
        ? 'Choose the photo again before posting this listing.'
        : 'Add an item photo before posting this listing.');
      return;
    }

    setLoading(true);
    let uploadedPhoto = null;
    try {
      let submittedImageUrl = imageUrl;
      if (selectedImageAsset) {
        setImageUploadError('');
        setImageUploading(true);
        const signedUpload = await api.getCloudinaryUploadSignature();
        const formData = new FormData();
        if (Platform.OS === 'web') {
          const file = selectedImageAsset.file || await fetch(selectedImageAsset.uri).then((response) => response.blob());
          formData.append('file', file, selectedImageAsset.fileName || 'listing-photo.jpg');
        } else {
          formData.append('file', {
            uri: selectedImageAsset.uri,
            type: selectedImageAsset.mimeType || 'image/jpeg',
            name: selectedImageAsset.fileName || 'listing-photo.jpg',
          });
        }
        formData.append('api_key', signedUpload.apiKey);
        formData.append('timestamp', String(signedUpload.timestamp));
        formData.append('folder', signedUpload.folder);
        formData.append('public_id', signedUpload.publicId);
        formData.append('signature', signedUpload.signature);

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(signedUpload.cloudName)}/image/upload`,
          { method: 'POST', body: formData },
        );
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.secure_url || !uploadResult.public_id) {
          throw new Error(uploadResult.error?.message || 'Cloudinary could not upload this photo.');
        }
        uploadedPhoto = { url: uploadResult.secure_url, publicId: uploadResult.public_id };
        submittedImageUrl = uploadResult.secure_url;
      }

      const payload = {
        foodName: foodName.trim(),
        category: selectedCat.id,
        itemType: selectedCat.type,
        quantityUnit: unit,
        totalServings: qty,
        safeUntilHours: customSafeHours,
        isVeg,
        dietary: isVeg ? ['Pure Veg'] : ['Non-Veg'],
        storageInstructions: storageNotes.trim() || null,
        imageUrl: submittedImageUrl,
      };

      if (listing) {
        await api.updateRestaurantListing(listing.id, payload);
        Alert.alert('Listing Updated', 'The surplus item has been updated in the live feed.');
      } else {
        await api.createRestaurantListing(payload);
        Alert.alert('Posted to Live Feed!', 'Surplus item has been broadcast to nearby NGOs in real time.');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      if (uploadedPhoto?.publicId) {
        try {
          await api.deleteCloudinaryUpload(uploadedPhoto.publicId);
        } catch (cleanupError) {
          console.warn('Could not clean up an image after its listing failed to save:', cleanupError.message);
        }
        setImageUrl(null);
      }
      if (selectedImageAsset) {
        setImageUploadError(err.message || 'Could not save the photo. Try again.');
      }
      Alert.alert('Error', err.message || 'Could not post listing.');
    } finally {
      setImageUploading(false);
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
                  <Text style={styles.headerTitle}>{listing ? 'Edit Surplus Listing' : 'Post Surplus Food'}</Text>
                  <Text style={styles.headerSub}>{listing ? 'Update availability, shelf life, or handling details' : 'Broadcast instantly to local verified NGOs'}</Text>
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

                <Text style={styles.fieldLabel}>Item Photo <Text style={styles.requiredMark}>*</Text></Text>
                <View style={styles.photoPickerRow}>
                  <TouchableOpacity
                    style={[styles.photoPickerSquare, imagePreviewUri && styles.photoPickerSquareFilled]}
                    onPress={() => setImageSourceChooserVisible(true)}
                    disabled={imageUploading}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={imagePreviewUri ? 'Change item photo' : 'Add required item photo'}
                  >
                    {imagePreviewUri ? (
                      <>
                        <Image source={{ uri: imagePreviewUri }} style={styles.photoPreview} />
                        <View style={styles.photoCameraBadge}>
                          <MaterialCommunityIcons name="camera" size={15} color="#ffffff" />
                        </View>
                      </>
                    ) : imageUploading ? (
                      <ActivityIndicator color="#ea580c" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="camera-plus-outline" size={25} color="#ea580c" />
                        <Text style={styles.photoPickerText}>Add Image</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <View style={styles.photoHelp}>
                    <Text style={styles.photoHelpTitle}>{imageUploading ? 'Uploading photo…' : imageUrl ? 'Saved to Cloudinary' : selectedImageAsset ? 'Selected — uploads when you post' : 'Take a photo or choose one from your gallery'}</Text>
                    {!!imageUploadError && <Text style={styles.photoError}>{imageUploadError}</Text>}
                  </View>
                </View>

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
                <View style={styles.customHoursRow}>
                  <Text style={styles.customHoursLabel}>Custom:</Text>
                  <TextInput
                    style={styles.customHoursInput}
                    value={String(safeHours)}
                    onChangeText={(value) => setSafeHours(value === '' ? '' : Number.parseInt(value.replace(/\D/g, ''), 10))}
                    keyboardType="number-pad"
                    maxLength={3}
                    selectTextOnFocus
                    accessibilityLabel="Custom safe-until duration in hours"
                  />
                  <Text style={styles.customHoursLabel}>hours</Text>
                </View>

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
                  disabled={loading || imageUploading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <View style={styles.submitRow}>
                      <MaterialCommunityIcons name={listing ? 'content-save' : 'broadcast'} size={20} color="#ffffff" />
                      <Text style={styles.submitText}>{listing ? 'Save Changes' : 'Broadcast to Live Feed'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
              {imageSourceChooserVisible && (
                <View style={styles.photoSourceOverlay}>
                  <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={() => setImageSourceChooserVisible(false)}
                    accessibilityLabel="Close photo source menu"
                  />
                  <View style={styles.photoSourceCard}>
                    <Text style={styles.photoSourceTitle}>Add item photo</Text>
                    <TouchableOpacity
                      style={styles.photoSourceOption}
                      onPress={() => { setImageSourceChooserVisible(false); selectImageAsset('camera'); }}
                    >
                      <MaterialCommunityIcons name="camera-outline" size={21} color="#c2410c" />
                      <Text style={styles.photoSourceOptionText}>Take a photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.photoSourceOption}
                      onPress={() => { setImageSourceChooserVisible(false); selectImageAsset('library'); }}
                    >
                      <MaterialCommunityIcons name="image-multiple-outline" size={21} color="#c2410c" />
                      <Text style={styles.photoSourceOptionText}>Choose from gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoSourceCancel} onPress={() => setImageSourceChooserVisible(false)}>
                      <Text style={styles.photoSourceCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
    position: 'relative',
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
    letterSpacing: 0,
    marginBottom: 14,
  },
  photoPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  photoPickerSquare: { width: 112, height: 112, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#fdba74', borderRadius: 12, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoPickerSquareFilled: { borderStyle: 'solid', borderColor: '#fed7aa', backgroundColor: '#fff' },
  photoPreview: { width: '100%', height: '100%' },
  photoCameraBadge: { position: 'absolute', right: 6, bottom: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' },
  photoPickerText: { color: '#c2410c', fontSize: 11, fontWeight: '800', marginTop: 5 },
  requiredMark: { color: '#dc2626' },
  photoHelp: { flex: 1, minWidth: 0, gap: 8 },
  photoHelpTitle: { color: '#475569', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  photoError: { color: '#b91c1c', fontSize: 10, lineHeight: 14 },
  photoSourceOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, elevation: 20, backgroundColor: 'rgba(15, 23, 42, 0.42)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  photoSourceCard: { width: '100%', maxWidth: 340, backgroundColor: '#ffffff', borderRadius: 18, padding: 18, gap: 9, shadowColor: '#0f172a', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  photoSourceTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  photoSourceOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: 11, backgroundColor: '#fff7ed' },
  photoSourceOptionText: { color: '#334155', fontSize: 14, fontWeight: '700' },
  photoSourceCancel: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8 },
  photoSourceCancelText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
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
    paddingBottom: 8,
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
  customHoursRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  customHoursLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  customHoursInput: { width: 64, paddingHorizontal: 10, paddingVertical: 7, textAlign: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, color: '#111827', fontWeight: '700' },
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
