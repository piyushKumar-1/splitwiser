import { useState, useEffect } from 'react';

/**
 * Returns the current virtual keyboard height in pixels.
 * Uses the VisualViewport API to detect keyboard presence.
 * Falls back to 0 if not supported.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // The difference between window.innerHeight and visualViewport.height
      // is the keyboard height (plus any browser chrome changes)
      const diff = window.innerHeight - vv.height;
      setKeyboardHeight(diff > 50 ? diff : 0); // threshold to avoid false positives
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return keyboardHeight;
}
