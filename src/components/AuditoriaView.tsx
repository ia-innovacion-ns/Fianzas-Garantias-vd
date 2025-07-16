import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileText, Filter, Calendar, User, Activity, Download } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  old_values: any;
  new_values: any;
  ip_address: unknown;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    role: string;
  } | null;
}

const AuditoriaView = () => {
  const { toast } = useToast();
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    search: '',
    action: 'all',
    date_from: '',
    date_to: ''
  });

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      // First, get audit logs
      const { data: auditData, error: auditError } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (auditError) throw auditError;

      // Then get profiles data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, role');

      if (profilesError) throw profilesError;

      // Combine the data
      const combinedData = auditData?.map(log => ({
        ...log,
        profiles: profilesData?.find(profile => profile.user_id === log.user_id) || null
      })) || [];
      
      setAuditLogs(combinedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al cargar el log de auditoría: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = auditLogs;

    // Filter by search term
    if (filters.search) {
      filtered = filtered.filter(log => 
        log.profiles?.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.profiles?.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.action.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.table_name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Filter by action
    if (filters.action !== 'all') {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    // Filter by date range
    if (filters.date_from) {
      filtered = filtered.filter(log => 
        new Date(log.created_at) >= new Date(filters.date_from)
      );
    }

    if (filters.date_to) {
      filtered = filtered.filter(log => 
        new Date(log.created_at) <= new Date(filters.date_to + 'T23:59:59')
      );
    }

    setFilteredLogs(filtered);
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, auditLogs]);

  const getActionBadge = (action: string) => {
    const actionConfig = {
      'INSERT': { label: 'Creación', variant: 'default' as const, color: 'bg-success' },
      'UPDATE': { label: 'Actualización', variant: 'secondary' as const, color: 'bg-warning' },
      'DELETE': { label: 'Eliminación', variant: 'destructive' as const, color: 'bg-destructive' }
    };
    
    const config = actionConfig[action as keyof typeof actionConfig] || 
                  { label: action, variant: 'outline' as const, color: 'bg-muted' };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      'reg_user': { label: 'Regional', variant: 'secondary' as const },
      'nac_user': { label: 'Nacional', variant: 'default' as const },
      'admin_user': { label: 'Admin', variant: 'destructive' as const }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || 
                  { label: role, variant: 'outline' as const };
    
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('es-BO'),
      time: date.toLocaleTimeString('es-BO', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })
    };
  };

  const exportToCSV = () => {
    const headers = [
      'Fecha',
      'Hora',
      'Usuario',
      'Email',
      'Rol',
      'Acción',
      'Tabla',
      'IP'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => {
        const { date, time } = formatDateTime(log.created_at);
        return [
          date,
          time,
          log.profiles?.full_name || 'N/A',
          log.profiles?.email || 'N/A',
          log.profiles?.role || 'N/A',
          log.action,
          log.table_name,
          log.ip_address ? String(log.ip_address) : 'N/A'
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `auditoria_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="backdrop-blur-sm bg-gradient-glass border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold">
                  {auditLogs.filter(log => log.action === 'INSERT').length}
                </p>
                <p className="text-sm text-muted-foreground">Altas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-gradient-glass border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">
                  {auditLogs.filter(log => log.action === 'UPDATE').length}
                </p>
                <p className="text-sm text-muted-foreground">Modificaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-gradient-glass border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">
                  {auditLogs.filter(log => log.action === 'DELETE').length}
                </p>
                <p className="text-sm text-muted-foreground">Bajas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="backdrop-blur-sm bg-gradient-glass border-border/50 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-primary" />
            <span>Filtros de Auditoría</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="Usuario, email, acción..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Acción</Label>
              <Select
                value={filters.action}
                onValueChange={(value) => setFilters({ ...filters, action: value })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  <SelectItem value="INSERT">Creación</SelectItem>
                  <SelectItem value="UPDATE">Actualización</SelectItem>
                  <SelectItem value="DELETE">Eliminación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha desde</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha hasta</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="bg-background/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="backdrop-blur-sm bg-gradient-glass border-border/50 shadow-elegant">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>Registro de Auditoría</span>
              </CardTitle>
              <CardDescription>
                {filteredLogs.length} registros encontrados
              </CardDescription>
            </div>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="bg-background/50"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Cargando auditoría...</p>
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Tabla</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const { date, time } = formatDateTime(log.created_at);
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{date}</span>
                            <span className="text-xs text-muted-foreground">{time}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <span className="font-medium">
                              {log.profiles?.full_name || 'Usuario eliminado'}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                {log.profiles?.email || 'N/A'}
                              </span>
                              {log.profiles?.role && getRoleBadge(log.profiles.role)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.table_name}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.ip_address ? String(log.ip_address) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {log.action === 'INSERT' && log.new_values && (
                            <div className="text-xs text-muted-foreground">
                              Creado: {log.new_values.numero_poliza || log.new_values.id || 'N/A'}
                            </div>
                          )}
                          {log.action === 'UPDATE' && (
                            <div className="text-xs text-muted-foreground">
                              Modificado
                            </div>
                          )}
                          {log.action === 'DELETE' && log.old_values && (
                            <div className="text-xs text-muted-foreground">
                              Eliminado: {log.old_values.numero_poliza || log.old_values.id || 'N/A'}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No se encontraron registros con los filtros aplicados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditoriaView;