
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

const isMobileNow = () =>
  typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;

export function useMobileDetection() {
  // Resolve on the first render, not in an effect. Starting at false meant
  // every mobile cold start mounted the desktop page first — firing its
  // queries and painting its layout — before swapping to the mobile one a
  // frame later. ResponsiveRoute picks a whole page from this value, so the
  // wrong initial answer costs a full double mount on the slowest device.
  const [isMobile, setIsMobile] = useState<boolean>(isMobileNow);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);

    // Covers both resize and orientation change, and fires only when the
    // answer actually flips rather than on every resize frame.
    mql.addEventListener('change', onChange);
    onChange();

    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
