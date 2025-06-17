import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '@invoicepe/ui-kit';
import { useSupabaseAuth } from './src/hooks/useSupabaseAuth';
import { RootNavigator } from './src/navigation/RootNavigator';
import { devDebugger } from './src/utils/devDebugger';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { DebugPanel } from './src/components/DebugPanel';
import { logger, debugContext } from './src/utils/logger';

export default function App() {
  const { loading, user } = useSupabaseAuth();
  const [debugPanelVisible, setDebugPanelVisible] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);

  // Initialize dev debugger with user context
  useEffect(() => {
    if (__DEV__ && user?.id) {
      devDebugger.startSession(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    logger.info('App started', {
      loading,
      environment: __DEV__ ? 'development' : 'production'
    });
  }, []);

  // Debug panel trigger (tap 5 times in development)
  const handleDebugTap = () => {
    if (!__DEV__) return;

    const newCount = debugTapCount + 1;
    setDebugTapCount(newCount);

    if (newCount >= 5) {
      setDebugPanelVisible(true);
      setDebugTapCount(0);
    }

    // Reset count after 3 seconds
    setTimeout(() => setDebugTapCount(0), 3000);
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <View style={styles.loadingContainer}>
          <TouchableOpacity onPress={handleDebugTap} style={styles.debugTrigger}>
            <Text style={styles.loadingText}>Loading...</Text>
          </TouchableOpacity>
          <StatusBar style="light" />
        </View>
      </ErrorBoundary>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary
        onError={(error, errorInfo) => {
          logger.fatal('App-level error caught', {
            componentStack: errorInfo.componentStack,
          }, error);
        }}
      >
        <View style={styles.container}>
          <RootNavigator />
          <StatusBar style="light" />

          {/* Debug trigger - only visible in development */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.debugTriggerButton}
              onPress={handleDebugTap}
            >
              <Text style={styles.debugTriggerText}>
                {debugTapCount > 0 ? `${5 - debugTapCount} more taps` : '🐛'}
              </Text>
            </TouchableOpacity>
          )}

          <DebugPanel
            visible={debugPanelVisible}
            onClose={() => setDebugPanelVisible(false)}
          />
        </View>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey[900],
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.grey[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 18,
  },
  debugTrigger: {
    padding: 20,
  },
  debugTriggerButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
    zIndex: 1000,
  },
  debugTriggerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
