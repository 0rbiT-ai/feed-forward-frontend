import React, { useState, useEffect, useCallback } from 'react';
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
  SafeAreaView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import io from 'socket.io-client';
import { api } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import SwiggyHeader from '../../../src/components/SwiggyHeader';
import CreateListingModal from '../../../src/components/CreateListingModal';
import VerifyOtpModal from '../../../src/components/VerifyOtpModal';
import NgoOtpModal from '../../../src/components/NgoOtpModal';
import CancelReservationModal from '../../../src/components/CancelReservationModal';

export default function DiscoverScreen() {
  const { role, profile, refreshProfile } = useAuth();
  const isRestaurant = role === 'RESTAURANT';

  // Navigation Segment State
  const [activeSegment, setActiveSegment] = useState('discover');

  // NGO Feed & Filter States
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeRadius, setActiveRadius] = useState(25);
  const [activeSort, setActiveSort] = useState('distance');

  // NGO Reservations State
  const [reservations, setReservations] = useState([]);
  const [selectedOtpReservation, setSelectedOtpReservation] = useState(null);
  const [selectedCancelReservation, setSelectedCancelReservation] = useState(null);

  // NGO History State
  const [historyItems, setHistoryItems] = useState([]);

  // Restaurant Suite States
  const [restaurantListings, setRestaurantListings] = useState([]);
  const [incomingPickups, setIncomingPickups] = useState([]);
  const [donationHistory, setDonationHistory] = useState([]);
  const [restaurantStats, setRestaurantStats] = useState(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [verifyModalReservation, setVerifyModalReservation] = useState(null);

  // NGO Claim Modal State
  const [selectedListing, setSelectedListing] = useState(null);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [portionsToClaim, setPortionsToClaim] = useState(15);
  const [shelterDestination, setShelterDestination] = useState('Asha Kiran Community Shelter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Socket connection
  useEffect(() => {
    const socketUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5003';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('new_listing', () => {
      fetchListings();
      if (isRestaurant) fetchRestaurantData();
    });

    socket.on('listing_updated', () => {
      fetchListings();
      if (isRestaurant) fetchRestaurantData();
    });

    socket.on('pickup_completed', (data) => {
      fetchListings();
      fetchReservations();
      fetchHistory();
      refreshProfile();
      if (isRestaurant) fetchRestaurantData();
    });

    socket.on('reservation_cancelled', () => {
      fetchListings();
      fetchReservations();
      if (isRestaurant) fetchRestaurantData();
    });

    return () => {
      socket.disconnect();
    };
  }, [isRestaurant]);

  // Sync segment with role change
  useEffect(() => {
    if (isRestaurant) {
      if (activeSegment === 'discover') setActiveSegment('restaurant_listings');
    } else {
      if (activeSegment === 'restaurant_listings' || activeSegment === 'restaurant_handover') {
        setActiveSegment('discover');
      }
    }
  }, [isRestaurant]);

  useFocusEffect(
    useCallback(() => {
      if (isRestaurant) {
        fetchRestaurantData();
      } else {
        fetchListings();
        fetchReservations();
        fetchHistory();
      }
      refreshProfile();
    }, [isRestaurant, activeCategory, isVegOnly, activeRadius, activeSort, searchQuery])
  );

  // ------------------------------------------
  // FETCHERS
  // ------------------------------------------
  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = {
        radius: activeRadius * 1000,
        sort: activeSort,
      };
      if (activeCategory !== 'ALL') params.category = activeCategory;
      if (isVegOnly) params.isVeg = 'true';
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await api.getListings(params);
      setListings(data || []);
    } catch (err) {
      console.warn('Error fetching listings:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchReservations = async () => {
    try {
      const data = await api.getReservations();
      setReservations(data || []);
    } catch (err) {
      console.warn('Error fetching reservations:', err.message);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await api.getHistory();
      setHistoryItems(data || []);
    } catch (err) {
      console.warn('Error fetching history:', err.message);
    }
  };

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      const [list, incoming, hist, stats] = await Promise.all([
        api.getRestaurantListings(),
        api.getRestaurantReservations(),
        api.getRestaurantHistory(),
        api.getRestaurantStats(),
      ]);
      setRestaurantListings(list || []);
      setIncomingPickups(incoming || []);
      setDonationHistory(hist || []);
      setRestaurantStats(stats || null);
    } catch (err) {
      console.warn('Error fetching restaurant data:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (isRestaurant) {
      fetchRestaurantData();
    } else {
      fetchListings();
      fetchReservations();
      fetchHistory();
    }
    refreshProfile();
  };

  // ------------------------------------------
  // NGO CLAIM HANDLERS
  // ------------------------------------------
  const openClaimModal = (listing) => {
    if (profile?.approvalStatus === 'SUSPENDED') {
      Alert.alert('Account Suspended', 'Your NGO account is currently suspended due to repeated policy strikes.');
      return;
    }
    setSelectedListing(listing);
    setPortionsToClaim(Math.min(15, listing.availableServings));
    setClaimModalVisible(true);
  };

  const handleConfirmClaim = async () => {
    if (!selectedListing) return;
    setIsSubmitting(true);
    try {
      const res = await api.reserveListing(
        selectedListing.id,
        portionsToClaim,
        shelterDestination
      );
      setClaimModalVisible(false);
      Alert.alert(
        'Portions Reserved! 🍲',
        `Successfully locked ${portionsToClaim} ${selectedListing.quantityUnit || 'servings'} from ${selectedListing.restaurant}.\n\nHandover Code: #${res.reservation?.pickupCode || 'Generated'}. View in your Pickups tab to show to staff.`,
        [
          {
            text: 'View My Pickups',
            onPress: () => {
              setActiveSegment('reservations');
              fetchReservations();
            },
          },
          { text: 'Keep Browsing', onPress: () => fetchListings() },
        ]
      );
    } catch (err) {
      Alert.alert('Reservation Failed', err.message || 'Could not complete reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------------
  // RENDER: NGO SURPLUS FEED CARDS
  // ------------------------------------------
  const renderListingCard = ({ item }) => {
    const isRaw = item.itemType === 'RAW_INGREDIENT';
    const isProduce = item.itemType === 'PRODUCE';
    const isBakery = item.itemType === 'BAKERY';

    return (
      <View style={styles.listingCard}>
        {/* Top Header inside Card */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.restoMeta}>
            <Text style={styles.restoName} numberOfLines={1}>{item.restaurant}</Text>
            <View style={styles.subMetaRow}>
              <MaterialCommunityIcons name="star" size={13} color="#f59e0b" />
              <Text style={styles.karmaBadgeText}>Karma {item.restaurantKarma || 100}</Text>
              <Text style={styles.dot}>•</Text>
              <MaterialCommunityIcons name="map-marker-distance" size={13} color="#6b7280" />
              <Text style={styles.distText}>{item.distance}</Text>
            </View>
          </View>

          {/* Veg / Non-Veg Icon */}
          <View style={[styles.vegBadge, { borderColor: item.isVeg ? '#10b981' : '#ef4444' }]}>
            <View style={[styles.vegDot, { backgroundColor: item.isVeg ? '#10b981' : '#ef4444' }]} />
          </View>
        </View>

        {/* Food Details Row */}
        <View style={styles.cardBodyRow}>
          {/* Left: Info */}
          <View style={styles.cardInfoCol}>
            <View style={styles.categoryPill}>
              <MaterialCommunityIcons
                name={isRaw ? 'barley' : isProduce ? 'carrot' : isBakery ? 'bread-slice' : 'food-drumstick'}
                size={12}
                color="#4b5563"
              />
              <Text style={styles.categoryPillText}>{item.category.toUpperCase()}</Text>
            </View>

            <Text style={styles.foodTitle} numberOfLines={2}>{item.foodName}</Text>

            {/* Portions Remaining Bar */}
            <View style={styles.portionsBox}>
              <MaterialCommunityIcons name="scale" size={15} color="#059669" />
              <Text style={styles.portionsText}>
                <Text style={styles.portionsHighlight}>{item.availableServings}</Text> of {item.totalServings} {item.quantityUnit || 'servings'} available
              </Text>
            </View>

            {/* Safe Until Countdown */}
            <View style={styles.timeBox}>
              <MaterialCommunityIcons name="clock-alert-outline" size={14} color="#d97706" />
              <Text style={styles.timeText}>{item.remainingHoursText}</Text>
            </View>

            {/* Storage Instructions */}
            {item.storageInstructions && (
              <View style={styles.storageBox}>
                <MaterialCommunityIcons name="information-outline" size={13} color="#4b5563" />
                <Text style={styles.storageText} numberOfLines={1}>{item.storageInstructions}</Text>
              </View>
            )}
          </View>

          {/* Right: Image & Urgent Badge */}
          <View style={styles.cardImageCol}>
            <Image
              source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' }}
              style={styles.cardImage}
            />
            {item.isUrgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>
        </View>

        {/* Claim Action Button */}
        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={styles.claimButton}
            activeOpacity={0.8}
            onPress={() => openClaimModal(item)}
          >
            <MaterialCommunityIcons name="hand-pointing-right" size={16} color="#ffffff" />
            <Text style={styles.claimButtonText}>
              Claim Portions ({item.quantityUnit || 'servings'})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ------------------------------------------
  // RENDER: NGO ACTIVE PICKUPS (In-App OTP)
  // ------------------------------------------
  const renderPickupCard = ({ item }) => (
    <View style={styles.pickupCard}>
      <View style={styles.pickupHeader}>
        <View>
          <Text style={styles.pickupResto}>{item.restaurant}</Text>
          <Text style={styles.pickupFood}>{item.foodName}</Text>
        </View>
        <View style={styles.readyBadge}>
          <Text style={styles.readyBadgeText}>READY FOR PICKUP</Text>
        </View>
      </View>

      <View style={styles.pickupMetaGrid}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Portions Locked</Text>
          <Text style={styles.metaVal}>{item.reservedServings} {item.quantityUnit || 'servings'}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Pickup Deadline</Text>
          <Text style={[styles.metaVal, { color: '#d97706' }]}>{item.pickupDeadline}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Restaurant Phone</Text>
          <Text style={styles.metaVal}>{item.restaurantPhone}</Text>
        </View>
      </View>

      <View style={styles.pickupActionsRow}>
        <TouchableOpacity
          style={styles.showCodeBtn}
          activeOpacity={0.8}
          onPress={() => setSelectedOtpReservation(item)}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={16} color="#ffffff" />
          <Text style={styles.showCodeBtnText}>Collect Pickup</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dropBtn}
          activeOpacity={0.8}
          onPress={() => setSelectedCancelReservation(item)}
        >
          <Text style={styles.dropBtnText}>Drop / Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ------------------------------------------
  // RENDER: NGO HISTORY
  // ------------------------------------------
  const renderHistoryCard = ({ item }) => {
    const isCompleted = item.status === 'completed';
    return (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View>
            <Text style={styles.historyResto}>{item.restaurant}</Text>
            <Text style={styles.historyFood}>{item.foodName}</Text>
          </View>
          <View style={[styles.histStatusPill, isCompleted ? styles.completedPill : styles.cancelledPill]}>
            <Text style={[styles.histStatusText, isCompleted ? styles.completedText : styles.cancelledText]}>
              {isCompleted ? 'COMPLETED' : 'CANCELLED'}
            </Text>
          </View>
        </View>

        <View style={styles.histDetailRow}>
          <Text style={styles.histDetailText}>
            {isCompleted ? `Rescued: ${item.servingsRescued} ${item.quantityUnit || 'portions'}` : `Portions: ${item.servingsRescued}`}
          </Text>
          <Text style={styles.histDateText}>{item.completedAt}</Text>
        </View>

        {!isCompleted && item.cancellationReason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Cancellation Reason:</Text>
            <Text style={styles.reasonVal}>{item.cancellationReason}</Text>
          </View>
        )}
      </View>
    );
  };

  // ------------------------------------------
  // RENDER: RESTAURANT SURPLUS LISTINGS
  // ------------------------------------------
  const renderRestaurantListingCard = ({ item }) => (
    <View style={styles.restoListingCard}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.foodTitle}>{item.foodName}</Text>
          <Text style={styles.restoCat}>{item.category} • {item.quantityUnit || 'servings'}</Text>
        </View>
        <View style={[styles.statusPill, item.status === 'ACTIVE' ? styles.activePill : styles.reservedPill]}>
          <Text style={styles.statusPillText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.stockRow}>
        <View style={styles.stockCol}>
          <Text style={styles.stockLabel}>Available</Text>
          <Text style={styles.stockVal}>{item.availableServings} / {item.totalServings}</Text>
        </View>
        <View style={styles.stockCol}>
          <Text style={styles.stockLabel}>Safe Until</Text>
          <Text style={styles.stockVal}>{new Date(item.safeUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <View style={styles.stockCol}>
          <Text style={styles.stockLabel}>Incoming Pickups</Text>
          <Text style={[styles.stockVal, { color: '#059669' }]}>{item.reservations?.length || 0}</Text>
        </View>
      </View>
    </View>
  );

  // ------------------------------------------
  // RENDER: RESTAURANT INCOMING HANDOVER
  // ------------------------------------------
  const renderIncomingPickupCard = ({ item }) => (
    <View style={styles.incomingCard}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.incomingNgo}>{item.ngoName}</Text>
          <Text style={styles.incomingFood}>{item.foodName}</Text>
        </View>
        <View style={styles.karmaBadgeSmall}>
          <Text style={styles.karmaBadgeSmallText}>NGO Karma: {item.ngoKarma}</Text>
        </View>
      </View>

      <View style={styles.incomingMetaRow}>
        <Text style={styles.incomingPortions}>
          Quantity: <Text style={{ fontWeight: '800' }}>{item.reservedServings} {item.quantityUnit || 'servings'}</Text>
        </Text>
        <Text style={styles.incomingDeadline}>Deadline: {item.pickupDeadline}</Text>
      </View>

      <TouchableOpacity
        style={styles.verifyHandoverBtn}
        activeOpacity={0.8}
        onPress={() => setVerifyModalReservation(item)}
      >
        <MaterialCommunityIcons name="shield-check" size={18} color="#ffffff" />
        <Text style={styles.verifyBtnText}>Verify In-App OTP & Complete Pickup</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.screenContainer}>
      {/* 1. Swiggy-Style Top Segmented Navigation Header */}
      <SwiggyHeader
        activeSegment={activeSegment}
        onSelectSegment={setActiveSegment}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isVegOnly={isVegOnly}
        onToggleVegOnly={() => setIsVegOnly(!isVegOnly)}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        activeRadius={activeRadius}
        onSelectRadius={setActiveRadius}
        activeSort={activeSort}
        onSelectSort={setActiveSort}
        reservationsCount={reservations.length}
        incomingCount={incomingPickups.length}
        onOpenCreateListing={() => setCreateModalVisible(true)}
      />

      {/* 2. Main Content Body according to Active Segment */}
      <View style={styles.body}>
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Fetching live surplus...</Text>
          </View>
        ) : !isRestaurant ? (
          // ==================== NGO SCREENS ====================
          activeSegment === 'discover' ? (
            <FlatList
              data={listings}
              renderItem={renderListingCard}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#10b981']} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="food-off-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyTitle}>No Surplus Listings Nearby</Text>
                  <Text style={styles.emptySub}>
                    Try widening your distance radius or clearing your dietary filters.
                  </Text>
                </View>
              }
            />
          ) : activeSegment === 'reservations' ? (
            <FlatList
              data={reservations}
              renderItem={renderPickupCard}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#10b981']} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="receipt-text-check-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyTitle}>No Active Pickups</Text>
                  <Text style={styles.emptySub}>
                    When you claim portions from the feed, your 4-digit handover codes appear here.
                  </Text>
                </View>
              }
            />
          ) : activeSegment === 'history' ? (
            <FlatList
              data={historyItems}
              renderItem={renderHistoryCard}
              keyExtractor={(item, idx) => String(item.id || idx)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#10b981']} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="history" size={48} color="#9ca3af" />
                  <Text style={styles.emptyTitle}>No Rescue History Yet</Text>
                  <Text style={styles.emptySub}>Completed pickups and verified donations will be audited here.</Text>
                </View>
              }
            />
          ) : (
            // NGO Impact Screen
            <View style={styles.impactContainer}>
              <View style={styles.impactCard}>
                <MaterialCommunityIcons name="charity" size={36} color="#10b981" />
                <Text style={styles.impactNumber}>{profile?.impactStats?.totalMealsRescued ?? 3420}</Text>
                <Text style={styles.impactLabel}>Total Meals Rescued</Text>
              </View>
              <View style={styles.impactRow}>
                <View style={[styles.impactCard, { flex: 1, marginRight: 8 }]}>
                  <MaterialCommunityIcons name="trash-can-outline" size={26} color="#f59e0b" />
                  <Text style={styles.impactNumberSmall}>{profile?.impactStats?.foodWastePreventedKg ?? 1710} kg</Text>
                  <Text style={styles.impactLabel}>Waste Prevented</Text>
                </View>
                <View style={[styles.impactCard, { flex: 1 }]}>
                  <MaterialCommunityIcons name="molecule-co2" size={26} color="#059669" />
                  <Text style={styles.impactNumberSmall}>{profile?.impactStats?.co2eAvoidedTonnes ?? 4.28} T</Text>
                  <Text style={styles.impactLabel}>CO2e Avoided</Text>
                </View>
              </View>
              <View style={styles.karmaMeterBox}>
                <Text style={styles.karmaMeterTitle}>Reputation Score: {profile?.karmaScore ?? 100} / 100</Text>
                <Text style={styles.karmaMeterSub}>High trust standing • Gold Partner</Text>
              </View>
            </View>
          )
        ) : (
          // ==================== RESTAURANT SCREENS ====================
          activeSegment === 'restaurant_listings' ? (
            <FlatList
              data={restaurantListings}
              renderItem={renderRestaurantListingCard}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#ea580c']} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="storefront-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyTitle}>No Active Listings</Text>
                  <Text style={styles.emptySub}>Tap "+ Post" above to broadcast cooked meals, bakery, or raw grains.</Text>
                </View>
              }
            />
          ) : activeSegment === 'restaurant_handover' ? (
            <FlatList
              data={incomingPickups}
              renderItem={renderIncomingPickupCard}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#ea580c']} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="account-clock-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyTitle}>No Incoming Pickups</Text>
                  <Text style={styles.emptySub}>When an NGO claims your surplus, they will arrive here for OTP verification.</Text>
                </View>
              }
            />
          ) : (
            // Restaurant History
            <FlatList
              data={donationHistory}
              renderItem={({ item }) => (
                <View style={styles.historyCard}>
                  <Text style={styles.historyResto}>{item.foodName}</Text>
                  <Text style={styles.historyFood}>Handed to: {item.ngoName}</Text>
                  <View style={styles.histDetailRow}>
                    <Text style={styles.histDetailText}>{item.servingsDonated} {item.quantityUnit || 'servings'}</Text>
                    <Text style={styles.histDateText}>{item.completedAt}</Text>
                  </View>
                </View>
              )}
              keyExtractor={(item, idx) => String(item.id || idx)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#ea580c']} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="receipt-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyTitle}>No Donations Logged Yet</Text>
                  <Text style={styles.emptySub}>Completed handovers will appear in your tax and impact ledger.</Text>
                </View>
              }
            />
          )
        )}
      </View>

      {/* 3. NGO Claim Portions Modal */}
      <Modal visible={claimModalVisible} animationType="slide" transparent onRequestClose={() => setClaimModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Lock Portions for Rescue</Text>
                  <TouchableOpacity onPress={() => setClaimModalVisible(false)}>
                    <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {selectedListing && (
                  <>
                    <Text style={styles.modalFoodName}>{selectedListing.foodName}</Text>
                    <Text style={styles.modalRestoName}>{selectedListing.restaurant} • {selectedListing.distance}</Text>

                    <Text style={styles.inputLabel}>
                      Portions to Lock (Max: {selectedListing.availableServings} {selectedListing.quantityUnit || 'servings'})
                    </Text>
                    <View style={styles.portionCounterRow}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setPortionsToClaim(Math.max(1, portionsToClaim - 5))}
                      >
                        <MaterialCommunityIcons name="minus" size={20} color="#111827" />
                      </TouchableOpacity>
                      <Text style={styles.counterVal}>{portionsToClaim}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setPortionsToClaim(Math.min(selectedListing.availableServings, portionsToClaim + 5))}
                      >
                        <MaterialCommunityIcons name="plus" size={20} color="#111827" />
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.inputLabel}>Delivery Shelter / Beneficiary Destination</Text>
                      <TouchableOpacity onPress={Keyboard.dismiss}>
                        <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. Asha Kiran Shelter, Community Kitchen..."
                      placeholderTextColor="#9ca3af"
                      value={shelterDestination}
                      onChangeText={setShelterDestination}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />

                    <TouchableOpacity
                      style={styles.confirmClaimBtn}
                      activeOpacity={0.8}
                      onPress={handleConfirmClaim}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.confirmBtnText}>Confirm Lock & Generate Handover OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 4. Restaurant Create Listing Modal */}
      <CreateListingModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={fetchRestaurantData}
      />

      {/* 5. Restaurant Verify OTP Modal */}
      <VerifyOtpModal
        visible={Boolean(verifyModalReservation)}
        reservation={verifyModalReservation}
        onClose={() => setVerifyModalReservation(null)}
        onSuccess={fetchRestaurantData}
      />

      {/* 6. NGO In-App Handover OTP Modal */}
      <NgoOtpModal
        visible={Boolean(selectedOtpReservation)}
        reservation={selectedOtpReservation}
        onClose={() => setSelectedOtpReservation(null)}
      />

      {/* 7. NGO Cancel Reservation Modal */}
      <CancelReservationModal
        visible={Boolean(selectedCancelReservation)}
        reservation={selectedCancelReservation}
        onClose={() => setSelectedCancelReservation(null)}
        onSuccess={() => {
          fetchReservations();
          fetchListings();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  body: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  listContent: {
    padding: 14,
    paddingBottom: 24,
    gap: 12,
  },
  listingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  restoMeta: {
    flex: 1,
    marginRight: 8,
  },
  restoName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  karmaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  dot: {
    color: '#9ca3af',
    fontSize: 10,
  },
  distText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  vegBadge: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardBodyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardInfoCol: {
    flex: 1,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  categoryPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  foodTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
    marginBottom: 6,
  },
  portionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  portionsText: {
    fontSize: 12,
    color: '#334155',
  },
  portionsHighlight: {
    fontWeight: '800',
    color: '#059669',
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  storageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  storageText: {
    fontSize: 10,
    color: '#64748b',
  },
  cardImageCol: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  urgentBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
  },
  cardActionRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  claimButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  claimButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  // Pickup Cards
  pickupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  pickupResto: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  pickupFood: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  readyBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  readyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  pickupOtpBox: {
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
  otpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  otpLabel: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '700',
  },
  otpCode: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 4,
  },
  tapToViewPill: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tapToViewText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  pickupMetaGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  pickupActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  showCodeBtn: {
    flex: 2,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  showCodeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  dropBtn: {
    flex: 1,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  // History Cards
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  historyResto: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyFood: {
    fontSize: 12,
    color: '#64748b',
  },
  histStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedPill: {
    backgroundColor: '#ecfdf5',
  },
  cancelledPill: {
    backgroundColor: '#fef2f2',
  },
  histStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  completedText: {
    color: '#059669',
  },
  cancelledText: {
    color: '#dc2626',
  },
  histDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  histDetailText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  histDateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  reasonBox: {
    backgroundColor: '#fff1f2',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#be123c',
  },
  reasonVal: {
    fontSize: 11,
    color: '#881337',
    marginTop: 1,
  },
  // Impact View
  impactContainer: {
    padding: 16,
    gap: 12,
  },
  impactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  impactNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 6,
  },
  impactNumberSmall: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  impactLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  impactRow: {
    flexDirection: 'row',
  },
  karmaMeterBox: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  karmaMeterTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  karmaMeterSub: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  // Restaurant Listings Cards
  restoListingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  restoCat: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePill: {
    backgroundColor: '#ecfdf5',
  },
  reservedPill: {
    backgroundColor: '#fff7ed',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  stockRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  stockCol: {
    flex: 1,
  },
  stockLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  stockVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  // Incoming Pickups
  incomingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  incomingNgo: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  incomingFood: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  karmaBadgeSmall: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  karmaBadgeSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  incomingMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginVertical: 10,
  },
  incomingPortions: {
    fontSize: 12,
    color: '#334155',
  },
  incomingDeadline: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: '700',
  },
  verifyHandoverBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalFoodName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
  },
  modalRestoName: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  portionCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  counterVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 40,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 20,
  },
  confirmClaimBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});