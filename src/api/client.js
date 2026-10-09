import { create as createAxios } from 'axios';
import { Platform } from 'react-native';
import * as AuthStorage from '../storage/authStorage';

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

const apiClient = createAxios({
  baseURL: getBaseUrl(),
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken = null;
let refreshToken = null;
let refreshPromise = null;
const authTokenListeners = new Set();

export const setRefreshToken = (token) => {
  refreshToken = token || null;
  if (refreshToken) {
    return AuthStorage.setItemAsync('feedforward_refresh_token', refreshToken).catch(() => {});
  } else {
    return AuthStorage.deleteItemAsync('feedforward_refresh_token').catch(() => {});
  }
};

export const setAuthTokens = (accessToken, nextRefreshToken) => {
  setAuthToken(accessToken);
  return setRefreshToken(nextRefreshToken);
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    const invalidSession = (status === 401 || status === 403) &&
      /invalid or expired access token|access token missing/i.test(message || '');
    const originalRequest = error.config;

    // Retry one protected request after renewing the access token. Permission
    // errors and auth endpoints must never trigger a refresh attempt.
    const isRefreshRequest = originalRequest?.url?.includes('/token/refresh');
    const isAuthRequest = originalRequest?.url?.startsWith('/auth/');
    if (invalidSession && originalRequest && !originalRequest._retried && !isRefreshRequest && !isAuthRequest) {
      originalRequest._retried = true;
      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearAuthTokens();
        return Promise.reject(refreshError);
      }
    }
    if (invalidSession && originalRequest?._retried) clearAuthTokens();
    return Promise.reject(error);
  },
);

const clearAuthTokens = () => {
  setAuthToken(null);
  setRefreshToken(null);
};

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const token = refreshToken || await AuthStorage.getItemAsync('feedforward_refresh_token');
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      refreshToken = token;
      const response = await apiClient.post('/token/refresh', { refreshToken: token });
      if (!response.data?.accessToken) throw new Error('Could not renew your session. Please sign in again.');
      setAuthToken(response.data.accessToken);
      return response.data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

export const setAuthToken = (token) => {
  authToken = token;
  authTokenListeners.forEach((listener) => listener(Boolean(token)));
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    AuthStorage.setItemAsync('feedforward_access_token', token).catch(() => {});
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    AuthStorage.deleteItemAsync('feedforward_access_token').catch(() => {});
  }
};

export const subscribeAuthToken = (listener) => {
  authTokenListeners.add(listener);
  return () => authTokenListeners.delete(listener);
};

export const loadAuthToken = async () => {
  const token = await AuthStorage.getItemAsync('feedforward_access_token');
  refreshToken = await AuthStorage.getItemAsync('feedforward_refresh_token');
  if (token) {
    setAuthToken(token);
    return token;
  }
  if (refreshToken) {
    try {
      return await refreshAccessToken();
    } catch {
      clearAuthTokens();
    }
  }
  return null;
};

export const getAuthToken = () => authToken;

