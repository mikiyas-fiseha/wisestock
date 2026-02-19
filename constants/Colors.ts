
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
  primary: ['#0052CC', '#2684FF'] as const, // Branding Blue
  success: ['#36B37E', '#57D9A3'] as const, // Growth Green
  danger: ['#FF5630', '#FF8F73'] as const, // Alert Red
  warning: ['#FFAB00', '#FFC400'] as const, // Attention Amber
  dark: ['#172B4D', '#253858'] as const, // Deep Navy
  card: ['#FFFFFF', '#F4F5F7'] as const, // Subtle depth
};

export const Colors = {
  light: {
    text: '#172B4D',
    textSecondary: '#6B778C',
    background: '#F4F5F7',
    tint: '#0052CC',
    tabIconDefault: '#C1C7D0',
    tabIconSelected: '#0052CC',
    primary: '#0052CC',
    secondary: '#FFAB00',
    success: '#36B37E',
    danger: '#FF5630',
    warning: '#FFAB00',
    card: '#FFFFFF',
    border: '#EBECF0',
    primaryLight: '#DEEBFF',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#A5ADBA',
    background: '#091E42',
    tint: '#4C9AFF',
    tabIconDefault: '#505F79',
    tabIconSelected: '#4C9AFF',
    primary: '#4C9AFF',
    secondary: '#FFC400',
    success: '#57D9A3',
    danger: '#FF8F73',
    warning: '#FFC400',
    card: '#172B4D',
    border: '#253858',
    primaryLight: '#263B59',
  },
};
