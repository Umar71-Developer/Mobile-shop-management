import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SalesScreen from '../screens/SalesScreen';
import InventoryScreen from '../screens/InventoryScreen';
import ReportsScreen from '../screens/ReportsScreen';
import MoreScreen from '../screens/MoreScreen';
import PurchasesScreen from '../screens/PurchasesScreen';
import RepairsScreen from '../screens/RepairsScreen';
import UdharScreen from '../screens/UdharScreen';
import CustomersScreen from '../screens/CustomersScreen';
import JazzCashScreen from '../screens/JazzCashScreen';
import EasyLoadScreen from '../screens/EasyLoadScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import StaffScreen from '../screens/StaffScreen';
import ServerSettingsScreen from '../screens/ServerSettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.65 }}>{emoji}</Text>;
}

function MainTabs() {
  const { logout } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <Pressable onPress={logout} hitSlop={12} style={{ paddingHorizontal: 14 }}>
            <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>Logout</Text>
          </Pressable>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 62, paddingTop: 6, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard', tabBarLabel: 'Home', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Sales"
        component={SalesScreen}
        options={{ title: 'Sales / POS', tabBarLabel: 'Sell', tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} /> }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: 'Inventory', tabBarLabel: 'Stock', tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} /> }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Reports', tabBarLabel: 'Reports', tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ title: 'More', tabBarLabel: 'More', tabBarIcon: ({ focused }) => <TabIcon emoji="🧭" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <Text style={{ fontSize: 46 }}>📱</Text>
        <Text style={styles.splashText}>Mobile Shop</Text>
        <Text style={styles.splashSub}>Loading...</Text>
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Purchases" component={PurchasesScreen} options={{ title: 'Purchases' }} />
        <Stack.Screen name="Repairs" component={RepairsScreen} options={{ title: 'Repair Jobs' }} />
        <Stack.Screen name="Udhar" component={UdharScreen} options={{ title: 'Udhar (Credit)' }} />
        <Stack.Screen name="Customers" component={CustomersScreen} options={{ title: 'Customers' }} />
        <Stack.Screen name="JazzCash" component={JazzCashScreen} options={{ title: 'JazzCash' }} />
        <Stack.Screen name="EasyLoad" component={EasyLoadScreen} options={{ title: 'Easy Load' }} />
        <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Expenses' }} />
        <Stack.Screen name="Staff" component={StaffScreen} options={{ title: 'Staff' }} />
        <Stack.Screen name="ServerSettings" component={ServerSettingsScreen} options={{ title: 'Server Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  splashText: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 8 },
  splashSub: { fontSize: 12, color: colors.textLight, marginTop: 4 },
});
