import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api } from '../../../src/api/client';

export default function ReservationsScreen({ navigation }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      fetchReservations();
    }, [])
  );

  const fetchReservations = async () => {
    try {
      const data = await api.getReservations();
      setReservations(data);
    } catch (err) {
      console.warn('Error fetching reservations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const handleCompletePickup = (reservation) => {
    Alert.alert(
      'Verify & Complete Pickup',
      `Confirming handover from ${reservation.restaurant} with Pickup Code #${reservation.pickupCode}? This will log the rescued meals to your NGO impact report.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Pickup',
          onPress: async () => {
            setCompletingId(reservation.id);
            try {
              await api.completeReservation(reservation.id);
              Alert.alert('Pickup Complete!', 'Impact logged successfully. View your updated stats in History and Profile.');
              fetchReservations();
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not complete pickup.');
            } finally {
              setCompletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.reservationInfo}>
        <View style={styles.reservationHeader}>
          <Text style={styles.restaurant}>{item.restaurant}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <Text style={styles.foodName}>{item.foodName}</Text>

        {/* Pickup Code Box - Critical Feature from Architecture */}
        <View style={styles.codeContainer}>
          <View style={styles.codeLabelRow}>
            <MaterialCommunityIcons name="shield-key" size={16} color="#059669" />
            <Text style={styles.codeLabel}>Handover Verification Code</Text>
          </View>
          <Text style={styles.codeValue}>{item.pickupCode}</Text>
          <Text style={styles.codeInstruction}>Show this code to restaurant staff at pickup dock</Text>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="food-takeout-box" size={16} color="#10b981" />
            <Text style={styles.detailText}>{item.reservedServings} portions locked</Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="clock-alert-outline" size={16} color="#f59e0b" />
            <Text style={styles.detailText}>Pickup by: {item.pickupDeadline}</Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="phone-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{item.restaurantPhone}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleCompletePickup(item)}
            disabled={completingId === item.id}
            style={styles.completeButton}
          >
            {completingId === item.id ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#ffffff" />
                <Text style={styles.buttonText}>Complete Pickup</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Fetching active reservations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reservations}
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
            <MaterialCommunityIcons name="clipboard-check-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No active pickups pending</Text>
            <Text style={styles.emptySubtitle}>
              Head over to the Discover tab to claim nearby surplus food.
            </Text>
          </View>
        }
      />
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
    paddingVertical: 14,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  reservationInfo: {
    flex: 1,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  restaurant: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  foodName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  codeContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  codeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    textTransform: 'uppercase',
  },
  codeValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#047857',
    marginVertical: 4,
  },
  codeInstruction: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  detailsGrid: {
    gap: 6,
    marginBottom: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#4b5563',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});