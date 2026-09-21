import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#ffffff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: '#111827',
        },
        tabBarActiveTintColor: '#10b981', // Emerald green - Anti-AI: purposeful and calm
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="discover/index"
        options={{
          title: 'Discover Surplus',
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="explore" color={color} size={size || 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations/index"
        options={{
          title: 'Active Pickups',
          tabBarLabel: 'Reservations',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt-long" color={color} size={size || 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="history/index"
        options={{
          title: 'Rescue History',
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="history" color={color} size={size || 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'NGO Profile & Impact',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="volunteer-activism" color={color} size={size || 24} />
          ),
        }}
      />
    </Tabs>
  );
}