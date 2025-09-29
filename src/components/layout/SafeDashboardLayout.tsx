import { SmartViewProvider } from '@/contexts/SmartViewContext';
import { DashboardLayout } from './DashboardLayout';

interface SafeDashboardLayoutProps {
  children: React.ReactNode;
}

export function SafeDashboardLayout({ children }: SafeDashboardLayoutProps) {
  return (
    <SmartViewProvider>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </SmartViewProvider>
  );
}