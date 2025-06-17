import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '@invoicepe/ui-kit';

interface SkeletonLoaderProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width,
  height,
  borderRadius = 8,
  style,
}) => {
  const opacity = useSharedValue(0.3);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          backgroundColor: colors.border,
          borderRadius,
        },
        style,
        animatedStyle,
      ]}
    />
  );
};

// Skeleton components for common UI elements
export const SkeletonText: React.FC<{
  lines?: number;
  width?: string | number;
  style?: ViewStyle;
}> = ({ lines = 1, width = '100%', style }) => (
  <View style={style}>
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonLoader
        key={index}
        width={index === lines - 1 ? '70%' : width}
        height={16}
        borderRadius={4}
        style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
      />
    ))}
  </View>
);

export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[{ padding: 16 }, style]}>
    <SkeletonLoader width="60%" height={20} borderRadius={4} style={{ marginBottom: 12 }} />
    <SkeletonText lines={2} style={{ marginBottom: 12 }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <SkeletonLoader width={80} height={32} borderRadius={16} />
      <SkeletonLoader width={60} height={16} borderRadius={4} />
    </View>
  </View>
);

export const SkeletonList: React.FC<{
  itemCount?: number;
  itemHeight?: number;
  style?: ViewStyle;
}> = ({ itemCount = 5, itemHeight = 80, style }) => (
  <View style={style}>
    {Array.from({ length: itemCount }).map((_, index) => (
      <SkeletonCard
        key={index}
        style={{
          height: itemHeight,
          marginBottom: 8,
          backgroundColor: colors.surface,
          borderRadius: 8,
        }}
      />
    ))}
  </View>
);
