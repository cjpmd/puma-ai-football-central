import { HeaderEntitySwitcher } from './HeaderEntitySwitcher';

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  const renderHeaderContent = () => {
    if (title) {
      return <h1 className="text-sm font-semibold text-white truncate">{title}</h1>;
    }
    return <HeaderEntitySwitcher variant="mobile" />;
  };

  return (
    <div
      className="sticky top-0 z-40 text-white"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        background: 'linear-gradient(135deg, oklch(0.42 0.18 290), oklch(0.32 0.16 285))',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: '0 4px 24px rgba(80,20,140,0.25)',
      }}
    >
      <div className="flex items-center justify-start h-14 px-4">
        {renderHeaderContent()}
      </div>
    </div>
  );
}
