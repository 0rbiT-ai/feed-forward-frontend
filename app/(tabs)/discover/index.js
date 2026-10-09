import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Linking,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import io from 'socket.io-client';
import { api, getAuthToken } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import SwiggyHeader from '../../../src/components/SwiggyHeader';
import CreateListingModal from '../../../src/components/CreateListingModal';
import VerifyOtpModal from '../../../src/components/VerifyOtpModal';
import NgoOtpModal from '../../../src/components/NgoOtpModal';
import CancelReservationModal from '../../../src/components/CancelReservationModal';
import SuccessModal from '../../../src/components/SuccessModal';

const getRestaurantListingCategory = (item) => {
  const category = String(item.category || '').trim().toLowerCase();
  if (category.includes('bakery') || category.includes('bread')) return 'Bakery';
  if (category.includes('raw') || category.includes('grain') || category.includes('ingredient')) return 'Raw Ingredients';
  if (category.includes('produce') || category.includes('fruit') || category.includes('vegetable')) return 'Fresh Produce';
  if (category.includes('cook') || category.includes('meal')) return 'Cooked Food';

  return ({
    BAKERY: 'Bakery',
    RAW_INGREDIENT: 'Raw Ingredients',
    PRODUCE: 'Fresh Produce',
    COOKED_MEAL: 'Cooked Food',
    PACKAGED: 'Packaged',
  })[item.itemType] || 'Cooked Food';
};

const callPhoneNumber = (phone) => {
  const value = String(phone || '').trim();
  if (!value || !/[0-9]/.test(value)) return;
  const uri = `tel:${value.replace(/[^\d+]/g, '')}`;
  Linking.openURL(uri).catch((error) => console.warn('Could not open phone app:', error.message));
};

