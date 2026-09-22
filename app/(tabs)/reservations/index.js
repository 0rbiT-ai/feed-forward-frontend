import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../../src/api/client';
import NgoOtpModal from '../../../src/components/NgoOtpModal';
import CancelReservationModal from '../../../src/components/CancelReservationModal';

export default function ReservationsScreen() {
  const router = useRouter();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOtp, setSelectedOtp] = useState(null);
  const [selectedCancel, setSelectedCancel] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchReservations();
    }, [])
  );

  const fetchReservations = async () => {
    try {
      const data = await api.getReservations();
      setReservations(data || []);
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.restoTitle}>{item.restaurant}</Text>
          <Text style={styles.foodTitle}>{item.foodName}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>READY FOR PICKUP</Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Locked</Text>
          <Text style={styles.detailValue}>{item.reservedServings} {item.quantityUnit || 'portions'}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Deadline</Text>
          <Text style={[styles.detailValue, { color: '#d97706' }]}>{item.pickupDeadline}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{item.restaurantPhone}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.collectBtn}
          activeOpacity={0.8}
          onPress={() => setSelectedOtp(item)}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={16} color="#ffffff" />
          <Text style={styles.collectBtnText}>Collect Pickup</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.8}
          onPress={() => setSelectedCancel(item)}
        >
          <Text style={styles.cancelBtnText}>Drop Pickup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/discover')}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
          <Text style={styles.navTitle}>Active Pickups</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Fetching active pickups...</Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#10b981']} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="receipt-text-clock-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Active Reservations</Text>
              <Text style={styles.emptySub}>
                Head to the Discover feed to claim surplus meals and generate handover OTPs.
              </Text>
            </View>
          }
        />
      )}

      <NgoOtpModal
        visible={Boolean(selectedOtp)}
        reservation={selectedOtp}
        onClose={() => setSelectedOtp(null)}
      />

      <CancelReservationModal
        visible={Boolean(selectedCancel)}
        reservation={selectedCancel}
        onClose={() => setSelectedCancel(null)}
        onSuccess={fetchReservations}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6b7280',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  restoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  foodTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  codeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  codeBoxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeLabel: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '700',
  },
  codeValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 4,
  },
  tapPill: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tapPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  detailsGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  collectBtn: {
    flex: 2,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  collectBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 30,
  },
});