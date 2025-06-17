import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, ScrollViewProps } from 'react-native';
import { colors } from '@invoicepe/ui-kit';

interface PullToRefreshProps extends ScrollViewProps {
  onRefresh: () => Promise<void> | void;
  refreshing: boolean;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  refreshing,
  children,
  ...scrollViewProps
}) => {
  const handleRefresh = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  return (
    <ScrollView
      {...scrollViewProps}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary[500]}
          colors={[colors.primary[500]]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      {children}
    </ScrollView>
  );
};
