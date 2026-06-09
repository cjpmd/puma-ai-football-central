import { cn } from '@/lib/utils';

/** Shimmer pulse applied to every skeleton bar */
const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'animate-pulse rounded-md bg-white/10',
      className
    )}
  />
);

/**
 * PageSkeleton — Suspense fallback for lazy-loaded routes.
 *
 * Renders a generic mobile-app layout skeleton (header + list rows) so the
 * screen is never blank.  0 ms delay, no spinner, matches the rough proportions
 * of every list-style screen in the app.
 */
export const PageSkeleton = () => (
  <div className="flex flex-col h-full w-full" aria-hidden="true">
    {/* Top header bar */}
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
      <Shimmer className="h-8 w-8 rounded-full" />
      <Shimmer className="h-5 w-40" />
      <div className="ml-auto">
        <Shimmer className="h-8 w-8 rounded-full" />
      </div>
    </div>

    {/* Tab row */}
    <div className="flex gap-2 px-4 py-2 border-b border-white/10">
      {[80, 60, 72].map((w) => (
        <Shimmer key={w} className={`h-7 rounded-full w-[${w}px]`} />
      ))}
    </div>

    {/* Content rows — mimics a player/event list */}
    <div className="flex flex-col gap-3 p-4 flex-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Shimmer className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
          </div>
          <Shimmer className="h-6 w-14 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>

    {/* Bottom tab bar */}
    <div className="flex justify-around items-center px-4 py-2 border-t border-white/10">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <Shimmer className="h-6 w-6 rounded" />
          <Shimmer className="h-2 w-10 rounded" />
        </div>
      ))}
    </div>
  </div>
);
