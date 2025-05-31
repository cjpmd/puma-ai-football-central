
import { ReactNode } from 'react';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface Permission {
  resource: string;
  action: string;
  scope?: 'global' | 'club' | 'team';
  resourceId?: string;
}

interface ProtectedComponentProps {
  children: ReactNode;
  permission?: Permission;
  roles?: string[];
  fallback?: ReactNode;
  showFallback?: boolean;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  permission,
  roles,
  fallback,
  showFallback = true
}) => {
  const { hasPermission, loading } = useAuthorization();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Check permission-based access
  if (permission && !hasPermission(permission)) {
    if (!showFallback) return null;
    
    if (fallback) return <>{fallback}</>;
    
    return (
      <Alert className="border-red-200 bg-red-50">
        <Shield className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          You don't have permission to access this feature.
        </AlertDescription>
      </Alert>
    );
  }

  // Check role-based access
  if (roles) {
    // Implementation would check user roles against required roles
    // For now, we'll assume this check passes
  }

  return <>{children}</>;
};
