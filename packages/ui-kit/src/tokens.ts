// Base color palette
const baseColors = {
  primary: {
    900: '#8B6914',
    600: '#D99F00',
    500: '#F5B80C',
    400: '#F7C547',
  },
  grey: {
    900: '#121212',
    800: '#1E1E1E',
    700: '#2A2A2A',
    600: '#4A4A4A',
    500: '#6B6B6B',
    400: '#9B9B9B',
    300: '#CCCCCC',
    200: '#E2E2E2',
  },
  green: {
    600: '#0F9D58',
    500: '#12C65E',
    400: '#4CAF50',
  },
  red: {
    600: '#C53030',
    500: '#E54848',
    400: '#F56565',
  },
  blue: {
    600: '#2563EB',
    500: '#3B82F6',
    400: '#60A5FA',
  },
  yellow: {
    600: '#D69E2E',
    500: '#ECC94B',
    400: '#F6E05E',
  },
  success: {
    500: '#12C65E',
  },
  error: {
    500: '#E54848',
  },
  white: '#FFFFFF',
} as const;

// Semantic colors for easier usage
export const colors = {
  ...baseColors,
  background: baseColors.grey[900],
  surface: baseColors.grey[800],
  text: {
    primary: baseColors.white,
    secondary: baseColors.grey[400],
  },
  textSecondary: baseColors.grey[400], // Legacy support
  border: baseColors.grey[700],
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '600' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  default: 16,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// Helper function to add opacity to colors
export const colorWithOpacity = (color: string, opacity: number): string => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `#${hex}${alpha}`;
  }

  // Handle rgb colors
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
  }

  // Return original color if format not recognized
  return color;
};
