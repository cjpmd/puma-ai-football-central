
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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

/**
 * Scroll offsets keyed by history entry.  React Router gives each entry in the
 * history stack a stable `key`, so going back returns the key we saved against
 * and a fresh navigation to the same path gets a new one — which is exactly the
 * distinction between "restore where I was" and "start at the top".
 *
 * Module-level rather than a ref: the scroll container unmounts on every route
 * change, so the offsets have to outlive the component.
 */
const scrollOffsets = new Map<string, number>();

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
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const key = location.key;
    const target = scrollOffsets.get(key) ?? 0;

    const save = () => scrollOffsets.set(key, el.scrollTop);
    el.addEventListener('scroll', save, { passive: true });

    // Route content usually arrives after mount (lazy chunk, then data), so the
    // container is too short to accept the offset on the first pass.  Retry as
    // the content grows, and stop as soon as the container has moved at all —
    // either we restored it or the user started scrolling, and in both cases
    // yanking the position again would be wrong.
    let observer: ResizeObserver | undefined;
    let timeout: number | undefined;

    if (target > 0) {
      const restore = () => {
        if (el.scrollTop !== 0) {
          observer?.disconnect();
          return;
        }
        if (el.scrollHeight - el.clientHeight >= target) {
          el.scrollTop = target;
          observer?.disconnect();
        }
      };
      restore();
      if (contentRef.current) {
        observer = new ResizeObserver(restore);
        observer.observe(contentRef.current);
        timeout = window.setTimeout(() => observer?.disconnect(), 3000);
      }
    } else {
      el.scrollTop = 0;
    }

    return () => {
      observer?.disconnect();
      if (timeout) clearTimeout(timeout);
      el.removeEventListener('scroll', save);
      save();
    };
  }, [location.key]);

  // The shell is exactly one viewport tall and owns the only scroll container.
  // If the document itself becomes scrollable, two scroll roots fight for the
  // same drag: scrolling sticks, rubber-bands, and loses position.  The usual
  // cause is a `min-h-screen` added inside the shell, or safe-area padding
  // reintroduced on <body>.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const check = window.setTimeout(() => {
      const doc = document.scrollingElement;
      if (doc && doc.scrollHeight > window.innerHeight + 1) {
        console.warn(
          `[MobileLayout] The document is scrollable (${doc.scrollHeight}px of ${window.innerHeight}px viewport). ` +
            'Only the shell container should scroll — look for min-h-screen/h-screen inside the shell, ' +
            'or safe-area padding on <body>.',
        );
      }
    }, 500);
    return () => clearTimeout(check);
  }, [location.key]);

  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden relative"
      style={{
        background:
          'radial-gradient(ellipse 1100px 900px at 80% -10%, oklch(0.50 0.20 275 / 0.85), transparent 55%),' +
          'radial-gradient(ellipse 800px 700px at 0% 60%, oklch(0.55 0.22 340 / 0.45), transparent 60%),' +
          'linear-gradient(180deg, #120823 0%, #070311 100%)',
        color: '#FFFFFF',
      }}
    >
      {/* Top safe-area fill: ensures the status-bar / dynamic-island strip
          is always covered by the app background colour without moving content. */}
      <div
        className="absolute top-0 left-0 right-0 z-0"
        style={{
          height: 'env(safe-area-inset-top)',
          background: '#120823',
        }}
        aria-hidden="true"
      />

      {/* Bottom safe-area fill: covers the iOS home indicator strip and the
          Android gesture / navigation bar area behind the floating nav. */}
      <div
        className="absolute bottom-0 left-0 right-0 z-0"
        style={{
          height: 'env(safe-area-inset-bottom)',
          background: '#070311',
        }}
        aria-hidden="true"
      />

      {!hideHeader && <MobileHeader title={headerTitle} />}

      {showTabs && tabs.length > 0 && (
        <div
          className={stickyTabs ? 'sticky z-20' : ''}
          style={{
            top: stickyTabs ? 'calc(3.5rem + max(env(safe-area-inset-top), 1rem))' : undefined,
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
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

      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto pb-[calc(5rem+theme(spacing.safe-bottom))] ${stickyTabs && showTabs ? 'pt-0' : ''}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
        }}
      >
        <div ref={contentRef} className="p-4">
          {children}
        </div>
      </div>

      <RoleAwareBottomNav />
    </div>
  );
};
