import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Dynamically select base URL depending on host OS / emulator
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Android Emulator uses 10.0.2.2 for host localhost, iOS and Web use localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken = null;
const authTokenListeners = new Set();

export const setAuthToken = (token) => {
  authToken = token;
  authTokenListeners.forEach((listener) => listener(Boolean(token)));
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    SecureStore.setItemAsync('feedforward_access_token', token).catch(() => {});
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    SecureStore.deleteItemAsync('feedforward_access_token').catch(() => {});
  }
};

export const subscribeAuthToken = (listener) => {
  authTokenListeners.add(listener);
  return () => authTokenListeners.delete(listener);
};

export const loadAuthToken = async () => {
  const token = await SecureStore.getItemAsync('feedforward_access_token');
  if (token) setAuthToken(token);
  return token;
};

export const getAuthToken = () => authToken;

// In-memory fallback mock database for instant interactive testing if backend is offline
const fallbackListings = [
  {
    id: 1,
    restaurant: "Royal Biryani House",
    foodName: "Chicken Dum Biryani & Mirchi Ka Salan",
    category: "Cooked Food",
    totalServings: 45,
    availableServings: 30,
    preparedTime: "7:30 PM",
    safeUntil: "10:30 PM",
    remainingHoursText: "1h 45m left",
    isUrgent: true,
    distance: "1.2 km",
    area: "Koramangala 5th Block",
    address: "88, 5th Cross, 60ft Road, Koramangala 5th Block, Bengaluru",
    contactPhone: "+91 80 4122 9011",
    isVeg: false,
    dietary: ["Halal", "Contains Dairy"],
    storageInstructions: "Hot cooked food. Carry insulated thermal crates.",
    imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    restaurant: "The Rameshwaram Cafe",
    foodName: "Ghee Podi Idli & Medu Vada with Sambar",
    category: "Cooked Food",
    totalServings: 60,
    availableServings: 60,
    preparedTime: "8:00 PM",
    safeUntil: "11:00 PM",
    remainingHoursText: "2h 15m left",
    isUrgent: false,
    distance: "2.4 km",
    area: "Indiranagar 100ft Rd",
    address: "2984, 12th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru",
    contactPhone: "+91 80 2520 7744",
    isVeg: true,
    dietary: ["Pure Veg", "Jain Friendly"],
    storageInstructions: "Keep warm. Bring food-grade stainless containers.",
    imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    restaurant: "Sandoitchi Artisanal Bakery",
    foodName: "Sourdough Boules, Brioche & Baguettes",
    category: "Bakery",
    totalServings: 35,
    availableServings: 25,
    preparedTime: "5:30 PM",
    safeUntil: "Tomorrow 12:00 PM",
    remainingHoursText: "Next day safe",
    isUrgent: false,
    distance: "1.8 km",
    area: "HSR Layout Sector 4",
    address: "411, 27th Main Rd, Sector 4, HSR Layout, Bengaluru",
    contactPhone: "+91 80 4390 1120",
    isVeg: true,
    dietary: ["Pure Veg", "Contains Gluten"],
    storageInstructions: "Dry ambient storage. Cardboard or cloth bags suitable.",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
  }
];

let fallbackReservations = [
  {
    id: "RES-7104",
    restaurant: "Olio - The Wood Fired Pizzeria",
    foodName: "Margherita Sourdough Pizza Boxes",
    reservedServings: 15,
    totalBatchServings: 30,
    safeUntil: "10:15 PM",
    pickupDeadline: "9:45 PM",
    pickupCode: "7104",
    status: "ready_for_pickup",
    restaurantPhone: "+91 80 4920 1888",
    address: "Plot 42, 1st Cross, Koramangala 4th Block, Bengaluru",
    pickupInstructions: "Enter through rear service corridor next to waste sorting dock. Bring thermal bags.",
    reservedAt: "8:42 PM",
    isVeg: true,
  }
];

let fallbackHistory = [
  {
    id: "HIS-6021",
    restaurant: "Burger King (Koramangala)",
    foodName: "Veg Whopper Patties & Buns",
    servingsRescued: 30,
    completedAt: "Today, 6:15 PM",
    shelterDelivered: "Asha Kiran Night Shelter, Adugodi",
    fssaiVerified: true,
  },
  {
    id: "HIS-5992",
    restaurant: "Chai Point (Indiranagar)",
    foodName: "Samosas, Banana Cake & Puffs",
    servingsRescued: 25,
    completedAt: "Yesterday, 8:30 PM",
    shelterDelivered: "Sneha Sadan Care Home, Viveknagar",
    fssaiVerified: true,
  }
];

let fallbackProfile = {
  name: "Robin Hood Army — Bengaluru Core",
  tagline: "Zero-fund volunteer collective serving surplus food to local communities",
  darpanId: "KA/2021/0291884",
  taxExemption: "Section 80G Certified (CIT/BLR/80G/2022-23)",
  isVerified: true,
  latitude: 12.9352,
  longitude: 77.6245,
  logisticsSetting: {
    mode: "NGO Representative Self-Pickup",
    inAppDeliveryNote: "In-App Delivery Fleet Integration coming in Phase 2 roadmap.",
    defaultRadiusKm: 8,
    operatingBase: "Koramangala Community Depot, Bengaluru",
  },
  impactStats: {
    totalMealsRescued: 3420,
    foodWastePreventedKg: 1710,
    co2eAvoidedTonnes: 4.28,
    activeRestaurantPartners: 28,
  }
};

