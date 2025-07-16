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
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Calendar, DollarSign } from 'lucide-react';

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

const AltasForm = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    numero_poliza: '',
    ci_nit: '',
    region: profile?.region || 'Central',
    id_garantia: '',
    tipo_garantia: 'Fianza',
    tipo_operacion: 'Constitución',
    moneda: 'BOB',
    valor_nominal: ''
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('garantias')
        .insert({
          numero_poliza: formData.numero_poliza,
          ci_nit: formData.ci_nit,
          region: formData.region as any,
          id_garantia: formData.id_garantia,
          tipo_garantia: formData.tipo_garantia as any,
          tipo_operacion: formData.tipo_operacion as any,
          moneda: formData.moneda as any,
          valor_nominal: parseFloat(formData.valor_nominal)
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Garantía registrada correctamente",
      });

      // Reset form
      setFormData({
        numero_poliza: '',
        ci_nit: '',
        region: profile?.region || 'Central',
        id_garantia: '',
        tipo_garantia: 'Fianza',
        tipo_operacion: 'Constitución',
        moneda: 'BOB',
        valor_nominal: ''
      });

      // Refresh search results
      searchGarantias();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al registrar garantía: " + error.message,
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

  const canCreateInRegion = (region: string) => {
    if (!profile) return false;
    if (profile.role === 'admin_user' || profile.role === 'nac_user') return true;
    return profile.region === region;
  };

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-gradient-glass border-border/50 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-primary" />
            <span>Registrar Nueva Garantía</span>
          </CardTitle>
          <CardDescription>
            Complete el formulario para dar de alta una nueva garantía
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_poliza">Número de Póliza</Label>
              <Input
                id="numero_poliza"
                value={formData.numero_poliza}
                onChange={(e) => setFormData({ ...formData, numero_poliza: e.target.value })}
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ci_nit">CI/NIT</Label>
              <Input
                id="ci_nit"
                value={formData.ci_nit}
                onChange={(e) => {
                  setFormData({ ...formData, ci_nit: e.target.value });
                  setSearchQuery(e.target.value);
                }}
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Región</Label>
              <Select
                value={formData.region}
                onValueChange={(value) => setFormData({ ...formData, region: value })}
                disabled={profile?.role === 'reg_user'}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Norte" disabled={!canCreateInRegion('Norte')}>Norte</SelectItem>
                  <SelectItem value="Sur" disabled={!canCreateInRegion('Sur')}>Sur</SelectItem>
                  <SelectItem value="Este" disabled={!canCreateInRegion('Este')}>Este</SelectItem>
                  <SelectItem value="Oeste" disabled={!canCreateInRegion('Oeste')}>Oeste</SelectItem>
                  <SelectItem value="Central" disabled={!canCreateInRegion('Central')}>Central</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="id_garantia">ID Garantía</Label>
              <Input
                id="id_garantia"
                value={formData.id_garantia}
                onChange={(e) => {
                  setFormData({ ...formData, id_garantia: e.target.value });
                  setSearchQuery(e.target.value);
                }}
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_garantia">Tipo de Garantía</Label>
              <Select
                value={formData.tipo_garantia}
                onValueChange={(value) => setFormData({ ...formData, tipo_garantia: value })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fianza">Fianza</SelectItem>
                  <SelectItem value="Hipotecaria">Hipotecaria</SelectItem>
                  <SelectItem value="Prendaria">Prendaria</SelectItem>
                  <SelectItem value="Bancaria">Bancaria</SelectItem>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_operacion">Tipo de Operación</Label>
              <Select
                value={formData.tipo_operacion}
                onValueChange={(value) => setFormData({ ...formData, tipo_operacion: value })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Constitución">Constitución</SelectItem>
                  <SelectItem value="Renovación">Renovación</SelectItem>
                  <SelectItem value="Ampliación">Ampliación</SelectItem>
                  <SelectItem value="Reducción">Reducción</SelectItem>
                  <SelectItem value="Cancelación">Cancelación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moneda">Moneda</Label>
              <Select
                value={formData.moneda}
                onValueChange={(value) => setFormData({ ...formData, moneda: value })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOB">BOB - Boliviano</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_nominal">Valor Nominal</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="valor_nominal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_nominal}
                  onChange={(e) => setFormData({ ...formData, valor_nominal: e.target.value })}
                  required
                  className="pl-10 bg-background/50"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? 'Registrando...' : 'Registrar Garantía'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Results Table */}
      <Card className="backdrop-blur-sm bg-gradient-glass border-border/50 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <span>Garantías Relacionadas</span>
          </CardTitle>
          <CardDescription>
            Garantías asociadas al CI/NIT o ID Garantía ingresado
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No se encontraron garantías para "{searchQuery}"</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Ingrese un CI/NIT o ID Garantía para ver garantías relacionadas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AltasForm;