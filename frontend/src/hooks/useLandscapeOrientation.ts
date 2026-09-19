import { useState, useEffect, useCallback } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

export interface LandscapeOrientationState {
  isLandscape: boolean;
  isPortrait: boolean;
  isLocked: boolean;
  width: number;
  height: number;
  lockLandscape: () => Promise<void>;
  requestFullscreenLandscape: () => Promise<void>;
}

/**
 * Custom TypeScript React Hook for managing and locking landscape orientation.
 */
export function useLandscapeOrientation(): LandscapeOrientationState {
  const { width, height } = useWindowDimensions();
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const isLandscape = width >= height;
  const isPortrait = height > width;

  const lockLandscape = useCallback(async (): Promise<void> => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsLocked(true);
    } catch (err) {
      console.warn('ScreenOrientation lock error:', err);
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const screenAny = window.screen as unknown as {
          orientation?: {
            lock?: (orientation: string) => Promise<void>;
          };
        };
        if (screenAny?.orientation?.lock) {
          await screenAny.orientation.lock('landscape');
          setIsLocked(true);
        }
      } catch {
        // Handled silently if browser requires user gesture
      }
    }
  }, []);

  const requestFullscreenLandscape = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const docEl = document.documentElement as unknown as {
          requestFullscreen?: () => Promise<void>;
          webkitRequestFullscreen?: () => Promise<void>;
        };

        if (!document.fullscreenElement) {
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen();
          } else if (docEl.webkitRequestFullscreen) {
            await docEl.webkitRequestFullscreen();
          }
        }

        const screenAny = window.screen as unknown as {
          orientation?: {
            lock?: (orientation: string) => Promise<void>;
          };
        };
        if (screenAny?.orientation?.lock) {
          await screenAny.orientation.lock('landscape');
        }
        setIsLocked(true);
      } catch (err) {
        console.warn('Fullscreen/orientation lock request error:', err);
      }
    }
  }, []);

  useEffect(() => {
    lockLandscape();

    const subscription = ScreenOrientation.addOrientationChangeListener((evt) => {
      const isLand =
        evt.orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        evt.orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      setIsLocked(isLand);
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, [lockLandscape]);

  return {
    isLandscape,
    isPortrait,
    isLocked,
    width,
    height,
    lockLandscape,
    requestFullscreenLandscape,
  };
}
