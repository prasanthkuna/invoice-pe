import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { colors } from '@invoicepe/ui-kit';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { VendorListScreen } from '../screens/VendorListScreen';
import { AddVendorScreen } from '../screens/AddVendorScreen';
import { EditVendorScreen } from '../screens/EditVendorScreen';
import { InvoiceListScreen } from '../screens/InvoiceListScreen';
import { CreateInvoiceScreen } from '../screens/CreateInvoiceScreen';
import { InvoiceDetailScreen } from '../screens/InvoiceDetailScreen';
import { EditInvoiceScreen } from '../screens/EditInvoiceScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { PaymentStatusScreen } from '../screens/PaymentStatusScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const VendorStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: colors.grey[900],
      },
      headerTintColor: colors.white,
      headerTitleStyle: {
        fontWeight: '600',
      },
    }}
  >
    <Stack.Screen
      name="VendorList"
      component={VendorListScreen}
      options={{ title: 'Vendors' }}
    />
    <Stack.Screen
      name="AddVendor"
      component={AddVendorScreen}
      options={{ title: 'Add Vendor' }}
    />
    <Stack.Screen
      name="EditVendor"
      component={EditVendorScreen as any}
      options={{ title: 'Edit Vendor' }}
    />
  </Stack.Navigator>
);

const InvoiceStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: colors.grey[900],
      },
      headerTintColor: colors.white,
      headerTitleStyle: {
        fontWeight: '600',
      },
    }}
  >
    <Stack.Screen
      name="InvoiceList"
      component={InvoiceListScreen}
      options={{ title: 'Invoices' }}
    />
    <Stack.Screen
      name="CreateInvoice"
      component={CreateInvoiceScreen}
      options={{ title: 'Create Invoice' }}
    />
    <Stack.Screen
      name="InvoiceDetail"
      component={InvoiceDetailScreen as any}
      options={{ title: 'Invoice Details' }}
    />
    <Stack.Screen
      name="EditInvoice"
      component={EditInvoiceScreen as any}
      options={{ title: 'Edit Invoice' }}
    />
    <Stack.Screen
      name="Payment"
      component={PaymentScreen as any}
      options={{ title: 'Payment' }}
    />
    <Stack.Screen
      name="PaymentStatus"
      component={PaymentStatusScreen as any}
      options={{ title: 'Payment Status' }}
    />
  </Stack.Navigator>
);

export const AppNavigator: React.FC = () => (
  <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.grey[800],
          borderTopColor: colors.grey[600],
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.grey[600],
        headerStyle: {
          backgroundColor: colors.grey[900],
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Vendors"
        component={VendorStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Vendors',
        }}
      />
      <Tab.Screen
        name="Invoices"
        component={InvoiceStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Invoices',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
);
