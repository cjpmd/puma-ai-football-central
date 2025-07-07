
import { ReactNode } from 'react';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';

interface MobileLayoutProps {
  children: ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <MobileHeader />
      <main className="flex-1 pb-16 overflow-auto">
        <div className="p-4">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
