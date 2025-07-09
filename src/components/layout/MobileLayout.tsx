
import { ReactNode } from 'react';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';

interface MobileLayoutProps {
  children: ReactNode;
  headerTitle?: string;
  showTabs?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: { id: string; label: string }[];
}

export function MobileLayout({ 
  children, 
  headerTitle,
  showTabs = false,
  activeTab,
  onTabChange,
  tabs = []
}: MobileLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <MobileHeader title={headerTitle} />
      
      {showTabs && tabs.length > 0 && (
        <div className="bg-white border-b">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <main className="flex-1 pb-16 overflow-auto">
        <div className="p-4">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
