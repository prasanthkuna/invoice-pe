import React, { useCallback } from 'react';
import { View, RefreshControl, ListRenderItem } from 'react-native';
import { FlashList, FlashListProps, ListRenderItem as FlashListRenderItem } from '@shopify/flash-list';
import { colors, spacing } from '@invoicepe/ui-kit';
import { FadeInView } from './FadeInView';
import { SlideInView } from './SlideInView';

interface AnimatedListProps<T> extends Omit<FlashListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: FlashListRenderItem<T>;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
  animationType?: 'fade' | 'slide';
  staggerDelay?: number;
  emptyComponent?: React.ReactNode;
}

export function AnimatedList<T>({
  data,
  renderItem,
  onRefresh,
  refreshing = false,
  animationType = 'fade',
  staggerDelay = 50,
  emptyComponent,
  ...flashListProps
}: AnimatedListProps<T>) {
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  const animatedRenderItem: FlashListRenderItem<T> = useCallback(
    (info) => {
      const { item, index } = info;
      const delay = index * staggerDelay;

      const AnimationWrapper = animationType === 'slide' ? SlideInView : FadeInView;

      return (
        <AnimationWrapper delay={delay}>
          {renderItem(info)}
        </AnimationWrapper>
      );
    },
    [renderItem, animationType, staggerDelay]
  );

  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={colors.primary[500]}
      colors={[colors.primary[500]]}
      progressBackgroundColor={colors.surface}
    />
  ) : undefined;

  if (data.length === 0 && emptyComponent) {
    return (
      <View style={{ flex: 1 }}>
        {emptyComponent}
      </View>
    );
  }

  return (
    <FlashList
      data={data}
      renderItem={animatedRenderItem}
      estimatedItemSize={80}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      {...flashListProps}
    />
  );
}
