
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading, user } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - loading:', loading, 'user:', !!user);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!user) {
    console.log('No user, redirecting to auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
