import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { timingConfig } from '../../utils/animations';

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: any;
  from?: number;
  to?: number;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  delay = 0,
  duration = timingConfig.duration,
  style,
  from = 0,
  to = 1,
}) => {
  const opacity = useSharedValue(from);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (delay > 0) {
      opacity.value = withDelay(delay, withTiming(to, { duration }));
    } else {
      opacity.value = withTiming(to, { duration });
    }
  }, [delay, duration, to]);

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};
