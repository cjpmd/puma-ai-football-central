import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: (active: boolean) => JSX.Element;
}

const PURPLE_ACTIVE = '#b89fff';
const PURPLE_INACTIVE = 'rgba(235,235,245,0.55)';
const STROKE_ACTIVE = 2.4;
const STROKE_INACTIVE = 2.0;

const navItems: NavItem[] = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-3v-6H10v6H5a2 2 0 01-2-2v-9z"
          stroke={active ? PURPLE_ACTIVE : PURPLE_INACTIVE}
          strokeWidth={active ? STROKE_ACTIVE : STROKE_INACTIVE}
          strokeLinejoin="round"
          fill={active ? PURPLE_ACTIVE : 'none'}
          fillOpacity={active ? 0.18 : 0}
        />
      </svg>
    ),
  },
  {
    name: 'Squad',
    href: '/players',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3.5" stroke={active ? PURPLE_ACTIVE : PURPLE_INACTIVE} strokeWidth={active ? STROKE_ACTIVE : STROKE_INACTIVE} fill={active ? PURPLE_ACTIVE : 'none'} fillOpacity={active ? 0.2 : 0}/>
        <circle cx="17" cy="9" r="2.8" stroke={active ? PURPLE_ACTIVE : PURPLE_INACTIVE} strokeWidth={active ? STROKE_ACTIVE : STROKE_INACTIVE}/>
        <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" stroke={active ? PURPLE_ACTIVE : PURPLE_INACTIVE} strokeWidth={active ? STROKE_ACTIVE : STROKE_INACTIVE} strokeLinecap="round"/>
        <path d="M14.5 20c.5-2.3 2.3-4 4.5-4s3.5 1.2 3.5 3" stroke={active ? PURPLE_ACTIVE : PURPLE_INACTIVE} strokeWidth={active ? STROKE_ACTIVE : STROKE_INACTIVE} strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    name: 'Matches',
    href: '/calendar',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={active ? PURPLE_ACTIVE : PURPLE_INACTIVE} strokeWidth={active ? STROKE_ACTIVE : STROKE_INACTIVE} fill={active ? PURPLE_ACTIVE : 'none'} fillOpacity={active ? 0.15 : 0}/>
        <path d="M12 5l2 4-2 3-2-3 2-4zM3.5 10l4-1 2 3-1.5 3.5-4-1-.5-4.5zM20.5 10l-4-1-2 3 1.5 3.5 4-1 .5-4.5zM8 20l1.5-3.5h5L16 20l-4 1-4-1z" stroke={active ? PURPLE_ACTIVE : PURPLE_INACTIVE} strokeWidth={(active ? STROKE_ACTIVE : STROKE_INACTIVE) * 0.7} strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    name: 'Training',
    href: '/training',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
          stroke={active ? PURPLE_ACTIVE : PURPLE_INACTIVE}
          strokeWidth={active ? STROKE_ACTIVE : STROKE_INACTIVE}
          strokeLinejoin="round"
          fill={active ? PURPLE_ACTIVE : 'none'}
          fillOpacity={active ? 0.2 : 0}
        />
      </svg>
    ),
  },
  {
    name: 'Profile',
    href: '/my-team',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke={active ? PURPLE_ACTIVE : PURPLE_INACTIVE} strokeWidth={active ? STROKE_ACTIVE : STROKE_INACTIVE} fill={active ? PURPLE_ACTIVE : 'none'} fillOpacity={active ? 0.2 : 0}/>
        <path d="M3 21c1-4.5 4.7-7 9-7s8 2.5 9 7" stroke={active ? PURPLE_ACTIVE : PURPLE_INACTIVE} strokeWidth={active ? STROKE_ACTIVE : STROKE_INACTIVE} strokeLinecap="round"/>
      </svg>
    ),
  },
];

export function RoleAwareBottomNav() {
  const location = useLocation();

  return (
    /* Floating pill container — sits above content, safe area aware */
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)', paddingLeft: 12, paddingRight: 12 }}
    >
      {/* Liquid glass pill */}
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
              {item.icon(isActive)}
              <span
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: 0.07,
                  color: isActive ? PURPLE_ACTIVE : PURPLE_INACTIVE,
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
