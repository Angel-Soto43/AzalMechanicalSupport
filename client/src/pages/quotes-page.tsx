import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Folder, Plus, Trash2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Tipos para TypeScript
interface LineItem {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export default function QuotesPage() {
  const { toast } = useToast();
  
  // ================= ESTADOS DE PROVEEDORES (VENDORS) =================
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorData, setVendorData] = useState({
    companyName: "", legalRep: "", phone: "", email: "", website: "", notes: ""
  });

  // Datos mockeados de proveedores (Mientras el backend conecta la API)
  const [vendors, setVendors] = useState([
    { id: "1", companyName: "Empresa de Ingeniería A", rfc: "EIA010101ABC" },
    { id: "2", companyName: "Suministros Electromecánicos B", rfc: "SEB020202DEF" },
  ]);
  const [selectedVendor, setSelectedVendor] = useState(vendors[0]);

  // ================= ESTADOS DE COTIZACIONES (QUOTES) =================
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteData, setQuoteData] = useState({
    folio: "", date: "", commercialTerms: "", deliveryLocation: "", warranty: "", deliveryTime: ""
  });

  // Estado para la Tabla Dinámica de Partidas
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 1, description: "", quantity: 1, unit: "pza", unitPrice: 0 }
  ]);

  // ================= LÓGICA DE PARTIDAS =================
  const addLineItem = () => {
    const newItem = { id: Date.now(), description: "", quantity: 1, unit: "pza", unitPrice: 0 };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: number) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: number, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateTotalAmount = () => {
    return lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  };

  // ================= QUERIES & MUTATIONS =================
  const { data: folders = [], isLoading: loadingFolders } = useQuery<any[]>({
    queryKey: ["/api/folders"],
  });

  // Simulando los datos de la tabla principal
  const { data: quotes = [], isLoading: loadingQuotes } = useQuery<any[]>({
    queryKey: ["/api/quotes"], // Actualizado de licitaciones a quotes
  });

  const quoteMutation = useMutation({
    mutationFn: async (newQuote: any) => {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuote),
      });
      if (!res.ok) throw new Error("Error en el servidor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Registro Exitoso", description: "La cotización ha sido guardada." });
      setIsQuoteModalOpen(false);
      // Limpiar formulario...
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* BOTONERA PRINCIPAL */}
        <div className="flex justify-end gap-4">
          
          {/* MODAL: NUEVO PROVEEDOR */}
          <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                <Users className="mr-2 h-4 w-4" /> Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card text-foreground">
              <DialogHeader><DialogTitle className="border-b border-border pb-4">Registrar Nuevo Proveedor</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <Input className="col-span-2" placeholder="Razón Social" value={vendorData.companyName} onChange={e => setVendorData({...vendorData, companyName: e.target.value})} />
                <Input placeholder="Representante Legal" value={vendorData.legalRep} onChange={e => setVendorData({...vendorData, legalRep: e.target.value})} />
                <Input placeholder="Teléfono" value={vendorData.phone} onChange={e => setVendorData({...vendorData, phone: e.target.value})} />
                <Input placeholder="Correo Electrónico" type="email" value={vendorData.email} onChange={e => setVendorData({...vendorData, email: e.target.value})} />
                <Input placeholder="Sitio Web" value={vendorData.website} onChange={e => setVendorData({...vendorData, website: e.target.value})} />
                <Input className="col-span-2" placeholder="Observaciones" value={vendorData.notes} onChange={e => setVendorData({...vendorData, notes: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsVendorModalOpen(false)}>Cancelar</Button>
                <Button className="bg-[#1E40AF] text-white">Guardar Proveedor</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* MODAL: NUEVA COTIZACIÓN CON TABLA DINÁMICA */}
          <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 text-white hover:bg-blue-700 shadow-md">
                <Plus className="mr-2 h-4 w-4" /> Nueva Cotización
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl bg-card text-foreground h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="border-b border-border pb-4 text-xl">Crear Cotización Multi-Partida</DialogTitle></DialogHeader>
              
              {/* DATOS GENERALES */}
              <div className="grid grid-cols-3 gap-4 py-4 bg-muted/30 p-4 rounded-lg mb-4">
                <Input placeholder="Folio Interno (Ej. AZAL-2026)" value={quoteData.folio} onChange={e => setQuoteData({...quoteData, folio: e.target.value})} />
                
                {/* 🚀 NUEVO SELECTOR INTEGRADO AL FORMULARIO */}
                <Select onValueChange={(v) => setSelectedVendor(vendors.find(e => e.id === v)!)} value={selectedVendor?.id}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccione Empresa Destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input type="date" value={quoteData.date} onChange={e => setQuoteData({...quoteData, date: e.target.value})} />
                <Input placeholder="Lugar de Entrega" value={quoteData.deliveryLocation} onChange={e => setQuoteData({...quoteData, deliveryLocation: e.target.value})} />
                <Input placeholder="Tiempo de Entrega" value={quoteData.deliveryTime} onChange={e => setQuoteData({...quoteData, deliveryTime: e.target.value})} />
                <Input placeholder="Garantía" value={quoteData.warranty} onChange={e => setQuoteData({...quoteData, warranty: e.target.value})} />
                <Input className="col-span-3" placeholder="Condiciones Comerciales" value={quoteData.commercialTerms} onChange={e => setQuoteData({...quoteData, commercialTerms: e.target.value})} />
              </div>

              {/* TABLA DINÁMICA DE PARTIDAS */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="w-16">Partida</TableHead>
                      <TableHead>Descripción del Material</TableHead>
                      <TableHead className="w-24">Cantidad</TableHead>
                      <TableHead className="w-24">Unidad</TableHead>
                      <TableHead className="w-32">P. Unitario</TableHead>
                      <TableHead className="w-32 text-right">Importe</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-center">{index + 1}</TableCell>
                        <TableCell><Input placeholder="Descripción..." value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)} className="h-8" /></TableCell>
                        <TableCell><Input type="number" min="1" value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))} className="h-8" /></TableCell>
                        <TableCell>
                          <Select value={item.unit} onValueChange={v => updateLineItem(item.id, 'unit', v)}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="pza">Pza</SelectItem><SelectItem value="kg">Kg</SelectItem><SelectItem value="lote">Lote</SelectItem></SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input type="number" value={item.unitPrice} onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))} className="h-8" /></TableCell>
                        <TableCell className="text-right font-bold text-blue-600 bg-blue-50/50 dark:bg-blue-900/20">
                          ${(item.quantity * item.unitPrice).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* TOTALES Y ACCIONES */}
              <div className="flex justify-between items-center mt-4">
                <Button variant="outline" onClick={addLineItem} className="border-dashed border-2 border-blue-200 text-blue-600 hover:bg-blue-50">
                  <Plus className="mr-2 h-4 w-4" /> Agregar Partida
                </Button>
                <div className="text-2xl font-bold uppercase text-foreground">
                  Total: <span className="text-green-600">${calculateTotalAmount().toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <Button variant="ghost" onClick={() => setIsQuoteModalOpen(false)}>Cancelar</Button>
                <Button disabled={quoteMutation.isPending} className="bg-[#1E40AF] text-white">
                  {quoteMutation.isPending ? "Generando..." : "Generar Cotización y PDF"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* TABLA PRINCIPAL DE COTIZACIONES (DASHBOARD) */}
        <div className="w-full">
          <Card className="rounded-xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border bg-card">
              <CardTitle className="text-sm font-bold text-card-foreground uppercase">GESTIÓN DE COTIZACIONES</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/50 dark:bg-slate-800/40">
                  <TableHead className="text-xs text-muted-foreground">Folio</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Empresa Destino</TableHead>
                  <TableHead className="text-xs text-right text-muted-foreground">Monto Total</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Estado</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {loadingQuotes ? <TableRow><TableCell colSpan={4} className="text-center py-10">Cargando cotizaciones...</TableCell></TableRow> :
                    quotes.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400">Sin cotizaciones registradas.</TableCell></TableRow> :
                    quotes.map(q => (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono text-xs font-bold text-blue-600">{q.folio}</TableCell>
                        <TableCell className="text-sm font-medium">{q.empresaDestino}</TableCell>
                        <TableCell className="text-right text-sm">${Number(q.total).toLocaleString()}</TableCell>
                        <TableCell><Badge className="bg-green-100 text-green-700 border-none text-[10px]">{q.estado}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}