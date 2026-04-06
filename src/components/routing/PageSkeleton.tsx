import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const PageSkeleton = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <LoadingSpinner size="lg" message="Loading..." />
  </div>
);
