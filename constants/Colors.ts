
const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';



export const Layout = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 32,
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    medium: {
      shadowColor: '#172B4D',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    large: {
      shadowColor: '#172B4D',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};

export const Gradients = {
  primary: ['#0A84FF', '#0040DD'] as const, // Apple-esque vibrant blue
  success: ['#30D158', '#148030'] as const, // Neon green
  danger: ['#FF453A', '#99110B'] as const,  // Vibrant intense red
  warning: ['#FF9F0A', '#995B00'] as const, // Pure alert orange
  dark: ['#1C1C1E', '#09090B'] as const,    // True deep dark structure
  card: ['#18181B', '#27272A'] as const,    // Elevated dark gray cards
  authLight: ['#D6FFF6', '#E2ECFF', '#F2E8FF'] as const, // Cyan to light blue to pastel purple
  authDark: ['#0A1128', '#121C3C', '#1D1A39'] as const, // Deep navy to indigo to violet black
};

export const Colors = {
  light: {
    text: '#09090B', // Zinc 950
    textSecondary: '#71717A', // Zinc 500
    background: '#FAFAFA', // Zinc 50
    tint: '#0A84FF',
    tabIconDefault: '#A1A1AA', // Zinc 400
    tabIconSelected: '#0A84FF',
    primary: '#0A84FF',
    secondary: '#5E5CE6', // Indigo
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
    card: '#F0F9FA', // Porcelain Blue
    border: '#E4E4E7', // Zinc 200
    primaryLight: '#E5F1FF',
  },
  dark: {
    text: '#FAFAFA', // Zinc 50
    textSecondary: '#A1A1AA', // Zinc 400
    background: '#09090B', // Zinc 950 (True Deep Dark)
    tint: '#0A84FF', // Vibrant Blue
    tabIconDefault: '#52525B', // Zinc 600
    tabIconSelected: '#0A84FF',
    primary: '#0A84FF',
    secondary: '#5E5CE6', // Premium Indigo accent
    success: '#30D158',
    danger: '#FF453A',
    warning: '#FF9F0A',
    card: '#1A2342', // Premium Navy
    border: '#243160', // Deep Navy Border
    primaryLight: '#002E7A', // Deep tinted blue for selected states
  },
};