// API Methods
export const api = {
  // Auth
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      if (err.response?.data) throw err.response.data;
    } finally {
      clearAuthTokens();
    }
  },

  async login(email, password, channel = 'email', role) {
    try {
      const res = await apiClient.post('/auth/login', { email, password, channel, role });
      return res.data;
    } catch (err) {
      if (err.response?.data) throw err.response.data;
      throw new Error('Could not start login');
    }
  },

  async register(data) {
    try {
      const res = await apiClient.post('/auth/register', data);
      return res.data;
    } catch (err) {
      if (err.response?.data) throw err.response.data;
      throw new Error('Could not create your account');
    }
  },

  async verifyEmail(challengeId, otp) {
    try {
      const res = await apiClient.post('/auth/verify-email', { challengeId, otp });
      return res.data;
    } catch (err) {
      if (err.response?.data) throw err.response.data;
      throw new Error('Could not verify your email');
    }
  },

  async registerDeviceToken(token) {
    try {
      const res = await apiClient.post('/auth/device-token', { token });
      return res.data;
    } catch (err) {
      if (err.response?.data) throw err.response.data;
      throw new Error('Could not register push notifications');
    }
  },

  async verifyLoginOtp(challengeId, otp) {
    try {
      const res = await apiClient.post('/auth/login/verify-otp', { challengeId, otp });
      if (res.data?.accessToken) await setAuthTokens(res.data.accessToken, res.data.refreshToken);
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
      if (res.data?.accessToken) await setAuthTokens(res.data.accessToken, res.data.refreshToken);
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
      throw new Error('Could not load food listings');
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
      const msg = err.response?.data?.message || err.message || "Failed to load reservations";
      throw new Error(msg);
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
      const msg = err.response?.data?.message || err.message || "Failed to load history";
      throw new Error(msg);
    }
  },

  // Profile
  async getProfile() {
    try {
      const res = await apiClient.get('/api/profile');
      return res.data;
    } catch (err) {
      if (err.response?.data?.message) throw new Error(err.response.data.message);
      throw new Error('Could not load your profile');
    }
  },

  async getKarmaHistory() {
    try {
      const res = await apiClient.get('/api/karma/history');
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Could not load karma history');
    }
  },

  async getLeaderboard() {
    try {
      const res = await apiClient.get('/api/leaderboard');
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Could not load leaderboard');
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

  async getAdminPartners() {
    try {
      const res = await apiClient.get('/api/admin/partners');
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load partner applications";
      throw new Error(msg);
    }
  },

  async reviewPartner(partnerType, partnerId, approvalStatus, reviewReason = '') {
    try {
      const res = await apiClient.patch(`/api/admin/partners/${partnerType}/${partnerId}/review`, {
        approvalStatus,
        reviewReason
      });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to review partner";
      throw new Error(msg);
    }
  },

  async submitReport(data) {
    try {
      const res = await apiClient.post('/api/reports', data);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || "Failed to submit report");
    }
  },

  async getAdminReports() {
    try {
      const res = await apiClient.get('/api/admin/reports');
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || "Failed to load reports");
    }
  },

  async reviewReport(reportId, status, resolution = '') {
    try {
      const res = await apiClient.patch(`/api/admin/reports/${reportId}/review`, { status, resolution });
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || "Failed to review report");
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

  async requestPickupCode(reservationId) {
    try {
      const res = await apiClient.post(`/api/reservations/${reservationId}/request-code`);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || "Failed to request pickup code");
    }
  },

  async processNoShow(reservationId) {
    try {
      const res = await apiClient.post(`/api/reservations/${reservationId}/no-show`);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || "Failed to process no-show");
    }
  },

  // Get Restaurant listings
  async getRestaurantListings() {
    try {
      const res = await apiClient.get('/api/restaurant/listings');
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load restaurant listings";
      throw new Error(msg);
    }
  },

  async updateRestaurantListing(listingId, data) {
    try {
      const res = await apiClient.patch(`/api/restaurant/listings/${listingId}`, data);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || "Failed to update listing");
    }
  },

  async deleteRestaurantListing(listingId) {
    try {
      const res = await apiClient.delete(`/api/restaurant/listings/${listingId}`);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || "Failed to delete listing");
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

  // Get incoming reservations waiting for pickup (Restaurant)
  async getRestaurantReservations() {
    try {
      const res = await apiClient.get('/api/restaurant/reservations');
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to load incoming reservations');
    }
  },

  // Get Restaurant donation history
  async getRestaurantHistory() {
    try {
      const res = await apiClient.get('/api/restaurant/history');
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to load donation history');
    }
  },

  // Get Restaurant stats
  async getRestaurantStats() {
    try {
      const res = await apiClient.get('/api/restaurant/stats');
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to load restaurant statistics');
    }
  },
};

export default apiClient;
