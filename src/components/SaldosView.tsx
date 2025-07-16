import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Filter, Download, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  created_at: string;
}

interface SaldosSummary {
  total_garantias: number;
  total_valor_bob: number;
  total_valor_usd: number;
  total_valor_eur: number;
}

const SaldosView = () => {
  const { toast } = useToast();
  
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [filteredGarantias, setFilteredGarantias] = useState<Garantia[]>([]);
  const [summary, setSummary] = useState<SaldosSummary>({
    total_garantias: 0,
    total_valor_bob: 0,
    total_valor_usd: 0,
    total_valor_eur: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    search: '',
    region: 'all',
    tipo_garantia: 'all',
    moneda: 'all'
  });

  const fetchGarantias = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('garantias')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setGarantias(data || []);
      calculateSummary(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al cargar garantías: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSummary = (data: Garantia[]) => {
    const summary = data.reduce((acc, garantia) => {
      acc.total_garantias += 1;
      
      switch (garantia.moneda) {
        case 'BOB':
          acc.total_valor_bob += garantia.valor_nominal;
          break;
        case 'USD':
          acc.total_valor_usd += garantia.valor_nominal;
          break;
        case 'EUR':
          acc.total_valor_eur += garantia.valor_nominal;
          break;
      }
      
      return acc;
    }, {
      total_garantias: 0,
      total_valor_bob: 0,
      total_valor_usd: 0,
      total_valor_eur: 0
    });
    
    setSummary(summary);
  };

  const applyFilters = () => {
    let filtered = garantias;

    // Filter by search term
    if (filters.search) {
      filtered = filtered.filter(g => 
        g.ci_nit.toLowerCase().includes(filters.search.toLowerCase()) ||
        g.id_garantia.toLowerCase().includes(filters.search.toLowerCase()) ||
        g.numero_poliza.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Filter by region
    if (filters.region !== 'all') {
      filtered = filtered.filter(g => g.region === filters.region);
    }

    // Filter by guarantee type
    if (filters.tipo_garantia !== 'all') {
      filtered = filtered.filter(g => g.tipo_garantia === filters.tipo_garantia);
    }

    // Filter by currency
    if (filters.moneda !== 'all') {
      filtered = filtered.filter(g => g.moneda === filters.moneda);
    }

    setFilteredGarantias(filtered);
    calculateSummary(filtered);
  };

  useEffect(() => {
    fetchGarantias();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, garantias]);

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: currency === 'BOB' ? 'BOB' : currency,
      minimumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const exportToCSV = () => {
    const headers = [
      'Número de Póliza',
      'CI/NIT',
      'Región',
      'ID Garantía',
      'Tipo de Garantía',
      'Tipo de Operación',
      'Moneda',
      'Valor Nominal',
      'Fecha de Creación'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredGarantias.map(g => [
        g.numero_poliza,
        g.ci_nit,
        g.region,
        g.id_garantia,
        g.tipo_garantia,
        g.tipo_operacion,
        g.moneda,
        g.valor_nominal,
        new Date(g.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `saldos_garantias_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-sm bg-gradient-glass border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summary.total_garantias}</p>
                <p className="text-sm text-muted-foreground">Total Garantías</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-gradient-glass border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary.total_valor_bob, 'BOB')}</p>
                <p className="text-sm text-muted-foreground">Total BOB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-gradient-glass border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary.total_valor_usd, 'USD')}</p>
                <p className="text-sm text-muted-foreground">Total USD</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-gradient-glass border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-8 h-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary.total_valor_eur, 'EUR')}</p>
                <p className="text-sm text-muted-foreground">Total EUR</p>
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
            <span>Filtros de Búsqueda</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="CI/NIT, ID Garantía, Póliza..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Región</Label>
              <Select
                value={filters.region}
                onValueChange={(value) => setFilters({ ...filters, region: value })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las regiones</SelectItem>
                  <SelectItem value="Norte">Norte</SelectItem>
                  <SelectItem value="Sur">Sur</SelectItem>
                  <SelectItem value="Este">Este</SelectItem>
                  <SelectItem value="Oeste">Oeste</SelectItem>
                  <SelectItem value="Central">Central</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Garantía</Label>
              <Select
                value={filters.tipo_garantia}
                onValueChange={(value) => setFilters({ ...filters, tipo_garantia: value })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="Fianza">Fianza</SelectItem>
                  <SelectItem value="Hipotecaria">Hipotecaria</SelectItem>
                  <SelectItem value="Prendaria">Prendaria</SelectItem>
                  <SelectItem value="Bancaria">Bancaria</SelectItem>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={filters.moneda}
                onValueChange={(value) => setFilters({ ...filters, moneda: value })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las monedas</SelectItem>
                  <SelectItem value="BOB">BOB</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="backdrop-blur-sm bg-gradient-glass border-border/50 shadow-elegant">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span>Saldos de Garantías Activas</span>
              </CardTitle>
              <CardDescription>
                {filteredGarantias.length} garantías encontradas
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
              <p className="mt-2 text-muted-foreground">Cargando saldos...</p>
            </div>
          ) : filteredGarantias.length > 0 ? (
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
                    <TableHead>Moneda</TableHead>
                    <TableHead className="text-right">Valor Nominal</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGarantias.map((garantia) => (
                    <TableRow key={garantia.id}>
                      <TableCell className="font-medium">{garantia.numero_poliza}</TableCell>
                      <TableCell>{garantia.ci_nit}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{garantia.region}</Badge>
                      </TableCell>
                      <TableCell>{garantia.id_garantia}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{garantia.tipo_garantia}</Badge>
                      </TableCell>
                      <TableCell>{garantia.tipo_operacion}</TableCell>
                      <TableCell>
                        <Badge variant={
                          garantia.moneda === 'BOB' ? 'default' : 
                          garantia.moneda === 'USD' ? 'secondary' : 'outline'
                        }>
                          {garantia.moneda}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No se encontraron garantías con los filtros aplicados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SaldosView;