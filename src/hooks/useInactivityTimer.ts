import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { CONFIG } from '@/constants/config';

export function useInactivityTimer() {
  const { isLocked, lockWallet } = useAuthStore();
  const backgroundTime = useRef<number | null>(null);
  const foregroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resetTimer() {
    if (isLocked) return;
    if (foregroundTimer.current) {
      clearTimeout(foregroundTimer.current);
    }
    foregroundTimer.current = setTimeout(() => {
      lockWallet();
    }, CONFIG.INACTIVITY_LIMIT_MS);
  }

  useEffect(() => {
    if (isLocked) {
      if (foregroundTimer.current) {
        clearTimeout(foregroundTimer.current);
        foregroundTimer.current = null;
      }
      return;
    }

    resetTimer();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTime.current = Date.now();
        if (foregroundTimer.current) {
          clearTimeout(foregroundTimer.current);
          foregroundTimer.current = null;
        }
      } else if (nextState === 'active') {
        if (backgroundTime.current !== null) {
          const elapsed = Date.now() - backgroundTime.current;
          backgroundTime.current = null;
          if (elapsed >= CONFIG.INACTIVITY_LIMIT_MS) {
            lockWallet();
            return;
          }
        }
        resetTimer();
      }
    });

    return () => {
      subscription.remove();
      if (foregroundTimer.current) {
        clearTimeout(foregroundTimer.current);
      }
    };
  }, [isLocked]);

  return { resetTimer };
}
