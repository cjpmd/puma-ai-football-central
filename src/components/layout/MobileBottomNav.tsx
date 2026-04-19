
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ACTIVE_COLOR = '#b89fff';
const INACTIVE_COLOR = 'rgba(235,235,245,0.55)';

const navItems = [
  { name: 'Home',     href: '/dashboard' },
  { name: 'Players',  href: '/players' },
  { name: 'Calendar', href: '/calendar' },
  { name: 'Training', href: '/training' },
  { name: 'More',     href: '/individual-training' },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)', paddingLeft: 12, paddingRight: 12 }}
    >
      <div
        className="flex items-center justify-around w-full max-w-sm"
        style={{
          height: 64,
          borderRadius: 32,
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          background: 'rgba(20, 10, 36, 0.72)',
          border: '0.5px solid rgba(255,255,255,0.14)',
          boxShadow:
            'inset 1px 1px 0 rgba(255,255,255,0.12), inset -1px -1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(80,20,140,0.35)',
          padding: '0 8px',
        }}
      >
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className="flex flex-col items-center justify-center gap-[2px] flex-1"
              style={{
                padding: '6px 8px',
                borderRadius: 18,
                background: isActive ? 'rgba(255,255,255,0.11)' : 'transparent',
                minWidth: 52,
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
            >
              <span
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: 0.07,
                  color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                  lineHeight: '13px',
                }}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
