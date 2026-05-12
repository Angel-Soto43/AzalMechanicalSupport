import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users, FileText, MapPin, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LineItem {
  id: number;
  description: string;
  techRequirements: string;
  versionReference: string;
  quantity: number;
  unitMeasure: string;
  unitPrice: number;
}

export default function QuotesPage() {
  const { toast } = useToast();
  
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  
  const [vendorData, setVendorData] = useState({
    companyName: "", legalRep: "", phone: "", email: ""
  });

  const [quoteData, setQuoteData] = useState({
    folio: "",
    requisitionNumber: "",
    projectTitle: "",
    date: new Date().toISOString().split('T')[0],
    deliveryLocation: "Campo Militar No. 25-E, Oriental, Puebla",
    deliveryTime: "3 meses posteriores al fallo",
    warrantyMonths: 12,
    validityDays: 120,
    paymentDays: 17,
    contactPerson: "Tte. Cor. Ing. Ind. Omar Luna Ramírez",
    commercialTerms: "Precios en Moneda Nacional. IVA Incluido."
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 1, description: "", techRequirements: "", versionReference: "", quantity: 1, unitMeasure: "Kilogramo", unitPrice: 0 }
  ]);

  const [selectedVendorId, setSelectedVendorId] = useState<string>("");

  const { data: vendors = [] } = useQuery<any[]>({ queryKey: ["/api/providers"] });
  const { data: quotes = [], isLoading: loadingQuotes } = useQuery<any[]>({ queryKey: ["/api/quotes"] });

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Date.now(), description: "", techRequirements: "", versionReference: "", quantity: 1, unitMeasure: "Kilogramo", unitPrice: 0 }]);
  };

  const updateLineItem = (id: number, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const quoteMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        internalFolio: quoteData.folio,
        requisitionNumber: quoteData.requisitionNumber,
        projectTitle: quoteData.projectTitle,
        quoteDate: quoteData.date,
        deliveryPlace: quoteData.deliveryLocation,
        deliveryTime: quoteData.deliveryTime,
        guaranteeMonths: quoteData.warrantyMonths,
        validityDays: quoteData.validityDays,
        paymentDays: quoteData.paymentDays,
        contactPerson: quoteData.contactPerson,
        commercialTerms: quoteData.commercialTerms,
        providerId: Number(selectedVendorId),
        lineItems: lineItems.map(item => ({
          description: item.description,
          techRequirements: item.techRequirements,
          versionReference: item.versionReference,
          quantity: item.quantity,
          unitMeasure: item.unitMeasure,
          unitPrice: item.unitPrice
        }))
      };
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "¡Éxito!", description: "Cotización generada correctamente." });
      setIsQuoteModalOpen(false);
      window.open(`/api/quotes/${data.id || data.quote?.id}/pdf`, '_blank');
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* BOTONERA SUPERIOR: SOLO PROVEEDOR Y PROPUESTA ECONÓMICA */}
        <div className="flex justify-end gap-3">
          <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm px-6">
                <Users className="mr-2 h-4 w-4" /> Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Proveedor</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <Input placeholder="Razón Social" value={vendorData.companyName} onChange={e => setVendorData({...vendorData, companyName: e.target.value})} />
                <Input placeholder="Representante" value={vendorData.legalRep} onChange={e => setVendorData({...vendorData, legalRep: e.target.value})} />
                <Input placeholder="Teléfono" value={vendorData.phone} onChange={e => setVendorData({...vendorData, phone: e.target.value})} />
                <Input placeholder="Email" value={vendorData.email} onChange={e => setVendorData({...vendorData, email: e.target.value})} />
              </div>
              <Button className="w-full bg-blue-800">Guardar Proveedor</Button>
            </DialogContent>
          </Dialog>

          <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1E40AF] hover:bg-blue-900 text-white shadow-md px-6 font-semibold">
                <Plus className="mr-2 h-4 w-4" /> Nueva Propuesta Económica
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="text-blue-600" /> Detalle de la Propuesta (Planilla Oficial)
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 border rounded-xl">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Folio Interno AZAL</label>
                      <Input placeholder="Ej. AZAL-2026-001" value={quoteData.folio} onChange={e => setQuoteData({...quoteData, folio: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Número de Requisición</label>
                      <Input placeholder="Ej. FP06-R003-01/2026" value={quoteData.requisitionNumber} onChange={e => setQuoteData({...quoteData, requisitionNumber: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Empresa / Proveedor</label>
                      <Select onValueChange={setSelectedVendorId} value={selectedVendorId}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccione Proveedor" /></SelectTrigger>
                        <SelectContent>
                          {vendors.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.companyName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Objeto de Adquisición</label>
                      <Input placeholder="Ej. Adquisición de diversos Aluminios" value={quoteData.projectTitle} onChange={e => setQuoteData({...quoteData, projectTitle: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 p-4 border rounded-xl bg-white shadow-sm">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Clock size={12}/> Vigencia (Días)</label>
                    <Input type="number" value={quoteData.validityDays} onChange={e => setQuoteData({...quoteData, validityDays: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Días para Pago</label>
                    <Input type="number" value={quoteData.paymentDays} onChange={e => setQuoteData({...quoteData, paymentDays: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Garantía (Meses)</label>
                    <Input type="number" value={quoteData.warrantyMonths} onChange={e => setQuoteData({...quoteData, warrantyMonths: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Fecha Emisión</label>
                    <Input type="date" value={quoteData.date} onChange={e => setQuoteData({...quoteData, date: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><MapPin size={12}/> Lugar de Entrega</label>
                    <Input value={quoteData.deliveryLocation} onChange={e => setQuoteData({...quoteData, deliveryLocation: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Persona de Contacto</label>
                    <Input value={quoteData.contactPerson} onChange={e => setQuoteData({...quoteData, contactPerson: e.target.value})} />
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-[#0F172A]">
                      <TableRow>
                        <TableHead className="text-white w-12 text-center font-bold">#</TableHead>
                        <TableHead className="text-white font-bold">Descripción / Especificación Técnica</TableHead>
                        <TableHead className="text-white font-bold">Req. Técnicos / Versión</TableHead>
                        <TableHead className="text-white w-24 font-bold">Cant.</TableHead>
                        <TableHead className="text-white w-28 font-bold">U.M.</TableHead>
                        <TableHead className="text-white w-32 font-bold">P. Unitario</TableHead>
                        <TableHead className="text-white w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="text-center font-bold text-slate-400">{index + 1}</TableCell>
                          <TableCell><Input placeholder="Ej. Cinta de aluminio UNS..." value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)} /></TableCell>
                          <TableCell className="space-y-1">
                            <Input className="text-xs h-7" placeholder="Req: FET(H)..." value={item.techRequirements} onChange={e => updateLineItem(item.id, 'techRequirements', e.target.value)} />
                            <Input className="text-xs h-7" placeholder="Versión: 05..." value={item.versionReference} onChange={e => updateLineItem(item.id, 'versionReference', e.target.value)} />
                          </TableCell>
                          <TableCell><Input type="number" value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))} /></TableCell>
                          <TableCell><Input placeholder="Kilogramo" value={item.unitMeasure} onChange={e => updateLineItem(item.id, 'unitMeasure', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" value={item.unitPrice} onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))} /></TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => setLineItems(lineItems.filter(i => i.id !== item.id))} className="text-red-500 hover:bg-red-50"><Trash2 size={16}/></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <Button variant="outline" onClick={addLineItem} className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100 font-medium">
                    <Plus className="mr-2 h-4 w-4" /> Agregar Material
                  </Button>
                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-600 uppercase">Total Propuesta (Pesos)</p>
                    <p className="text-3xl font-black text-[#1E40AF]">${lineItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="ghost" onClick={() => setIsQuoteModalOpen(false)}>Cancelar</Button>
                  <Button onClick={() => quoteMutation.mutate()} disabled={quoteMutation.isPending} className="bg-[#1E40AF] px-10 text-white font-bold">
                    {quoteMutation.isPending ? "Generando..." : "Finalizar y Generar PDF"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* HISTORIAL */}
        <Card className="rounded-xl shadow-sm border-slate-200 overflow-hidden">
          <CardHeader className="bg-white border-b px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Historial de Cotizaciones Generadas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="bg-slate-50">
                <TableHead className="px-6 py-3 text-xs font-bold uppercase">Folio</TableHead>
                <TableHead className="px-6 py-3 text-xs font-bold uppercase">Requisición</TableHead>
                <TableHead className="px-6 py-3 text-xs font-bold uppercase">Empresa Destino</TableHead>
                <TableHead className="px-6 py-3 text-xs font-bold uppercase text-right">Monto Total</TableHead>
                <TableHead className="px-6 py-3 text-xs font-bold uppercase text-center">Estado</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loadingQuotes ? <TableRow><TableCell colSpan={5} className="text-center py-10">Cargando...</TableCell></TableRow> :
                 quotes.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">No hay registros aún.</TableCell></TableRow> :
                 quotes.map(q => (
                  <TableRow key={q.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="px-6 py-4 font-mono text-xs font-bold text-blue-700">{q.internalFolio || q.folio}</TableCell>
                    <TableCell className="px-6 py-4 text-xs text-slate-600">{q.requisitionNumber || 'N/A'}</TableCell>
                    <TableCell className="px-6 py-4 text-sm font-medium">{q.destinationCompany || 'Sin asignar'}</TableCell>
                    <TableCell className="px-6 py-4 text-right font-bold text-sm">${Number(q.total || 0).toLocaleString()}</TableCell>
                    <TableCell className="px-6 py-4 text-center"><Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-bold">COMPLETADO</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}