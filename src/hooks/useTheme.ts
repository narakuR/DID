import { useSettingsStore } from '@/store/settingsStore';
import { COLORS } from '@/constants/colors';

export function useTheme() {
  const theme = useSettingsStore((s) => s.theme);
  const isDark = theme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;
  return { theme, colors, isDark };
}
