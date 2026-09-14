import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useMobileOptimizations = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Configure keyboard behavior
      Keyboard.setAccessoryBarVisible({ isVisible: false });
      
      // Handle keyboard events
      const handleKeyboardWillShow = () => {
        // Add any keyboard show logic here
      };
      
      const handleKeyboardWillHide = () => {
        // Add any keyboard hide logic here
      };

      Keyboard.addListener('keyboardWillShow', handleKeyboardWillShow);
      Keyboard.addListener('keyboardWillHide', handleKeyboardWillHide);

      return () => {
        Keyboard.removeAllListeners();
      };
    }
  }, []);

  // These are memoised because callers put them in effect dependency arrays. Returning
  // a fresh identity each render made any such effect re-run on every render - which in
  // the payment modal meant a new Cashfree order per render, in a loop.
  const triggerHapticFeedback = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.log('Haptic feedback not available:', error);
      }
    }
  }, []);

  const triggerSuccessHaptic = useCallback(
    () => triggerHapticFeedback(ImpactStyle.Light),
    [triggerHapticFeedback]
  );
  const triggerErrorHaptic = useCallback(
    () => triggerHapticFeedback(ImpactStyle.Heavy),
    [triggerHapticFeedback]
  );

  return {
    triggerHapticFeedback,
    triggerSuccessHaptic,
    triggerErrorHaptic,
  };
};
