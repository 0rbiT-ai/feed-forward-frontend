import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none', // Hidden in favor of the Swiggy-style top segmented bar
        },
      }}
    >
      <Tabs.Screen name="discover/index" />
      <Tabs.Screen name="reservations/index" />
      <Tabs.Screen name="history/index" />
      <Tabs.Screen name="profile/index" />
    </Tabs>
  );
}