import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList, BottomTabParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import CustomTabBar from './CustomTabBar';

import SplashScreen from '../screens/splash/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ExpenseListScreen from '../screens/expense/ExpenseListScreen';
import AddExpenseScreen from '../screens/expense/AddExpenseScreen';
import ExpenseDetailsScreen from '../screens/expense/ExpenseDetailsScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import CategoryManagementScreen from '../screens/category/CategoryManagementScreen';
import ManageTypesScreen from '../screens/settings/ManageTypesScreen';
import PDFExportScreen from '../screens/reports/PDFExportScreen';
import RentDashboardScreen from '../screens/rent/RentDashboardScreen';
import AddTenantScreen from '../screens/rent/AddTenantScreen';
import TenantDetailsScreen from '../screens/rent/TenantDetailsScreen';
import AddRentCostScreen from '../screens/rent/AddRentCostScreen';
import RentReportScreen from '../screens/rent/RentReportScreen';
import AddIncomeScreen from '../screens/income/AddIncomeScreen';
import IncomeListScreen from '../screens/income/IncomeListScreen';
import VoiceEntryScreen from '../screens/voice/VoiceEntryScreen';
import ManageOwnersScreen from '../screens/rent/ManageOwnersScreen';
import AddOwnerScreen from '../screens/rent/AddOwnerScreen';
import AddOwnerContributionScreen from '../screens/rent/AddOwnerContributionScreen';
import ManageFlatsScreen from '../screens/rent/ManageFlatsScreen';
import AddFlatScreen from '../screens/rent/AddFlatScreen';
import RentPDFExportScreen from '../screens/rent/RentPDFExportScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0, shadowOpacity: 0 },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: t('dashboard.title'),
          tabBarLabel: t('dashboard.title'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpenseListScreen}
        options={{
          title: t('expense.expenses'),
          tabBarLabel: t('expense.expenses'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="receipt" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Income"
        component={IncomeListScreen}
        options={{
          title: t('income.title'),
          tabBarLabel: t('income.title'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cash-plus" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          title: t('reports.title'),
          tabBarLabel: t('reports.title'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-bar" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Rent"
        component={RentDashboardScreen}
        options={{
          title: t('rent.title'),
          tabBarLabel: t('rent.title'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-city-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings.title'),
          tabBarLabel: t('settings.title'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const { theme } = useAppTheme();
  const { colors } = theme;

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      {!user ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddExpense"
            component={AddExpenseScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="ExpenseDetails"
            component={ExpenseDetailsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
          <Stack.Screen name="ManageTypes" component={ManageTypesScreen} />
          <Stack.Screen name="PDFExport" component={PDFExportScreen} />
          <Stack.Screen
            name="AddTenant"
            component={AddTenantScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="TenantDetails"
            component={TenantDetailsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="AddRentCost"
            component={AddRentCostScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="RentReport"
            component={RentReportScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="AddIncome"
            component={AddIncomeScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="VoiceEntry"
            component={VoiceEntryScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="ManageOwners"
            component={ManageOwnersScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="AddOwner"
            component={AddOwnerScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="AddOwnerContribution"
            component={AddOwnerContributionScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="ManageFlats"
            component={ManageFlatsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="AddFlat"
            component={AddFlatScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="RentPDFExport"
            component={RentPDFExportScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
