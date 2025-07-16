import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Plus, 
  Minus, 
  BarChart3, 
  FileText, 
  LogOut, 
  User,
  MapPin,
  Calendar
} from 'lucide-react';
import AltasForm from '@/components/AltasForm';
import BajasForm from '@/components/BajasForm';
import SaldosView from '@/components/SaldosView';
import AuditoriaView from '@/components/AuditoriaView';

const Dashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const [activeModule, setActiveModule] = useState('altas');

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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      'reg_user': { label: 'Regional', variant: 'secondary' as const },
      'nac_user': { label: 'Nacional', variant: 'default' as const },
      'admin_user': { label: 'Admin', variant: 'destructive' as const }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig['reg_user'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const modules = [
    {
      id: 'altas',
      label: 'Altas',
      icon: Plus,
      description: 'Registrar nuevas garantías',
      component: AltasForm
    },
    {
      id: 'bajas',
      label: 'Bajas',
      icon: Minus,
      description: 'Desvincular garantías existentes',
      component: BajasForm
    },
    {
      id: 'saldos',
      label: 'Saldos',
      icon: BarChart3,
      description: 'Consultar garantías activas',
      component: SaldosView
    },
    {
      id: 'auditoria',
      label: 'Auditoría',
      icon: FileText,
      description: 'Historial de operaciones',
      component: AuditoriaView
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/30">
      {/* Header */}
      <header className="backdrop-blur-sm bg-gradient-glass border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    Policy Shield
                  </h1>
                  <p className="text-sm text-muted-foreground">Dashboard de Garantías</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {profile && (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{profile.full_name}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      {getRoleBadge(profile.role)}
                      {profile.region && (
                        <>
                          <MapPin className="w-3 h-3" />
                          <span>{profile.region}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSignOut}
                    className="bg-background/50 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Salir
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {modules.map((module) => {
            const IconComponent = module.icon;
            return (
              <Card
                key={module.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-elegant backdrop-blur-sm border-border/50 ${
                  activeModule === module.id 
                    ? 'bg-gradient-primary text-white shadow-glow' 
                    : 'bg-gradient-glass hover:bg-gradient-secondary'
                }`}
                onClick={() => setActiveModule(module.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`w-5 h-5 ${
                      activeModule === module.id ? 'text-white' : 'text-primary'
                    }`} />
                    <CardTitle className="text-lg">{module.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className={
                    activeModule === module.id ? 'text-white/80' : 'text-muted-foreground'
                  }>
                    {module.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Module Content */}
        <div className="space-y-6">
          {modules.map((module) => {
            const Component = module.component;
            return (
              <div
                key={module.id}
                className={activeModule === module.id ? 'block' : 'hidden'}
              >
                <Component />
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;