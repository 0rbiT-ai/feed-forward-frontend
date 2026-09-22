import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function SwiggyHeader({
  activeSegment = 'discover', // 'discover' | 'reservations' | 'history' | 'impact' | 'restaurant_listings' | 'restaurant_handover' | 'restaurant_history'
  onSelectSegment,
  searchQuery = '',
  onSearchChange,
  isVegOnly = false,
  onToggleVegOnly,
  activeCategory = 'ALL',
  onSelectCategory,
  activeRadius = 25,
  onSelectRadius,
  activeSort = 'distance',
  onSelectSort,
  reservationsCount = 0,
  incomingCount = 0,
  onOpenCreateListing,
}) {
  const router = useRouter();
  const { role, profile } = useAuth();

  const isRestaurant = role === 'RESTAURANT';

  const categories = [
    { id: 'ALL', label: 'ALL' },
    { id: 'Cooked Food', label: 'COOKED MEALS' },
    { id: 'Raw Ingredients', label: 'RAW GRAINS' },
    { id: 'Bakery', label: 'BAKERY' },
    { id: 'Fresh Produce', label: 'PRODUCE' },
  ];

  const radii = [
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 25, label: '25 km' },
    { value: 100, label: 'Anywhere' },
  ];

  return (
    <View style={styles.headerContainer}>
      {/* 1. Location & Profile Top Row (Swiggy Style) */}
      <View style={styles.topRow}>
        <View style={styles.locationContainer}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons
              name={isRestaurant ? 'storefront-outline' : 'charity'}
              size={20}
              color="#10b981"
            />
            <Text style={styles.orgName} numberOfLines={1}>
              {profile?.name || (isRestaurant ? 'Partner Restaurant' : 'Robin Hood Army')}
            </Text>
          </View>
          <Text style={styles.addressText} numberOfLines={1}>
            {profile?.address || profile?.logisticsSetting?.operatingBase || 'Koramangala 5th Block, Bengaluru'}
          </Text>
        </View>

        <View style={styles.topRightActions}>
          {/* Swiggy Circular Profile Button on Top Right */}
          <TouchableOpacity
            style={styles.profileAvatarButton}
            activeOpacity={0.8}
            onPress={() => router.push('/profile')}
          >
            <MaterialCommunityIcons name="account-circle" size={32} color="#10b981" />
            <View style={styles.karmaBadge}>
              <Text style={styles.karmaText}>{profile?.karmaScore ?? 100}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Swiggy-Style 4-Card Segmented Bar */}
      <View style={styles.segmentedRow}>
        {!isRestaurant ? (
          // NGO Cards
          <>
            <TouchableOpacity
              style={[styles.serviceCard, activeSegment === 'discover' && styles.activeServiceCard]}
              activeOpacity={0.8}
              onPress={() => onSelectSegment('discover')}
            >
              <View style={[styles.cardIconCircle, activeSegment === 'discover' && styles.activeIconCircle]}>
                <MaterialCommunityIcons
                  name="silverware-fork-knife"
                  size={20}
                  color={activeSegment === 'discover' ? '#ffffff' : '#10b981'}
                />
              </View>
              <Text style={[styles.serviceCardTitle, activeSegment === 'discover' && styles.activeCardTitle]}>
                Surplus
              </Text>
              <Text style={styles.serviceCardSub}>Live Feed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serviceCard, activeSegment === 'reservations' && styles.activeServiceCard]}
              activeOpacity={0.8}
              onPress={() => onSelectSegment('reservations')}
            >
              {reservationsCount > 0 && (
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{reservationsCount}</Text>
                </View>
              )}
              <View style={[styles.cardIconCircle, activeSegment === 'reservations' && styles.activeIconCircle]}>
                <MaterialCommunityIcons
                  name="shield-key"
                  size={20}
                  color={activeSegment === 'reservations' ? '#ffffff' : '#f59e0b'}
                />
              </View>
              <Text style={[styles.serviceCardTitle, activeSegment === 'reservations' && styles.activeCardTitle]}>
                Pickups
              </Text>
              <Text style={styles.serviceCardSub}>In-App OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serviceCard, activeSegment === 'history' && styles.activeServiceCard]}
              activeOpacity={0.8}
              onPress={() => onSelectSegment('history')}
            >
              <View style={[styles.cardIconCircle, activeSegment === 'history' && styles.activeIconCircle]}>
                <MaterialCommunityIcons
                  name="history"
                  size={20}
                  color={activeSegment === 'history' ? '#ffffff' : '#6366f1'}
                />
              </View>
              <Text style={[styles.serviceCardTitle, activeSegment === 'history' && styles.activeCardTitle]}>
                History
              </Text>
              <Text style={styles.serviceCardSub}>Rescues</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serviceCard, activeSegment === 'impact' && styles.activeServiceCard]}
              activeOpacity={0.8}
              onPress={() => onSelectSegment('impact')}
            >
              <View style={[styles.cardIconCircle, activeSegment === 'impact' && styles.activeIconCircle]}>
                <MaterialCommunityIcons
                  name="leaf"
                  size={20}
                  color={activeSegment === 'impact' ? '#ffffff' : '#059669'}
                />
              </View>
              <Text style={[styles.serviceCardTitle, activeSegment === 'impact' && styles.activeCardTitle]}>
                Impact
              </Text>
              <Text style={styles.serviceCardSub}>Karma/CO2</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Restaurant Cards
          <>
            <TouchableOpacity
              style={[styles.serviceCard, activeSegment === 'restaurant_listings' && styles.activeServiceCard]}
              activeOpacity={0.8}
              onPress={() => onSelectSegment('restaurant_listings')}
            >
              <View style={[styles.cardIconCircle, activeSegment === 'restaurant_listings' && styles.activeIconCircle]}>
                <MaterialCommunityIcons
                  name="storefront"
                  size={20}
                  color={activeSegment === 'restaurant_listings' ? '#ffffff' : '#ea580c'}
                />
              </View>
              <Text style={[styles.serviceCardTitle, activeSegment === 'restaurant_listings' && styles.activeCardTitle]}>
                Listings
              </Text>
              <Text style={styles.serviceCardSub}>My Surplus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serviceCard, activeSegment === 'restaurant_handover' && styles.activeServiceCard]}
              activeOpacity={0.8}
              onPress={() => onSelectSegment('restaurant_handover')}
            >
              {incomingCount > 0 && (
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{incomingCount}</Text>
                </View>
              )}
              <View style={[styles.cardIconCircle, activeSegment === 'restaurant_handover' && styles.activeIconCircle]}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={20}
                  color={activeSegment === 'restaurant_handover' ? '#ffffff' : '#10b981'}
                />
              </View>
              <Text style={[styles.serviceCardTitle, activeSegment === 'restaurant_handover' && styles.activeCardTitle]}>
                Handover
              </Text>
              <Text style={styles.serviceCardSub}>Verify OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serviceCard, activeSegment === 'restaurant_history' && styles.activeServiceCard]}
              activeOpacity={0.8}
              onPress={() => onSelectSegment('restaurant_history')}
            >
              <View style={[styles.cardIconCircle, activeSegment === 'restaurant_history' && styles.activeIconCircle]}>
                <MaterialCommunityIcons
                  name="receipt"
                  size={20}
                  color={activeSegment === 'restaurant_history' ? '#ffffff' : '#6366f1'}
                />
              </View>
              <Text style={[styles.serviceCardTitle, activeSegment === 'restaurant_history' && styles.activeCardTitle]}>
                Donations
              </Text>
              <Text style={styles.serviceCardSub}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serviceCard, styles.postNewCard]}
              activeOpacity={0.8}
              onPress={onOpenCreateListing}
            >
              <View style={[styles.cardIconCircle, { backgroundColor: '#ea580c' }]}>
                <MaterialCommunityIcons name="plus" size={20} color="#ffffff" />
              </View>
              <Text style={[styles.serviceCardTitle, { color: '#ea580c' }]}>+ Post</Text>
              <Text style={styles.serviceCardSub}>Surplus</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 3. Swiggy Search Bar + VEG Switch (Shown in Discovery / Listings views) */}
      {(activeSegment === 'discover' || activeSegment === 'restaurant_listings') && (
        <>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search 'Biryani', 'Raw Rice', 'Produce'..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={onSearchChange}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => onSearchChange('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            {/* Swiggy VEG Toggle */}
            <TouchableOpacity
              style={[styles.vegSwitch, isVegOnly && styles.vegSwitchActive]}
              activeOpacity={0.8}
              onPress={onToggleVegOnly}
            >
              <Text style={[styles.vegLabel, isVegOnly && styles.vegLabelActive]}>VEG</Text>
              <View style={[styles.vegIndicatorOuter, { borderColor: isVegOnly ? '#10b981' : '#9ca3af' }]}>
                <View style={[styles.vegIndicatorDot, { backgroundColor: isVegOnly ? '#10b981' : '#d1d5db' }]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* 4. Swiggy Filter Chips Row with Active Underline Indicator */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryTab, isSelected && styles.activeCategoryTab]}
                  activeOpacity={0.7}
                  onPress={() => onSelectCategory(cat.id)}
                >
                  <Text style={[styles.categoryTabText, isSelected && styles.activeCategoryTabText]}>
                    {cat.id === 'ALL' ? ':: ' : ''}{cat.label}
                  </Text>
                  {isSelected && <View style={styles.activeCategoryUnderline} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 5. Radius and Sort Pill Row */}
          <View style={styles.proximityRow}>
            <View style={styles.radiusGroup}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={15} color="#4b5563" />
              <Text style={styles.radiusLabel}>Radius:</Text>
              {radii.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.radiusPill, activeRadius === r.value && styles.activeRadiusPill]}
                  onPress={() => onSelectRadius(r.value)}
                >
                  <Text style={[styles.radiusPillText, activeRadius === r.value && styles.activeRadiusPillText]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort Toggle */}
            <TouchableOpacity
              style={styles.sortPill}
              activeOpacity={0.7}
              onPress={() => {
                const nextSort = activeSort === 'distance' ? 'expiry' : activeSort === 'expiry' ? 'servings' : 'distance';
                onSelectSort(nextSort);
              }}
            >
              <MaterialCommunityIcons name="sort" size={14} color="#374151" />
              <Text style={styles.sortPillText}>
                {activeSort === 'distance' ? 'Nearest' : activeSort === 'expiry' ? 'Expiring Soon' : 'Most Portions'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingTop: Platform.OS === 'android' ? 8 : 4,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  locationContainer: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    maxWidth: '78%',
  },
  addressText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileAvatarButton: {
    position: 'relative',
  },
  karmaBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  karmaText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  segmentedRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 10,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    position: 'relative',
  },
  activeServiceCard: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  postNewCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#ffedd5',
  },
  cardIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconCircle: {
    backgroundColor: '#1f2937',
  },
  serviceCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  activeCardTitle: {
    color: '#ffffff',
  },
  serviceCardSub: {
    fontSize: 9,
    color: '#9ca3af',
    fontWeight: '500',
  },
  cardBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cardBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  vegSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 10,
    gap: 6,
  },
  vegSwitchActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  vegLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
  },
  vegLabelActive: {
    color: '#059669',
  },
  vegIndicatorOuter: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  vegIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryScroll: {
    paddingHorizontal: 14,
    gap: 16,
    paddingBottom: 4,
  },
  categoryTab: {
    paddingBottom: 6,
    position: 'relative',
  },
  activeCategoryTab: {},
  categoryTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.3,
  },
  activeCategoryTabText: {
    color: '#111827',
  },
  activeCategoryUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#111827',
    borderRadius: 2,
  },
  proximityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  radiusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  radiusLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginRight: 2,
  },
  radiusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  activeRadiusPill: {
    backgroundColor: '#10b981',
  },
  radiusPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4b5563',
  },
  activeRadiusPillText: {
    color: '#ffffff',
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  sortPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
});
