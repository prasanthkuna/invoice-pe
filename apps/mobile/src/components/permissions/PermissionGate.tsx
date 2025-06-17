import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button, colors, spacing, typography } from '@invoicepe/ui-kit';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionType, PermissionContext, PERMISSION_CONTEXTS } from '../../types/permissions';

interface PermissionGateProps {
  permission: PermissionType;
  context?: PermissionContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  checkOnMount?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  context,
  children,
  fallback,
  checkOnMount = true,
}) => {
  const { permissions, requestPermission, checkPermission } = usePermissions();
  const [isLoading, setIsLoading] = useState(checkOnMount);
  
  const permissionContext = context || PERMISSION_CONTEXTS[permission];
  const permissionState = permissions[permission];

  useEffect(() => {
    if (checkOnMount) {
      checkPermission(permission).finally(() => setIsLoading(false));
    }
  }, [permission, checkPermission, checkOnMount]);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      await requestPermission(permission, permissionContext);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (permissionState?.status === 'granted') {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{permissionContext.feature}</Text>
        <Text style={styles.description}>
          {permissionContext.description}
        </Text>
        
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Benefits:</Text>
          {permissionContext.benefits.map((benefit, index) => (
            <Text key={index} style={styles.benefit}>
              • {benefit}
            </Text>
          ))}
        </View>

        <Button
          title={`Enable ${permissionContext.feature}`}
          onPress={handleRequestPermission}
          disabled={isLoading}
          style={styles.button}
        />

        {permissionContext.fallbackAction && (
          <Text style={styles.fallbackText}>
            {permissionContext.fallbackAction}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    textTransform: 'capitalize',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  benefitsContainer: {
    alignSelf: 'stretch',
    marginBottom: spacing.lg,
  },
  benefitsTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  benefit: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  button: {
    marginBottom: spacing.md,
    minWidth: 200,
  },
  fallbackText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
