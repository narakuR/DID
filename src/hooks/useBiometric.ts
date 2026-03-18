import { useState, useCallback } from 'react';
import { biometricService } from '@/services/biometricService';

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function checkAvailability(): Promise<boolean> {
    const available = await biometricService.isBiometricAvailable();
    setIsAvailable(available);
    return available;
  }

  const authenticate = useCallback(async (promptMessage?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      return await biometricService.authenticate(promptMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isAvailable, isLoading, checkAvailability, authenticate };
}
