
import React from 'react';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';

interface Tab {
  id: string;
  label: string;
}

interface MobileLayoutProps {
  children: React.ReactNode;
  headerTitle?: string;
  showTabs?: boolean;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  tabs?: Tab[];
  stickyTabs?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  headerTitle,
  showTabs = false,
  activeTab,
  onTabChange,
  tabs = [],
  stickyTabs = false
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileHeader title={headerTitle} />
      
      {showTabs && tabs.length > 0 && (
        <div className={`bg-white border-b ${stickyTabs ? 'sticky top-[calc(3.5rem+theme(spacing.safe-top)+0.75rem)] z-20' : ''}`}>
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className={`flex-1 overflow-y-auto pb-[calc(5rem+theme(spacing.safe-bottom))] ${stickyTabs && showTabs ? 'pt-0' : ''}`}>
        <div className="p-4">
          {children}
        </div>
      </div>
      
      <MobileBottomNav />
    </div>
  );
};
