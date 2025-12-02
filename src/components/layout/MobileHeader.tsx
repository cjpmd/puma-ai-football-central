import { HeaderEntitySwitcher } from './HeaderEntitySwitcher';

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  // Helper function to render header content
  const renderHeaderContent = () => {
    // Override: If title is provided, show it
    if (title) {
      return <h1 className="text-sm font-semibold text-white truncate">{title}</h1>;
    }

    return <HeaderEntitySwitcher variant="mobile" />;
  };

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-500 to-cyan-400 text-white pt-[calc(theme(spacing.safe-top)+0.75rem)]">
      <div className="flex items-center justify-center h-14 px-4">
        {renderHeaderContent()}
      </div>
    </div>
  );
}
