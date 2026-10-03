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
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadows: {
    small: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    medium: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    large: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.12,
      shadowRadius: 32,
      elevation: 8,
    },
    glow: (color: string) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    }),
  },
};

export const Gradients = {
  primary: ['#3B82F6', '#2563EB'] as const,     // Vibrant modern royal blue
  success: ['#10B981', '#059669'] as const,     // Emerald vibrant
  danger: ['#EF4444', '#DC2626'] as const,      // Crimson
  warning: ['#F59E0B', '#D97706'] as const,     // Amber gold
  dark: ['#111827', '#0B0F19'] as const,        // Obsidian surface
  card: ['#111827', '#161F30'] as const,        // Modern dark glass slate
  authLight: ['#F8FAFC', '#EFF6FF', '#F1F5F9'] as const, // Subtle pearl to soft blue sheen
  authDark: ['#0B0F19', '#111827', '#0F274A'] as const,  // Deep obsidian to dark midnight blue
};

export const Colors = {
  light: {
    text: '#0F172A',              // Slate 900 (heading slate)
    textSecondary: '#64748B',     // Slate 500 (muted secondary text)
    background: '#F8FAFC',        // Slate 50 (clean light surface background)
    tint: '#2563EB',              // Blue 600
    tabIconDefault: '#94A3B8',    // Slate 400
    tabIconSelected: '#2563EB',
    primary: '#2563EB',           // Royal Blue 600
    secondary: '#3B82F6',         // Blue 500
    success: '#047857',           // High contrast emerald
    danger: '#B91C1C',            // High contrast crimson
    warning: '#B45309',           // High contrast amber
    card: '#FFFFFF',              // Pure White surface
    cardBorder: '#E2E8F0',        // Slate 200 (1px clean border)
    cardHover: '#F1F5F9',         // Slate 100
    border: '#E2E8F0',            // Slate 200 (1px clean border)
    primaryLight: '#EFF6FF',      // Blue 50
    glass: 'rgba(255, 255, 255, 0.85)',
    ring: 'rgba(37, 99, 235, 0.25)',
    // Status Badges
    successBg: '#ECFDF5',
    successText: '#047857',
    warningBg: '#FFFBEB',
    warningText: '#B45309',
    dangerBg: '#FEF2F2',
    dangerText: '#B91C1C',
    infoBg: '#EFF6FF',
    infoText: '#1D4ED8',
  },
  dark: {
    text: '#F8FAFC',              // Slate 50 (crisp heading)
    textSecondary: '#94A3B8',     // Slate 400 (muted secondary)
    background: '#0F172A',        // Slate 900 (dark theme background)
    tint: '#3B82F6',              // Electric Blue 500
    tabIconDefault: '#64748B',    // Slate 500
    tabIconSelected: '#3B82F6',
    primary: '#3B82F6',           // Electric Blue 500
    secondary: '#60A5FA',         // Blue 400
    success: '#34D399',           // Emerald 400
    danger: '#F87171',            // Red 400
    warning: '#FBBF24',           // Amber 400
    card: '#1E293B',              // Slate 800 (dark theme surface)
    cardBorder: 'rgba(255, 255, 255, 0.1)', // 1px clean border highlight
    cardHover: '#334155',         // Slate 700
    border: 'rgba(255, 255, 255, 0.1)',    // 1px clean border
    primaryLight: 'rgba(59, 130, 246, 0.15)',
    glass: 'rgba(30, 41, 59, 0.75)',
    ring: 'rgba(59, 130, 246, 0.35)',
    // Status Badges (Dark Mode)
    successBg: 'rgba(16, 185, 129, 0.15)',
    successText: '#34D399',
    warningBg: 'rgba(245, 158, 11, 0.15)',
    warningText: '#FBBF24',
    dangerBg: 'rgba(239, 68, 68, 0.15)',
    dangerText: '#F87171',
    infoBg: 'rgba(59, 130, 246, 0.15)',
    infoText: '#60A5FA',
  },
};

export function withOpacity(color: string, opacity: number): string {
  if (!color) return color;
  if (color.startsWith('rgba') || color.startsWith('rgb')) {
    return color.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/, `rgba($1, $2, $3, ${opacity})`);
  }
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }
  return color;
}