export default function DiscoverScreen() {
  const { role, profile, refreshProfile, loading: authLoading } = useAuth();
  const isRestaurant = role === 'RESTAURANT';

  // Navigation Segment State
  const [activeSegment, setActiveSegment] = useState('discover');
  const currentSegment = isRestaurant && activeSegment === 'discover'
    ? 'restaurant_listings'
    : !isRestaurant && ['restaurant_listings', 'restaurant_handover'].includes(activeSegment)
      ? 'discover'
      : activeSegment;

  // NGO Feed & Filter States
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeRadius, setActiveRadius] = useState(25);
  const [activeSort, setActiveSort] = useState('distance');
  const [restaurantSort, setRestaurantSort] = useState('available');
  const [minKarma, setMinKarma] = useState(0);
  const [itemType, setItemType] = useState('ALL');
  const [dietaryTag, setDietaryTag] = useState('');

  // NGO Reservations State
  const [reservations, setReservations] = useState([]);
  const [selectedOtpReservation, setSelectedOtpReservation] = useState(null);
  const [selectedCancelReservation, setSelectedCancelReservation] = useState(null);

  // NGO History State
  const [historyItems, setHistoryItems] = useState([]);

  // Restaurant Suite States
  const [restaurantListings, setRestaurantListings] = useState([]);
  const [restaurantListingTab, setRestaurantListingTab] = useState('active');
  const [listingClock, setListingClock] = useState(Date.now());
  const [incomingPickups, setIncomingPickups] = useState([]);
  const [donationHistory, setDonationHistory] = useState([]);
  const [restaurantStats, setRestaurantStats] = useState(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [verifyModalReservation, setVerifyModalReservation] = useState(null);
  const [deleteConfirmationListing, setDeleteConfirmationListing] = useState(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [deleteConfirmationMode, setDeleteConfirmationMode] = useState('single');
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [deleteListingError, setDeleteListingError] = useState('');
  const [deletingListing, setDeletingListing] = useState(false);

  // NGO Claim Modal State
  const [selectedListing, setSelectedListing] = useState(null);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(null);
  const [portionsToClaim, setPortionsToClaim] = useState(0);
  const [shelterDestination, setShelterDestination] = useState('Asha Kiran Community Shelter');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dataLoaders = useRef({});

  useEffect(() => {
    const timer = setInterval(() => setListingClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Socket connection
  useEffect(() => {
    const socketUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      auth: { token: getAuthToken() },
    });

    socket.on('new_listing', () => {
      dataLoaders.current.fetchListings?.();
      if (dataLoaders.current.isRestaurant) dataLoaders.current.fetchRestaurantData?.();
    });

    socket.on('listing_updated', () => {
      dataLoaders.current.fetchListings?.();
      if (dataLoaders.current.isRestaurant) dataLoaders.current.fetchRestaurantData?.();
    });

    socket.on('pickup_completed', () => {
      dataLoaders.current.fetchListings?.();
      dataLoaders.current.fetchReservations?.();
      dataLoaders.current.fetchHistory?.();
      dataLoaders.current.refreshProfile?.();
      if (dataLoaders.current.isRestaurant) dataLoaders.current.fetchRestaurantData?.();
    });

    socket.on('reservation_cancelled', () => {
      dataLoaders.current.fetchListings?.();
      dataLoaders.current.fetchReservations?.();
      if (dataLoaders.current.isRestaurant) dataLoaders.current.fetchRestaurantData?.();
    });

    socket.on('reservation_no_show', () => {
      dataLoaders.current.fetchReservations?.();
      dataLoaders.current.fetchListings?.();
      if (dataLoaders.current.isRestaurant) dataLoaders.current.fetchRestaurantData?.();
      dataLoaders.current.refreshProfile?.();
    });

    return () => {
      socket.disconnect();
    };
  }, [isRestaurant]);

  useFocusEffect(
    useCallback(() => {
      if (isRestaurant) {
        fetchRestaurantData();
      } else if (currentSegment === 'discover') {
        fetchListings();
      } else if (currentSegment === 'reservations') {
        fetchReservations();
      } else if (currentSegment === 'history') {
        fetchHistory();
      }
      refreshProfile();
    }, [
      isRestaurant,
      currentSegment,
      authLoading,
      profile?.latitude,
      profile?.longitude,
      isRestaurant ? null : activeCategory,
      isRestaurant ? null : isVegOnly,
      isRestaurant ? null : activeRadius,
      isRestaurant ? null : activeSort,
      isRestaurant ? null : searchQuery,
      isRestaurant ? null : minKarma,
      isRestaurant ? null : itemType,
      isRestaurant ? null : dietaryTag,
    ])
  );

  // ------------------------------------------
  // FETCHERS
  // ------------------------------------------
  async function fetchListings() {
    if (authLoading) return;
    const latitude = Number(profile?.latitude);
    const longitude = Number(profile?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setListings([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = {
        latitude,
        longitude,
        radius: activeRadius * 1000,
        sort: activeSort,
      };
      if (activeCategory !== 'ALL') params.category = activeCategory;
      if (isVegOnly) params.isVeg = 'true';
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (minKarma > 0) params.minKarma = minKarma;
      if (itemType !== 'ALL') params.itemType = itemType;
      if (dietaryTag) params.dietaryTag = dietaryTag;

      const data = await api.getListings(params);
      setListings(data || []);
    } catch (err) {
      console.warn('Error fetching listings:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchReservations() {
    try {
      const data = await api.getReservations();
      setReservations(data || []);
    } catch (err) {
      console.warn('Error fetching reservations:', err.message);
    }
  }

  async function fetchHistory() {
    try {
      const data = await api.getHistory();
      setHistoryItems(data || []);
    } catch (err) {
      console.warn('Error fetching history:', err.message);
    }
  }

  async function fetchRestaurantData() {
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
  }

  // Socket listeners outlive the render that created them. Keep their data
  // loaders current so events use the latest NGO coordinates and filters.
  dataLoaders.current = {
    fetchListings,
    fetchReservations,
    fetchHistory,
    fetchRestaurantData,
    refreshProfile,
    isRestaurant,
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

  const handleEditListing = (listing) => {
    setEditingListing(listing);
  };

  const handleDeleteListing = async (listing) => {
    setDeleteListingError('');
    setDeleteConfirmationMode('single');
    setDeleteConfirmationListing(listing);
    setDeleteConfirmationName(listing.foodName || 'This listing');
    setDeleteConfirmationVisible(true);
  };

  const confirmDeleteListing = async () => {
    if (deletingListing) return;
    setDeletingListing(true);
    try {
      if (deleteConfirmationMode === 'clear-expired') {
        const expiredItems = restaurantListings.filter((item) => new Date(item.safeUntil).getTime() <= listingClock);
        const removedIds = [];
        let blockedCount = 0;
        for (const item of expiredItems) {
          try {
            await api.deleteRestaurantListing(item.id);
            removedIds.push(item.id);
          } catch {
            blockedCount += 1;
          }
        }
        setRestaurantListings((current) => current.filter((item) => !removedIds.includes(item.id)));
        if (blockedCount > 0) {
          setDeleteListingError(`${removedIds.length} removed. ${blockedCount} kept because a pickup is still waiting. Complete or cancel those pickups, then clear again.`);
        } else {
          setDeleteConfirmationVisible(false);
        }
      } else {
        if (!deleteConfirmationListing) return;
        await api.deleteRestaurantListing(deleteConfirmationListing.id);
        setRestaurantListings((current) => current.filter((item) => item.id !== deleteConfirmationListing.id));
        setDeleteConfirmationVisible(false);
      }
      fetchRestaurantData();
    } catch (err) {
      setDeleteListingError(err.message || 'Could not remove this listing.');
    } finally {
      setDeletingListing(false);
    }
  };

  const handleNoShow = async (reservation) => {
    Alert.alert(
      'Process No-Show?',
      `Mark ${reservation.foodName} as not collected after its pickup deadline?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.processNoShow(reservation.dbId);
              Alert.alert('No-Show Processed', 'The pickup was cancelled and the NGO penalty was applied.');
              fetchReservations();
              fetchListings();
              refreshProfile();
            } catch (err) {
              Alert.alert('No-Show Failed', err.message);
            }
          },
        },
      ]
    );
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
    setPortionsToClaim(0);
    setClaimModalVisible(true);
  };

  const handleConfirmClaim = async () => {
    if (!selectedListing) return;
    const maxAvailable = Number(selectedListing.availableServings) || 0;
    if (!Number.isInteger(portionsToClaim) || portionsToClaim < 1 || portionsToClaim > maxAvailable) {
      Alert.alert('Check the quantity', `Enter a whole number between 1 and ${maxAvailable}.`);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.reserveListing(
        selectedListing.id,
        portionsToClaim,
        shelterDestination
      );
      fetchListings();
      fetchReservations();
      setClaimModalVisible(false);
      setClaimSuccess({ message: `Reserved ${portionsToClaim} ${selectedListing.quantityUnit || "servings"} from ${selectedListing.restaurant}. Your handover code is #${res.reservation?.pickupCode || "ready"} and is available in Pickups.` });
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
              <Text style={styles.karmaBadgeText}>Karma {item.restaurantKarma ?? 0}</Text>
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
                <Text style={styles.portionsHighlight}>{item.availableServings}</Text> {item.quantityUnit || 'servings'} available
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
        <View style={styles.pickupTitleWrap}>
          <Text style={styles.pickupResto} numberOfLines={1}>{item.restaurant}</Text>
          <Text style={styles.pickupFood}>{item.foodName}</Text>
        </View>
        <View style={styles.pickupHeaderActions}>
          <View style={styles.readyBadge}>
            <Text style={styles.readyBadgeText}>READY FOR PICKUP</Text>
          </View>
          <TouchableOpacity
            style={[styles.callIconButton, !item.restaurantPhone && styles.callIconButtonDisabled]}
            onPress={() => callPhoneNumber(item.restaurantPhone)}
            disabled={!item.restaurantPhone}
            accessibilityRole="button"
            accessibilityLabel="Call restaurant"
          >
            <MaterialCommunityIcons name="phone" size={15} color={item.restaurantPhone ? '#047857' : '#94a3b8'} />
          </TouchableOpacity>
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
        <Text style={[styles.historyKarmaDelta, item.karmaDelta >= 0 ? styles.karmaEarned : styles.karmaPenalty]}>
          {item.karmaDelta > 0 ? '+' : ''}{item.karmaDelta} karma pts · {isCompleted ? 'verified collection' : 'cancellation'}
        </Text>

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
  const renderRestaurantListingCard = ({ item }) => {
    const isExpired = new Date(item.safeUntil).getTime() <= listingClock;
    return (
    <View style={[styles.restoListingCard, isExpired && styles.expiredListingCard]}>
      <View style={styles.restaurantListingTopRow}>
        <View style={styles.restaurantListingThumb}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.restaurantListingThumbImage} accessibilityLabel={`${item.foodName} photo`} />
          ) : (
            <MaterialCommunityIcons name="food-outline" size={26} color="#94a3b8" />
          )}
        </View>
        <View style={styles.restaurantListingTextCol}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <Text style={styles.foodTitle} numberOfLines={2}>{item.foodName}</Text>
              <Text style={styles.restoCat}>{item.category} • {item.quantityUnit || 'servings'}</Text>
            </View>
            <View style={[styles.statusPill, isExpired ? styles.reservedPill : item.status === 'ACTIVE' ? styles.activePill : styles.reservedPill]}>
              <Text style={[styles.statusPillText, (isExpired || item.status !== 'ACTIVE') && { color: '#d97706' }]}>
                {isExpired ? 'EXPIRED' : item.status === 'PARTIALLY_RESERVED' ? 'PARTIAL' : item.status === 'FULLY_RESERVED' ? 'RESERVED' : item.status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.stockRow}>
        <View style={styles.stockCol}>
          <Text style={styles.stockLabel}>Available</Text>
          <Text style={styles.stockVal}>{item.availableServings} {item.quantityUnit || 'servings'}</Text>
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

      <View style={styles.listingActionsRow}>
        {!isExpired ? (
          <TouchableOpacity style={styles.editListingBtn} onPress={() => handleEditListing(item)}>
            <MaterialCommunityIcons name="pencil" size={16} color="#475569" />
            <Text style={styles.listingActionText}>Edit</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.deleteListingBtn} onPress={() => handleDeleteListing(item)}>
          <MaterialCommunityIcons name="trash-can" size={16} color="#dc2626" />
          <Text style={styles.listingActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  // ------------------------------------------
  // RENDER: RESTAURANT INCOMING HANDOVER
  // ------------------------------------------
  const renderIncomingPickupCard = ({ item }) => (
    <View style={styles.incomingCard}>
      <View style={[styles.cardHeaderRow, styles.incomingHeader]}>
        <View style={styles.incomingTitleWrap}>
          <Text style={styles.incomingNgo} numberOfLines={1}>{item.ngoName}</Text>
          <Text style={styles.incomingFood}>{item.foodName}</Text>
          <View style={styles.karmaBadgeSmall}>
            <Text style={styles.karmaBadgeSmallText}>NGO Karma: {item.ngoKarma}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.callIconButton, styles.incomingCallButton, !item.ngoPhone && styles.callIconButtonDisabled]}
          onPress={() => callPhoneNumber(item.ngoPhone)}
          disabled={!item.ngoPhone}
          accessibilityRole="button"
          accessibilityLabel="Call NGO"
        >
          <MaterialCommunityIcons name="phone" size={15} color={item.ngoPhone ? '#047857' : '#94a3b8'} />
        </TouchableOpacity>
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

      <TouchableOpacity
        style={styles.noShowBtn}
        activeOpacity={0.8}
        onPress={() => handleNoShow(item)}
      >
        <MaterialCommunityIcons name="alert-circle" size={16} color="#b91c1c" />
        <Text style={styles.noShowText}>Mark as No-Show</Text>
      </TouchableOpacity>
    </View>
  );

  const visibleRestaurantListings = restaurantListings
    .filter((item) => (new Date(item.safeUntil).getTime() <= listingClock) === (restaurantListingTab === 'expired'))
    .filter((item) => activeCategory === 'ALL' || getRestaurantListingCategory(item) === activeCategory)
    .sort((a, b) => {
      if (restaurantSort === 'pickups') return (b.reservations?.length || 0) - (a.reservations?.length || 0);
      if (restaurantSort === 'safeUntil') return new Date(a.safeUntil).getTime() - new Date(b.safeUntil).getTime();
      return Number(b.availableServings || 0) - Number(a.availableServings || 0);
    });

  return (
    <SafeAreaView style={styles.screenContainer}>
      {/* 1. Swiggy-Style Top Segmented Navigation Header */}
      <SwiggyHeader
        activeSegment={currentSegment}
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
        minKarma={minKarma}
        onSelectMinKarma={setMinKarma}
        itemType={itemType}
        onSelectItemType={setItemType}
        dietaryTag={dietaryTag}
        onSelectDietaryTag={setDietaryTag}
        restaurantSort={restaurantSort}
        onSelectRestaurantSort={setRestaurantSort}
      />

      {/* 2. Main Content Body according to Active Segment */}
      <View style={styles.body}>
        {loading && !refreshing ? (
          <View style={styles.listContent}>
            {[0, 1, 2].map((key) => <View key={key} style={styles.skeletonCard}><View style={styles.skeletonLineWide} /><View style={styles.skeletonLineShort} /><View style={styles.skeletonBlock} /><View style={styles.skeletonLineWide} /></View>)}
          </View>
        ) : !isRestaurant ? (
          // ==================== NGO SCREENS ====================
          currentSegment === 'discover' ? (
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
          ) : currentSegment === 'reservations' ? (
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
          ) : currentSegment === 'history' ? (
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
                <Text style={styles.impactNumber}>{profile?.impactStats?.totalMealsRescued ?? 0}</Text>
                <Text style={styles.impactLabel}>Total Meals Rescued</Text>
              </View>
              <View style={styles.impactRow}>
                <View style={[styles.impactCard, { flex: 1, marginRight: 8 }]}>
                  <MaterialCommunityIcons name="trash-can-outline" size={26} color="#f59e0b" />
                  <Text style={styles.impactNumberSmall}>{profile?.impactStats?.foodWastePreventedKg ?? 0} kg</Text>
                  <Text style={styles.impactLabel}>Waste Prevented</Text>
                </View>
                <View style={[styles.impactCard, { flex: 1 }]}>
                  <MaterialCommunityIcons name="molecule-co2" size={26} color="#059669" />
                  <Text style={styles.impactNumberSmall}>{profile?.impactStats?.co2eAvoidedTonnes ?? 0} T</Text>
                  <Text style={styles.impactLabel}>CO2e Avoided</Text>
                </View>
              </View>
              <View style={styles.karmaMeterBox}>
                <Text style={styles.karmaMeterTitle}>Reputation Score: {profile?.karmaScore ?? 0} pts</Text>
                <Text style={styles.karmaMeterSub}>Earn points through completed collections</Text>
              </View>
            </View>
          )
        ) : (
          // ==================== RESTAURANT SCREENS ====================
          currentSegment === 'restaurant_listings' ? (
            <View style={{ flex: 1 }}>
              <View style={styles.listingStatusTabs}>
                <TouchableOpacity
                  style={[styles.listingStatusTab, restaurantListingTab === 'active' && styles.listingStatusTabActive]}
                  onPress={() => setRestaurantListingTab('active')}
                >
                  <Text style={[styles.listingStatusTabText, restaurantListingTab === 'active' && styles.listingStatusTabTextActive]}>Active ({restaurantListings.filter((item) => new Date(item.safeUntil).getTime() > listingClock).length})</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.listingStatusTab, restaurantListingTab === 'expired' && styles.listingStatusTabActive]}
                  onPress={() => setRestaurantListingTab('expired')}
                >
                  <Text style={[styles.listingStatusTabText, restaurantListingTab === 'expired' && styles.listingStatusTabTextActive]}>Expired ({restaurantListings.filter((item) => new Date(item.safeUntil).getTime() <= listingClock).length})</Text>
                </TouchableOpacity>
                {restaurantListingTab === 'expired' && restaurantListings.some((item) => new Date(item.safeUntil).getTime() <= listingClock) ? (
                  <TouchableOpacity
                    style={styles.clearExpiredButton}
                    onPress={() => {
                      setDeleteListingError('');
                      setDeleteConfirmationMode('clear-expired');
                      setDeleteConfirmationListing(null);
                      setDeleteConfirmationName('');
                      setDeleteConfirmationVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons name="delete-sweep-outline" size={15} color="#b91c1c" />
                    <Text style={styles.clearExpiredButtonText}>Clear all</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <FlatList
                data={visibleRestaurantListings}
                renderItem={renderRestaurantListingCard}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#ea580c']} />}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name={restaurantListingTab === 'expired' ? 'archive-outline' : 'storefront-outline'} size={48} color="#9ca3af" />
                    <Text style={styles.emptyTitle}>{restaurantListingTab === 'expired' ? 'No Expired Listings' : activeCategory === 'ALL' ? 'No Active Listings' : `No ${activeCategory} Listings`}</Text>
                    <Text style={styles.emptySub}>{restaurantListingTab === 'expired' ? 'Listings move here when their safe-until time passes.' : activeCategory === 'ALL' ? 'Tap "+ Post" above to broadcast cooked meals, bakery, or raw grains.' : 'Try another category or post a listing in this category.'}</Text>
                  </View>
                }
              />
            </View>
          ) : currentSegment === 'restaurant_handover' ? (
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
                  <Text style={[styles.historyKarmaDelta, styles.karmaEarned]}>+{item.karmaDelta || 10} karma pts · verified handover</Text>
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

      {isRestaurant && currentSegment === 'restaurant_listings' && <TouchableOpacity accessibilityLabel="Create listing" style={styles.postFab} activeOpacity={0.85} onPress={() => setCreateModalVisible(true)}><MaterialCommunityIcons name="plus" size={28} color="#fff" /></TouchableOpacity>}

      <Modal visible={deleteConfirmationVisible} transparent animationType="fade" onRequestClose={() => setDeleteConfirmationVisible(false)}>
        <View style={styles.deleteConfirmOverlay}>
          <View style={styles.deleteConfirmCard}>
            <View style={styles.deleteConfirmIcon}><MaterialCommunityIcons name="trash-can-outline" size={24} color="#dc2626" /></View>
            <Text style={styles.deleteConfirmTitle}>{deleteConfirmationMode === 'clear-expired' ? 'Clear expired listings?' : 'Remove this listing?'}</Text>
            <Text style={styles.deleteConfirmMessage}>{deleteConfirmationMode === 'clear-expired'
              ? `Remove all ${restaurantListings.filter((item) => new Date(item.safeUntil).getTime() <= listingClock).length} expired listings? Completed handovers will remain in history. Listings with pickups still waiting will be kept.`
              : `${deleteConfirmationName} will be removed from your ${new Date(deleteConfirmationListing?.safeUntil || 0).getTime() <= listingClock ? 'expired' : 'active'} listings. Completed handovers will remain in history.`}</Text>
            {deleteListingError ? <Text style={styles.deleteConfirmError}>{deleteListingError}</Text> : null}
            <View style={styles.deleteConfirmActions}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setDeleteConfirmationVisible(false)} disabled={deletingListing}>
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmDeleteListing} disabled={deletingListing}>
                {deletingListing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.deleteConfirmBtnText}>{deleteConfirmationMode === 'clear-expired' ? 'Clear all' : 'Remove'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                        onPress={() => setPortionsToClaim(Math.max(0, portionsToClaim - 1))}
                      >
                        <MaterialCommunityIcons name="minus" size={20} color="#111827" />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.counterInput}
                        value={String(portionsToClaim)}
                        onChangeText={(value) => {
                          if (value === '') {
                            setPortionsToClaim(0);
                            return;
                          }
                          if (!/^\d+$/.test(value)) {
                            setPortionsToClaim(0);
                            return;
                          }
                          const quantity = Number.parseInt(value, 10);
                          setPortionsToClaim(Math.min(quantity, Number(selectedListing.availableServings) || 0));
                        }}
                        onBlur={() => setPortionsToClaim((value) => Math.max(0, Math.min(value, Number(selectedListing.availableServings) || 0)))}
                        keyboardType="number-pad"
                        maxLength={6}
                        selectTextOnFocus
                        accessibilityLabel="Number of servings to reserve"
                      />
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setPortionsToClaim(Math.min(Number(selectedListing.availableServings) || 0, portionsToClaim + 1))}
                      >
                        <MaterialCommunityIcons name="plus" size={20} color="#111827" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.maxPortionsBtn}
                        onPress={() => setPortionsToClaim(Number(selectedListing.availableServings) || 0)}
                        accessibilityRole="button"
                        accessibilityLabel={`Set quantity to maximum, ${selectedListing.availableServings}`}
                      >
                        <Text style={styles.maxPortionsText}>MAX</Text>
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
                      disabled={isSubmitting || portionsToClaim < 1 || portionsToClaim > Number(selectedListing.availableServings)}
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

      {/* 4. Restaurant Listing Modal */}
      <CreateListingModal
        visible={createModalVisible || Boolean(editingListing)}
        listing={editingListing}
        onClose={() => {
          setCreateModalVisible(false);
          setEditingListing(null);
        }}
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
        onClose={() => {
          setSelectedOtpReservation(null);
          fetchListings();
          fetchReservations();
          fetchHistory();
        }}
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
      <SuccessModal
        visible={Boolean(claimSuccess)}
        title="Reservation confirmed"
        message={claimSuccess?.message}
        primaryLabel="View pickups"
        secondaryLabel="Keep browsing"
        onPrimary={() => { setClaimSuccess(null); setActiveSegment('reservations'); fetchReservations(); }}
        onSecondary={() => { setClaimSuccess(null); fetchListings(); }}
        onClose={() => setClaimSuccess(null)}
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
  skeletonCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', padding: 18, marginBottom: 14, gap: 12 },
  skeletonLineWide: { height: 16, width: '74%', borderRadius: 8, backgroundColor: '#e5e7eb' },
  skeletonLineShort: { height: 12, width: '42%', borderRadius: 7, backgroundColor: '#f1f5f9' },
  skeletonBlock: { height: 58, width: '100%', borderRadius: 12, backgroundColor: '#f1f5f9' },
  postFab: { position: 'absolute', right: 22, bottom: 26, width: 60, height: 60, borderRadius: 30, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
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
  pickupTitleWrap: { flex: 1, minWidth: 0, marginRight: 8 },
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
  callIconButton: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#a7f3d0', backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  callIconButtonDisabled: { borderColor: '#e2e8f0', backgroundColor: '#f1f5f9' },
  pickupHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
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
  historyKarmaDelta: { fontSize: 12, fontWeight: '800', marginTop: 8 },
  karmaEarned: { color: '#059669' },
  karmaPenalty: { color: '#dc2626' },
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
  expiredListingCard: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', opacity: 0.72 },
  listingStatusTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 },
  listingStatusTab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9, backgroundColor: '#f1f5f9' },
  listingStatusTabActive: { backgroundColor: '#111827' },
  listingStatusTabText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  listingStatusTabTextActive: { color: '#ffffff' },
  clearExpiredButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#fef2f2' },
  clearExpiredButtonText: { color: '#b91c1c', fontSize: 11, fontWeight: '800' },
  restaurantListingTopRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  restaurantListingThumb: { width: 76, height: 76, borderRadius: 11, overflow: 'hidden', backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  restaurantListingThumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  restaurantListingTextCol: { flex: 1, minWidth: 0 },
  restoCat: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
    alignSelf: 'flex-start',
    maxWidth: 96,
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
    flexShrink: 1,
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
  listingActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  editListingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  deleteListingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  listingActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
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
    flexShrink: 1,
  },
  incomingHeader: { alignItems: 'flex-start', gap: 8 },
  incomingTitleWrap: { flex: 1, minWidth: 0, marginRight: 4 },
  incomingCallButton: { marginRight: -4 },
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
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  karmaBadgeSmallText: {
    fontSize: 9,
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
  noShowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  noShowText: {
    color: '#b91c1c',
    fontSize: 11,
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
  deleteConfirmOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.52)', justifyContent: 'center', padding: 24 },
  deleteConfirmCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 22, alignItems: 'center' },
  deleteConfirmIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  deleteConfirmTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  deleteConfirmMessage: { fontSize: 13, color: '#64748b', lineHeight: 19, textAlign: 'center', marginTop: 8 },
  deleteConfirmError: { color: '#b91c1c', textAlign: 'center', fontSize: 12, fontWeight: '600', marginTop: 10 },
  deleteConfirmActions: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 18 },
  deleteCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  deleteCancelText: { color: '#334155', fontWeight: '700' },
  deleteConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
  deleteConfirmBtnText: { color: '#ffffff', fontWeight: '800' },
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
  maxPortionsBtn: { paddingHorizontal: 11, height: 34, borderRadius: 9, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  maxPortionsText: { color: '#047857', fontSize: 11, fontWeight: '900' },
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
  counterInput: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    width: 78,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
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
