import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api } from '../../../src/api/client';

export default function DiscoverScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Reservation Modal State
  const [selectedListing, setSelectedListing] = useState(null);
  const [reserveModalVisible, setReserveModalVisible] = useState(false);
  const [portionsToClaim, setPortionsToClaim] = useState(15);
  const [shelterDestination, setShelterDestination] = useState('Asha Kiran Night Shelter, Adugodi');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchListings();
    }, [])
  );

  const fetchListings = async () => {
    try {
      const data = await api.getListings();
      setListings(data);
      setError(null);
    } catch (err) {
      console.warn('Error fetching listings:', err);
      setError('Unable to load listings. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchListings();
  }, []);

  const openReserveModal = (listing) => {
    setSelectedListing(listing);
    setPortionsToClaim(Math.min(15, listing.availableServings));
    setReserveModalVisible(true);
  };

  const handleConfirmReservation = async () => {
    if (!selectedListing) return;
    setIsSubmitting(true);
    try {
      const res = await api.reserveListing(
        selectedListing.id,
        portionsToClaim,
        shelterDestination
      );
      setReserveModalVisible(false);
      Alert.alert(
        'Reservation Confirmed!',
        `Successfully locked ${portionsToClaim} servings from ${selectedListing.restaurant}. Pickup code: ${res.reservation?.pickupCode || 'Generated'}. View in Reservations tab.`,
        [{ text: 'OK', onPress: () => fetchListings() }]
      );
    } catch (err) {
      Alert.alert('Reservation Failed', err.message || 'Could not lock portions. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Left side - Image */}
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <MaterialCommunityIcons name="food" size={24} color="#9ca3af" />
          </View>
        )}
        {item.isUrgent && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>URGENT</Text>
          </View>
        )}
      </View>

      {/* Right side - Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.restaurant} numberOfLines={1}>{item.restaurant}</Text>
          <View style={[styles.vegTag, { borderColor: item.isVeg ? '#10b981' : '#ef4444' }]}>
            <View style={[styles.vegDot, { backgroundColor: item.isVeg ? '#10b981' : '#ef4444' }]} />
          </View>
        </View>

        <Text style={styles.foodName} numberOfLines={2}>{item.foodName}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaBadge}>{item.category}</Text>
          <Text style={styles.metaDot}>•</Text>
          <MaterialCommunityIcons name="map-marker-distance" size={13} color="#6b7280" />
          <Text style={styles.metaText}>{item.distance || '1.5 km'}</Text>
        </View>

        <View style={styles.servingsRow}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={14} color="#10b981" />
          <Text style={styles.servingsText}>
            <Text style={styles.servingsHighlight}>{item.availableServings}</Text> of {item.totalServings} servings left
          </Text>
        </View>

        <View style={styles.timeRow}>
          <MaterialCommunityIcons name="clock-outline" size={13} color="#f59e0b" />
          <Text style={styles.timeText}>{item.remainingHoursText || 'Safe today'}</Text>
        </View>

        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.button}
            onPress={() => openReserveModal(item)}
          >
            <Text style={styles.buttonText}>Claim Portions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Locating nearby surplus food...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#10b981"
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <MaterialCommunityIcons name="food-off" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No surplus listings right now</Text>
            <Text style={styles.emptySubtext}>Check back shortly or expand your pickup radius.</Text>
          </View>
        }
      />

      {/* Split Portion Claim Modal */}
      <Modal
        visible={reserveModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReserveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reserve Surplus Portions</Text>
                <Text style={styles.modalSubtitle}>{selectedListing?.restaurant}</Text>
              </View>
              <TouchableOpacity onPress={() => setReserveModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalFoodName}>{selectedListing?.foodName}</Text>
            <Text style={styles.availableNotice}>
              Total Available: {selectedListing?.availableServings} meals (FeedForward allows portion splitting across NGOs)
            </Text>

            {/* Portion Counter */}
            <Text style={styles.inputLabel}>Servings Your NGO Will Rescue:</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                onPress={() => setPortionsToClaim(Math.max(1, portionsToClaim - 5))}
                style={styles.counterBtn}
              >
                <MaterialCommunityIcons name="minus" size={20} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{portionsToClaim} meals</Text>
              <TouchableOpacity
                onPress={() =>
                  setPortionsToClaim(
                    Math.min(selectedListing?.availableServings || 50, portionsToClaim + 5)
                  )
                }
                style={styles.counterBtn}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Delivery Destination */}
            <Text style={styles.inputLabel}>Intended Shelter / Community Depot:</Text>
            <TextInput
              style={styles.modalInput}
              value={shelterDestination}
              onChangeText={setShelterDestination}
              placeholder="e.g. Asha Kiran Night Shelter, Adugodi"
            />

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setReserveModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmReservation}
                disabled={isSubmitting}
                style={styles.confirmBtn}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Lock & Reserve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
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
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  imageContainer: {
    width: 105,
    height: 125,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f3f4f6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  restaurant: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  vegTag: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  foodName: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaDot: {
    marginHorizontal: 4,
    color: '#d1d5db',
  },
  metaText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 3,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  servingsText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 5,
  },
  servingsHighlight: {
    fontWeight: '700',
    color: '#059669',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#b45309',
    fontWeight: '500',
    marginLeft: 4,
  },
  actionButtonContainer: {
    alignItems: 'flex-end',
  },
  button: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalFoodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  availableNotice: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    minWidth: 90,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});