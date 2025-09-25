import { useEffect } from 'react';
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

  const triggerHapticFeedback = async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.log('Haptic feedback not available:', error);
      }
    }
  };

  const triggerSuccessHaptic = () => triggerHapticFeedback(ImpactStyle.Light);
  const triggerErrorHaptic = () => triggerHapticFeedback(ImpactStyle.Heavy);

  return {
    triggerHapticFeedback,
    triggerSuccessHaptic,
    triggerErrorHaptic,
  };
};
