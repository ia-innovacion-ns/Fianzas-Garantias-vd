import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/30 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Shield className="w-8 h-8 text-primary animate-pulse" />
          <span className="text-lg">Cargando...</span>
        </div>
      </div>
    );
  }

  // Si el usuario está autenticado, redirigir al dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Si no está autenticado, redirigir a la página de login
  return <Navigate to="/auth" replace />;
};

export default Index;
