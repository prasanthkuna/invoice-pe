import { withSpring, withTiming, Easing } from 'react-native-reanimated';

export const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

export const timingConfig = {
  duration: 300,
  easing: Easing.out(Easing.cubic),
};

export const fastTimingConfig = {
  duration: 150,
  easing: Easing.out(Easing.quad),
};

export const slowTimingConfig = {
  duration: 500,
  easing: Easing.out(Easing.cubic),
};

export const createFadeIn = (delay = 0) => ({
  opacity: withTiming(1, { 
    ...timingConfig, 
    duration: timingConfig.duration + delay 
  }),
});

export const createFadeOut = (delay = 0) => ({
  opacity: withTiming(0, { 
    ...fastTimingConfig, 
    duration: fastTimingConfig.duration + delay 
  }),
});

export const createSlideIn = (
  direction: 'left' | 'right' | 'up' | 'down' = 'up'
) => {
  const transforms: any = {};
  
  if (direction === 'up' || direction === 'down') {
    transforms.translateY = withSpring(0, springConfig);
  }

  if (direction === 'left' || direction === 'right') {
    transforms.translateX = withSpring(0, springConfig);
  }

  return {
    transform: [transforms],
  };
};

export const createScaleAnimation = (scale = 0.95, config = springConfig) => ({
  transform: [{ scale: withSpring(scale, config) }],
});

export const createBounceIn = () => ({
  transform: [
    {
      scale: withSpring(1, {
        damping: 8,
        stiffness: 100,
        mass: 1,
      }),
    },
  ],
});

export const createShakeAnimation = () => ({
  transform: [
    {
      translateX: withSpring(0, {
        damping: 5,
        stiffness: 300,
        mass: 1,
      }),
    },
  ],
});

// Stagger animation helper
export const createStaggeredAnimation = (
  items: any[],
  animationFn: (index: number) => any,
  staggerDelay = 100
) => {
  return items.map((_, index) => animationFn(index * staggerDelay));
};

// Common animation presets
export const animationPresets = {
  fadeIn: createFadeIn(),
  fadeOut: createFadeOut(),
  slideUp: createSlideIn('up'),
  slideDown: createSlideIn('down'),
  slideLeft: createSlideIn('left'),
  slideRight: createSlideIn('right'),
  scaleIn: createBounceIn(),
  buttonPress: createScaleAnimation(0.95),
  buttonRelease: createScaleAnimation(1),
};
