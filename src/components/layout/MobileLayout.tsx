
import React from 'react';
import { MobileHeader } from './MobileHeader';
import { RoleAwareBottomNav } from './RoleAwareBottomNav';

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
  hideHeader?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  headerTitle,
  showTabs = false,
  activeTab,
  onTabChange,
  tabs = [],
  stickyTabs = false,
  hideHeader = false,
}) => {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          'radial-gradient(ellipse 1100px 900px at 80% -10%, oklch(0.50 0.20 275 / 0.85), transparent 55%),' +
          'radial-gradient(ellipse 800px 700px at 0% 60%, oklch(0.55 0.22 340 / 0.45), transparent 60%),' +
          'linear-gradient(180deg, #120823 0%, #070311 100%)',
        color: '#FFFFFF',
      }}
    >
      {!hideHeader && <MobileHeader title={headerTitle} />}

      {showTabs && tabs.length > 0 && (
        <div
          className={stickyTabs ? 'sticky z-20' : ''}
          style={{
            top: stickyTabs ? 'calc(3.5rem + max(env(safe-area-inset-top), 1rem))' : undefined,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            background: 'rgba(20,10,36,0.65)',
            borderBottom: '0.5px solid rgba(255,255,255,0.10)',
          }}
        >
          <div className="flex w-full overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className="flex-1 py-3 px-1 text-xs font-medium transition-colors text-center min-w-0"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                  color: activeTab === tab.id ? '#b89fff' : 'rgba(235,235,245,0.55)',
                  borderBottom: activeTab === tab.id ? '2px solid #b89fff' : '2px solid transparent',
                  background: 'transparent',
                }}
              >
                <span className="block truncate">{tab.label}</span>
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

      <RoleAwareBottomNav />
    </div>
  );
};
