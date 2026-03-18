export const COLORS = {
  euBlue: '#003399',
  euYellow: '#FFCE00',

  light: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    card: '#FFFFFF',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
    header: '#FFFFFF',
    input: '#F9FAFB',
    placeholder: '#9CA3AF',
  },

  dark: {
    background: '#0F0F1A',
    surface: '#1A1A2E',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    card: '#1F2937',
    tabBar: '#1A1A2E',
    tabBarBorder: '#374151',
    header: '#1A1A2E',
    input: '#374151',
    placeholder: '#6B7280',
  },

  status: {
    active: '#10B981',
    revoked: '#EF4444',
    expired: '#EF4444',
    near_expiry: '#F59E0B',
    info: '#3B82F6',
    warning: '#F59E0B',
    success: '#10B981',
    error: '#EF4444',
  },
} as const;

// 20-entry gradient map (key → [start, end] hex colors)
export const GRADIENT_MAP: Record<string, [string, string]> = {
  blue: ['#1E40AF', '#3B82F6'],
  indigo: ['#3730A3', '#6366F1'],
  purple: ['#6B21A8', '#A855F7'],
  pink: ['#9D174D', '#EC4899'],
  rose: ['#9F1239', '#F43F5E'],
  red: ['#991B1B', '#EF4444'],
  orange: ['#9A3412', '#F97316'],
  amber: ['#92400E', '#F59E0B'],
  yellow: ['#854D0E', '#EAB308'],
  lime: ['#3F6212', '#84CC16'],
  green: ['#14532D', '#22C55E'],
  emerald: ['#064E3B', '#10B981'],
  teal: ['#134E4A', '#14B8A6'],
  cyan: ['#164E63', '#06B6D4'],
  sky: ['#0C4A6E', '#0EA5E9'],
  slate: ['#1E293B', '#64748B'],
  gray: ['#1F2937', '#6B7280'],
  zinc: ['#18181B', '#71717A'],
  eu: ['#003399', '#0055CC'],
  gold: ['#B45309', '#F59E0B'],
};

export function getGradientColors(key: string): [string, string] {
  return GRADIENT_MAP[key] ?? GRADIENT_MAP['eu'];
}
