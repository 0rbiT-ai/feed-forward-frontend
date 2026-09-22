import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../../src/api/client';

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const fetchHistory = async () => {
    try {
      const data = await api.getHistory();
      setHistory(data || []);
    } catch (err) {
      console.warn('Error fetching history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const renderItem = ({ item }) => {
    const isCompleted = item.status === 'completed';

    return (
      <View style={styles.card}>
        <View style={styles.historyHeader}>
          <View>
            <Text style={styles.restaurant}>{item.restaurant}</Text>
            <Text style={styles.foodName}>{item.foodName}</Text>
          </View>
          <View style={[styles.statusBadge, isCompleted ? styles.completedBadge : styles.cancelledBadge]}>
            <Text style={[styles.statusText, isCompleted ? styles.completedText : styles.cancelledText]}>
              {isCompleted ? 'COMPLETED' : 'CANCELLED'}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="food-apple" size={15} color="#10b981" />
            <Text style={styles.detailText}>
              <Text style={{ fontWeight: '800' }}>{item.servingsRescued}</Text> {item.quantityUnit || 'portions'}
            </Text>
          </View>
          <Text style={styles.dateText}>{item.completedAt}</Text>
        </View>

        {isCompleted ? (
          <View style={styles.shelterRow}>
            <MaterialCommunityIcons name="home-heart" size={15} color="#6b7280" />
            <Text style={styles.shelterText}>Destination: {item.shelterDelivered || 'Community Shelter'}</Text>
          </View>
        ) : item.cancellationReason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason: {item.cancellationReason}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/discover')}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
          <Text style={styles.navTitle}>Rescue Audit & History</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading rescue history...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#10b981']} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="history" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Rescue Records</Text>
              <Text style={styles.emptySub}>
                Verified handovers and cancellations will be archived here.
              </Text>
            </View>
          }
        />
      )}
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
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  restaurant: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  foodName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedBadge: {
    backgroundColor: '#ecfdf5',
  },
  cancelledBadge: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  completedText: {
    color: '#059669',
  },
  cancelledText: {
    color: '#dc2626',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 12,
    color: '#334155',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  shelterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  shelterText: {
    fontSize: 11,
    color: '#64748b',
  },
  reasonBox: {
    backgroundColor: '#fff1f2',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  reasonLabel: {
    fontSize: 11,
    color: '#9f1239',
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