// API Methods
export const api = {
  // Auth
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      if (err.response?.data) throw err.response.data;
    } finally {
      setAuthToken(null);
    }
  },

  async login(email, password, channel = 'email') {
    try {
      const res = await apiClient.post('/auth/login', { email, password, channel });
      return res.data;
    } catch (err) {
      if (err.response?.data) throw err.response.data;
      // Simulated login
      const demoToken = 'demo_jwt_token_ngo';
      setAuthToken(demoToken);
      return { requiresOtp: true, challengeId: `demo-${Date.now()}`, channel, destination: channel === 'phone' ? 'your phone' : email };
    }
  },

  async register(data) {
    try {
      const res = await apiClient.post('/auth/register', data);
      if (res.data?.accessToken) setAuthToken(res.data.accessToken);
      return res.data;
    } catch (err) {
      if (err.response?.data) throw err.response.data;
      const demoToken = 'demo_jwt_token_ngo';
      setAuthToken(demoToken);
      return { user: { ...data, role: 'NGO' }, accessToken: demoToken };
    }
  },

  async verifyLoginOtp(challengeId, otp) {
    try {
      const res = await apiClient.post('/auth/login/verify-otp', { challengeId, otp });
      if (res.data?.accessToken) setAuthToken(res.data.accessToken);
      return res.data;
    } catch (err) {
      if (err.response?.data) throw err.response.data;
      throw new Error('Could not verify the login code');
    }
  },

  async requestPasswordReset(identifier, channel) {
    try {
      const res = await apiClient.post('/auth/password-reset/request', { identifier, channel });
      return res.data;
    } catch (err) {
      if (err.response?.data) throw err.response.data;
      throw new Error('Could not start password reset');
    }
  },

  async verifyPasswordReset(challengeId, otp) {
    try {
      const res = await apiClient.post('/auth/password-reset/verify', { challengeId, otp });
      return res.data;
    } catch (err) {
      if (err.response?.data) throw err.response.data;
      throw new Error('Could not verify the reset code');
    }
  },

  async completePasswordReset(resetToken, password) {
    try {
      const res = await apiClient.post('/auth/password-reset/complete', { resetToken, password });
      if (res.data?.accessToken) setAuthToken(res.data.accessToken);
      return res.data;
    } catch (err) {
      if (err.response?.data) throw err.response.data;
      throw new Error('Could not reset the password');
    }
  },

  // Listings (Discover Feed)
  async getListings(params = {}) {
    try {
      const res = await apiClient.get('/api/listings', { params });
      return res.data;
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      console.warn('API listings call fallback:', err.message);
      return [];
    }
  },

  // Reserve a listing (NGO only)
  async reserveListing(listingId, portions = 10, shelterDelivered = "Local Community Shelter") {
    try {
      const res = await apiClient.post(`/api/listings/${listingId}/reserve`, {
        portions,
        shelterDelivered
      });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Could not reserve listing";
      throw new Error(msg);
    }
  },

  // Cancel reservation with reason (NGO only)
  async cancelReservation(reservationId, reason, notes) {
    try {
      const res = await apiClient.post(`/api/reservations/${reservationId}/cancel`, {
        reason,
        notes
      });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to cancel reservation";
      throw new Error(msg);
    }
  },

  // Reservations (NGO active pickups)
  async getReservations() {
    try {
      const res = await apiClient.get('/api/reservations');
      return res.data;
    } catch (err) {
      return [];
    }
  },

  // Legacy complete reservation endpoint
  async completeReservation(reservationId, shelterDelivered = "Asha Kiran Night Shelter") {
    try {
      const res = await apiClient.patch(`/api/reservations/${reservationId}/complete`, { shelterDelivered });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to complete pickup";
      throw new Error(msg);
    }
  },

  // History (NGO past pickups & cancellations)
  async getHistory() {
    try {
      const res = await apiClient.get('/api/history');
      return res.data;
    } catch (err) {
      return [];
    }
  },

  // Profile
  async getProfile() {
    try {
      const res = await apiClient.get('/api/profile');
      return res.data;
    } catch (err) {
      if (err.response?.data?.message) throw new Error(err.response.data.message);
      return null;
    }
  },

  async updateProfile(data) {
    try {
      const res = await apiClient.put('/api/profile', data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update profile";
      throw new Error(msg);
    }
  },

  // ------------------------------------------
  // RESTAURANT SUITE METHODS
  // ------------------------------------------

  // Verify Handover OTP entered by Restaurant
  async verifyHandoverOtp(reservationCode, pickupCode) {
    try {
      const res = await apiClient.post('/api/restaurant/reservations/verify-otp', {
        reservationCode,
        pickupCode
      });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to verify handover OTP";
      throw new Error(msg);
    }
  },

  // Get Restaurant listings
  async getRestaurantListings() {
    try {
      const res = await apiClient.get('/api/restaurant/listings');
      return res.data;
    } catch (err) {
      return [];
    }
  },

  // Create new listing (Restaurant)
  async createRestaurantListing(data) {
    try {
      const res = await apiClient.post('/api/listings', data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create listing";
      throw new Error(msg);
    }
  },

  // Update listing (Restaurant)
  async updateRestaurantListing(listingId, data) {
    try {
      const res = await apiClient.patch(`/api/restaurant/listings/${listingId}`, data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update listing";
      throw new Error(msg);
    }
  },

  // Get incoming reservations waiting for pickup (Restaurant)
  async getRestaurantReservations() {
    try {
      const res = await apiClient.get('/api/restaurant/reservations');
      return res.data;
    } catch (err) {
      return [];
    }
  },

  // Get Restaurant donation history
  async getRestaurantHistory() {
    try {
      const res = await apiClient.get('/api/restaurant/history');
      return res.data;
    } catch (err) {
      return [];
    }
  },

  // Get Restaurant stats
  async getRestaurantStats() {
    try {
      const res = await apiClient.get('/api/restaurant/stats');
      return res.data;
    } catch (err) {
      return null;
    }
  },
};

export default apiClient;
