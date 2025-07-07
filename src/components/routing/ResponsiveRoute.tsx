
import { ReactElement } from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface ResponsiveRouteProps {
  desktopComponent: ReactElement;
  mobileComponent: ReactElement;
}

export function ResponsiveRoute({ desktopComponent, mobileComponent }: ResponsiveRouteProps) {
  const isMobile = useMobileDetection();
  
  return isMobile ? mobileComponent : desktopComponent;
}
