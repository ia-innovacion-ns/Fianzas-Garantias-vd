import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Minus, Search, AlertTriangle, Calendar } from 'lucide-react';

interface Garantia {
  id: string;
  numero_poliza: string;
  ci_nit: string;
  region: string;
  id_garantia: string;
  tipo_garantia: string;
  tipo_operacion: string;
  moneda: string;
  valor_nominal: number;
  is_active: boolean;
  created_at: string;
}

const BajasForm = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [selectedGarantia, setSelectedGarantia] = useState<Garantia | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const searchGarantias = async () => {
    if (!searchQuery.trim()) {
      setGarantias([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('garantias')
        .select('*')
        .or(`ci_nit.ilike.%${searchQuery}%,id_garantia.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGarantias(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al buscar garantías: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchGarantias();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleBaja = async () => {
    if (!selectedGarantia) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('garantias')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
        })
        .eq('id', selectedGarantia.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Garantía dada de baja correctamente",
      });

      setShowConfirmDialog(false);
      setSelectedGarantia(null);
      searchGarantias(); // Refresh results
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al dar de baja la garantía: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: currency === 'BOB' ? 'BOB' : currency,
      minimumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const canDeactivateInRegion = (region: string) => {
    if (!profile) return false;
    if (profile.role === 'admin_user' || profile.role === 'nac_user') return true;
    return profile.region === region;
  };

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-gradient-glass border-border/50 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Minus className="w-5 h-5 text-destructive" />
            <span>Dar de Baja Garantía</span>
          </CardTitle>
          <CardDescription>
            Busque y seleccione la garantía que desea desvincular del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar por CI/NIT o ID Garantía</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Ingrese CI/NIT o ID Garantía..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>
            </div>
            
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning-foreground">
                    Importante
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    La baja de una garantía es irreversible. Asegúrese de seleccionar la garantía correcta antes de confirmar la operación.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results Table */}
      <Card className="backdrop-blur-sm bg-gradient-glass border-border/50 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <span>Garantías Activas</span>
          </CardTitle>
          <CardDescription>
            Seleccione la garantía que desea dar de baja
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSearching ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Buscando...</p>
            </div>
          ) : garantias.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Póliza</TableHead>
                    <TableHead>CI/NIT</TableHead>
                    <TableHead>Región</TableHead>
                    <TableHead>ID Garantía</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {garantias.map((garantia) => (
                    <TableRow key={garantia.id}>
                      <TableCell className="font-medium">{garantia.numero_poliza}</TableCell>
                      <TableCell>{garantia.ci_nit}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{garantia.region}</Badge>
                      </TableCell>
                      <TableCell>{garantia.id_garantia}</TableCell>
                      <TableCell>{garantia.tipo_garantia}</TableCell>
                      <TableCell>{garantia.tipo_operacion}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(garantia.valor_nominal, garantia.moneda)}
                      </TableCell>
                      <TableCell>
                        {new Date(garantia.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Dialog open={showConfirmDialog && selectedGarantia?.id === garantia.id} onOpenChange={setShowConfirmDialog}>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={!canDeactivateInRegion(garantia.region)}
                              onClick={() => setSelectedGarantia(garantia)}
                            >
                              <Minus className="w-4 h-4 mr-1" />
                              Dar de Baja
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="flex items-center space-x-2">
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                <span>Confirmar Baja</span>
                              </DialogTitle>
                              <DialogDescription>
                                ¿Está seguro que desea dar de baja la siguiente garantía? Esta acción no se puede deshacer.
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedGarantia && (
                              <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <span className="font-medium">Póliza:</span>
                                  <span>{selectedGarantia.numero_poliza}</span>
                                  <span className="font-medium">CI/NIT:</span>
                                  <span>{selectedGarantia.ci_nit}</span>
                                  <span className="font-medium">ID Garantía:</span>
                                  <span>{selectedGarantia.id_garantia}</span>
                                  <span className="font-medium">Valor:</span>
                                  <span>{formatCurrency(selectedGarantia.valor_nominal, selectedGarantia.moneda)}</span>
                                </div>
                              </div>
                            )}
                            
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowConfirmDialog(false);
                                  setSelectedGarantia(null);
                                }}
                              >
                                Cancelar
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleBaja}
                                disabled={isLoading}
                              >
                                {isLoading ? 'Procesando...' : 'Confirmar Baja'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No se encontraron garantías activas para "{searchQuery}"</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Ingrese un CI/NIT o ID Garantía para buscar garantías activas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BajasForm;