import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { supabaseService } from '../lib/supabase';
import { debugContext } from '../utils/logger';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { BusinessInfoScreen } from '../screens/BusinessInfoScreen';
import { AppNavigator } from './AppNavigator';

const Stack = createStackNavigator();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, user, loading } = useSupabaseAuth();
  const [needsBusinessInfo, setNeedsBusinessInfo] = useState(false);
  const [checkingBusinessInfo, setCheckingBusinessInfo] = useState(false);

  // Check if user needs to provide business information
  useEffect(() => {
    const checkBusinessInfo = async () => {
      if (!isAuthenticated || !user?.id) {
        setNeedsBusinessInfo(false);
        return;
      }

      setCheckingBusinessInfo(true);
      try {
        debugContext.auth({ 
          step: 'checking_business_info', 
          userId: user.id 
        });

        // Check if user has business information
        const { data: userData, error } = await supabaseService.supabase
          .from('users')
          .select('business_name, gstin')
          .eq('id', user.id)
          .single();

        if (error) {
          debugContext.error('business_info', error, { 
            step: 'check_business_info_failed',
            userId: user.id 
          });
          // If we can't check, assume they need to provide info
          setNeedsBusinessInfo(true);
          return;
        }

        // User needs business info if they don't have a business name
        const needsInfo = !userData?.business_name;
        setNeedsBusinessInfo(needsInfo);

        debugContext.auth({ 
          step: 'business_info_check_complete', 
          userId: user.id,
          needsBusinessInfo: needsInfo,
          hasBusinessName: !!userData?.business_name,
          hasGstin: !!userData?.gstin
        });

      } catch (error) {
        debugContext.error('business_info', error as Error, { 
          step: 'check_business_info_error',
          userId: user.id 
        });
        // On error, assume they need to provide info
        setNeedsBusinessInfo(true);
      } finally {
        setCheckingBusinessInfo(false);
      }
    };

    checkBusinessInfo();
  }, [isAuthenticated, user?.id]);

  // Show loading while checking authentication or business info
  if (loading || checkingBusinessInfo) {
    return null; // App.tsx will handle the loading state
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: false, // Prevent going back during onboarding
        }}
      >
        {!isAuthenticated ? (
          // Not authenticated - show login
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              animationTypeForReplace: 'pop',
            }}
          />
        ) : needsBusinessInfo ? (
          // Authenticated but needs business info
          <Stack.Screen 
            name="BusinessInfo" 
            component={BusinessInfoScreen}
            options={{
              gestureEnabled: false, // Prevent going back
            }}
          />
        ) : (
          // Authenticated and has business info - show main app
          <Stack.Screen 
            name="AppNavigator" 
            component={AppNavigator}
            options={{
              animationTypeForReplace: 'push',
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
