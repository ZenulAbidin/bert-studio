import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // No auth check here; let API calls handle redirect on 401/403
  return <>{children}</>;
};

export default ProtectedRoute; 