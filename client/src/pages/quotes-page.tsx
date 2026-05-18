import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users, FileText, MapPin, Clock, Award, Building, Folder } from "lucide-react";
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
  reqDate: string;
  quantity: number;
  unitMeasure: string;
  unitPrice: number;
}

export default function QuotesPage() {
  const { toast } = useToast();
  
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  
  // ================= ESTADOS DE PROVEEDORES (VENDORS) =================
  const [vendorData, setVendorData] = useState({
    companyName: "",       
    businessActivity: "",  
    legalAddress: "",      
    phone: "",             
    rfc: "",               
    legalRep: "",          
    email: "",             
    website: ""            
  });

  // ================= ESTADOS DE COTIZACIÓN (QUOTES) =================
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
    commercialTerms: "Precios en Moneda Nacional. IVA Incluido.",
    goodsOrigin: "Nacional",
    providerNationality: "mexicana",
    manufacturingTime: "2 meses",
    complianceWarranty: 10,
    experienceYears: 5,
    specialtyYears: 5,
    similarContracts: 3,
    bankName: "GRUPO FINANCIERO INBURSA",
    bankAccount: "000",
    bankBeneficiary: "Azal"
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 1, description: "", techRequirements: "", versionReference: "", reqDate: "", quantity: 1, unitMeasure: "Kilogramo", unitPrice: 0 }
  ]);

  const [selectedVendorId, setSelectedVendorId] = useState<string>("");

  // Estados para selector de carpetas después de generar PDF
  const [selectFolderModalOpen, setSelectFolderModalOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [rootFolders, setRootFolders] = useState<any[]>([]);
  const [subfolders, setSubfolders] = useState<any[]>([]);
  const [currentPathBreadcrumbs, setCurrentPathBreadcrumbs] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<any | null>(null);
  const [savingPdf, setSavingPdf] = useState(false);

  useEffect(() => {
    if (!selectFolderModalOpen) return;
    loadRootFolders();
  }, [selectFolderModalOpen]);

  async function loadRootFolders() {
    try {
      const [localRes, msRes] = await Promise.all([
        fetch('/api/folders', { credentials: 'include' }),
        fetch('/api/microsoft-folders', { credentials: 'include' }),
      ]);
      const locals = localRes.ok ? await localRes.json() : [];
      const mss = msRes.ok ? await msRes.json() : [];
      setRootFolders([...locals.map((f:any)=> ({...f, source: 'local'})), ...mss.map((f:any)=>({...f, source: 'microsoft'}))]);
      setSubfolders([]);
      setCurrentPathBreadcrumbs([]);
      setSelectedFolder(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudieron cargar carpetas', variant: 'destructive' });
    }
  }

  async function enterFolder(folder: any) {
    try {
      const isMicrosoft = folder.source === 'microsoft' || Number.isNaN(Number(folder.id));
      const endpoint = isMicrosoft ? `/api/microsoft-folders/${folder.id}/content` : `/api/folders/${folder.id}/content`;
      const res = await fetch(endpoint, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar carpeta');
      const data = await res.json();
      const foldersList = data.folders || [];
      setSubfolders(foldersList.map((f:any)=> ({...f, source: isMicrosoft ? 'microsoft' : 'local'})));
      setCurrentPathBreadcrumbs(data.path || [{ id: folder.id, name: folder.name }]);
      setSelectedFolder({ id: folder.id, source: isMicrosoft ? 'microsoft' : 'local', name: folder.name });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo abrir la carpeta', variant: 'destructive' });
    }
  }

  async function savePdfToSelectedFolder() {
    if (!selectedFolder || !selectedQuoteId) return;
    setSavingPdf(true);
    try {
      const res = await fetch(`/api/quotes/${selectedQuoteId}/pdf/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folderId: String(selectedFolder.id) })
      });
      if (!res.ok) {
        const body = await res.json().catch(()=>({ error: 'Error al guardar PDF' }));
        throw new Error(body.error || 'Error al guardar PDF');
      }
      const data = await res.json();
      toast({ title: 'PDF guardado', description: `PDF guardado correctamente en la carpeta. (${data.fileName})` });
      setSelectFolderModalOpen(false);
      setSelectedFolder(null);
      setSelectedQuoteId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/files-all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files/recent'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo guardar el PDF', variant: 'destructive' });
    } finally {
      setSavingPdf(false);
    }
  }

  // ================= 🚀 CONSULTAS EN TIEMPO REAL (POLLING AUTOMÁTICO) =================
  
  // Sincroniza la lista de proveedores automáticamente cada 2 segundos
  const { data: vendors = [] } = useQuery<any[]>({ 
    queryKey: ["/api/providers"],
    refetchInterval: 2000,
    refetchIntervalInBackground: true
  });

  // Sincroniza el historial de cotizaciones automáticamente cada 2 segundos
  const { data: quotes = [], isLoading: loadingQuotes } = useQuery<any[]>({ 
    queryKey: ["/api/quotes"],
    refetchInterval: 2000,
    refetchIntervalInBackground: true
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Date.now(), description: "", techRequirements: "", versionReference: "", reqDate: "", quantity: 1, unitMeasure: "Kilogramo", unitPrice: 0 }]);
  };

  const updateLineItem = (id: number, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // ================= MUTACIÓN: GUARDAR PROVEEDOR =================
  const vendorMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar el proveedor");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      toast({ title: "¡Proveedor Guardado!", description: "El proveedor se registró correctamente." });
      setIsVendorModalOpen(false);
      setVendorData({
        companyName: "", businessActivity: "", legalAddress: "", phone: "", rfc: "", legalRep: "", email: "", website: ""
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // ================= MUTACIÓN: GUARDAR COTIZACIÓN =================
  const quoteMutation = useMutation({
    mutationFn: async () => {
      const selectedVendor = vendors.find(v => v.id.toString() === selectedVendorId);

      const payload = {
        internalFolio: quoteData.folio,
        destinationCompany: selectedVendor ? selectedVendor.companyName : "Sin Asignar", 
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
        goodsOrigin: quoteData.goodsOrigin,
        providerNationality: quoteData.providerNationality,
        manufacturingTime: quoteData.manufacturingTime,
        complianceWarranty: quoteData.complianceWarranty,
        experienceYears: quoteData.experienceYears,
        specialtyYears: quoteData.specialtyYears,
        similarContracts: quoteData.similarContracts,
        bankName: quoteData.bankName,
        bankAccount: quoteData.bankAccount,
        bankBeneficiary: quoteData.bankBeneficiary,
        providerId: Number(selectedVendorId),
        lineItems: lineItems.map(item => ({
          description: item.description,
          techRequirements: item.techRequirements,
          versionReference: item.versionReference,
          reqDate: item.reqDate,
          quantity: item.quantity,
          unit: item.unitMeasure, 
          unitMeasure: item.unitMeasure,
          unitPrice: item.unitPrice
        }))
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al generar la cotización");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "¡Éxito!", description: "Cotización generada correctamente." });
      setIsQuoteModalOpen(false);
      // Abrir modal para seleccionar carpeta destino y guardar PDF
      const generatedId = data.id || data.quote?.id;
      if (generatedId) {
        setSelectedQuoteId(generatedId);
        setSelectFolderModalOpen(true);
      }
    },
    onError: (error: any) => {
      toast({ title: "Error en el formulario", description: error.message, variant: "destructive" });
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* BOTONERA SUPERIOR */}
        <div className="flex justify-end gap-3">
          
          {/* MODAL: NUEVO PROVEEDOR */}
          <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm px-6">
                <Users className="mr-2 h-4 w-4" /> Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card text-foreground">
              <DialogHeader>
                <DialogTitle className="border-b border-border pb-4 text-xl">Registrar Proveedor</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <Input className="col-span-2" placeholder="Razón social" value={vendorData.companyName} onChange={e => setVendorData({...vendorData, companyName: e.target.value})} />
                <Input className="col-span-2" placeholder="Objeto social o actividad que desarrolla" value={vendorData.businessActivity} onChange={e => setVendorData({...vendorData, businessActivity: e.target.value})} />
                <Input className="col-span-2" placeholder="Domicilio legal" value={vendorData.legalAddress} onChange={e => setVendorData({...vendorData, legalAddress: e.target.value})} />
                <Input placeholder="RFC" value={vendorData.rfc} onChange={e => setVendorData({...vendorData, rfc: e.target.value})} />
                <Input placeholder="Nombre del representante legal" value={vendorData.legalRep} onChange={e => setVendorData({...vendorData, legalRep: e.target.value})} />
                <Input placeholder="Teléfono(s)" value={vendorData.phone} onChange={e => setVendorData({...vendorData, phone: e.target.value})} />
                <Input placeholder="Correo electrónico" type="email" value={vendorData.email} onChange={e => setVendorData({...vendorData, email: e.target.value})} />
                <Input className="col-span-2" placeholder="Página web" value={vendorData.website} onChange={e => setVendorData({...vendorData, website: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                <Button variant="ghost" onClick={() => setIsVendorModalOpen(false)}>Cancelar</Button>
                <Button 
                  className="bg-[#1E40AF] text-white hover:bg-blue-800" 
                  onClick={() => vendorMutation.mutate()}
                  disabled={vendorMutation.isPending}
                >
                  {vendorMutation.isPending ? "Guardando..." : "Guardar Proveedor"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* MODAL: Seleccionar carpeta destino y guardar PDF */}
          <Dialog open={selectFolderModalOpen} onOpenChange={setSelectFolderModalOpen}>
            <DialogContent className="sm:max-w-3xl bg-card text-foreground">
              <DialogHeader>
                <DialogTitle className="border-b border-border pb-4 text-lg">Seleccionar carpeta destino</DialogTitle>
              </DialogHeader>

              <div className="p-4">
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <h4 className="text-sm font-semibold mb-2">Raíz</h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      <button className="w-full text-left p-2 border rounded hover:bg-slate-50" onClick={() => loadRootFolders()}>
                        Cargar carpetas
                      </button>
                      {(rootFolders || []).map((f: any) => (
                        <div key={f.id} className={`p-2 border rounded cursor-pointer ${selectedFolder?.id === f.id ? 'bg-slate-100' : ''}`} onClick={() => enterFolder(f)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><Folder /> <span className="font-medium">{f.name}</span></div>
                            <div className="text-xs text-slate-500">{f.source === 'microsoft' ? 'OneDrive' : 'Local'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-1/2">
                    <h4 className="text-sm font-semibold mb-2">Contenido</h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      <div className="text-xs text-slate-500 mb-2">{currentPathBreadcrumbs.map((b: any) => b.name).join(' / ')}</div>
                      {(subfolders || []).map((sf: any) => (
                        <div key={sf.id} className={`p-2 border rounded cursor-pointer ${selectedFolder?.id === sf.id ? 'bg-slate-100' : ''}`} onClick={() => enterFolder(sf)}>
                          <div className="flex items-center gap-2"><Folder /> <span className="font-medium">{sf.name}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="ghost" onClick={() => { setSelectFolderModalOpen(false); setSelectedFolder(null); }}>Cancelar</Button>
                  <Button className="bg-[#1E40AF] text-white" onClick={() => savePdfToSelectedFolder()} disabled={!selectedFolder || savingPdf}>{savingPdf ? 'Guardando...' : 'Guardar PDF aquí'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* MODAL: NUEVA PROPUESTA ECONÓMICA */}
          <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1E40AF] hover:bg-blue-900 text-white shadow-md px-6 font-semibold">
                <Plus className="mr-2 h-4 w-4" /> Nueva Propuesta Económica
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl h-[95vh] overflow-y-auto shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="text-blue-600" /> Detalle de la Propuesta (Planilla Oficial)
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                
                {/* 1. DATOS GENERALES */}
                <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 border rounded-xl">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Folio Interno AZAL</label>
                      <Input placeholder="Ej. AZAL-2026-001" value={quoteData.folio} onChange={e => setQuoteData({...quoteData, folio: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Número de Requisición</label>
                      <Input placeholder="Ej. FP06-R003-01/2026" value={quoteData.requisitionNumber} onChange={e => setQuoteData({...quoteData, requisitionNumber: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Empresa / Proveedor</label>
                      <Select onValueChange={setSelectedVendorId} value={selectedVendorId}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccione Proveedor" /></SelectTrigger>
                        <SelectContent>
                          {vendors.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.companyName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Objeto de Adquisición</label>
                      <Input placeholder="Ej. Adquisición de diversos Aluminios" value={quoteData.projectTitle} onChange={e => setQuoteData({...quoteData, projectTitle: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* 2. CONDICIONES COMERCIALES */}
                <div className="grid grid-cols-4 gap-4 p-4 border rounded-xl bg-white shadow-sm">
                  <div className="col-span-4 mb-2 border-b pb-2"><h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Clock size={16}/> Condiciones Comerciales y Entrega</h3></div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Vigencia (Días)</label>
                    <Input type="number" value={quoteData.validityDays} onChange={e => setQuoteData({...quoteData, validityDays: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Días para Pago</label>
                    <Input type="number" value={quoteData.paymentDays} onChange={e => setQuoteData({...quoteData, paymentDays: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Garantía Calidad (Meses)</label>
                    <Input type="number" value={quoteData.warrantyMonths} onChange={e => setQuoteData({...quoteData, warrantyMonths: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha Emisión</label>
                    <Input type="date" value={quoteData.date} onChange={e => setQuoteData({...quoteData, date: e.target.value})} />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Lugar de Entrega</label>
                    <Input value={quoteData.deliveryLocation} onChange={e => setQuoteData({...quoteData, deliveryLocation: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Persona de Contacto</label>
                    <Input value={quoteData.contactPerson} onChange={e => setQuoteData({...quoteData, contactPerson: e.target.value})} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tiempo Fabricación</label>
                    <Input placeholder="Ej. 2 meses" value={quoteData.manufacturingTime} onChange={e => setQuoteData({...quoteData, manufacturingTime: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Origen de Bienes</label>
                    <Input placeholder="Ej. Nacional" value={quoteData.goodsOrigin} onChange={e => setQuoteData({...quoteData, goodsOrigin: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nacionalidad Prov.</label>
                    <Input placeholder="Ej. mexicana" value={quoteData.providerNationality} onChange={e => setQuoteData({...quoteData, providerNationality: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tiempo Entrega</label>
                    <Input placeholder="Ej. 3 meses" value={quoteData.deliveryTime} onChange={e => setQuoteData({...quoteData, deliveryTime: e.target.value})} />
                  </div>
                </div>

                {/* 3. EXPERIENCIA Y DATOS BANCARIOS */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-xl bg-white shadow-sm">
                    <div className="col-span-2 mb-2 border-b pb-2"><h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Award size={16}/> Experiencia y Cumplimiento</h3></div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">% Gar. Cumplimiento</label>
                      <Input type="number" value={quoteData.complianceWarranty} onChange={e => setQuoteData({...quoteData, complianceWarranty: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Años Experiencia</label>
                      <Input type="number" value={quoteData.experienceYears} onChange={e => setQuoteData({...quoteData, experienceYears: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Años Especialidad</label>
                      <Input type="number" value={quoteData.specialtyYears} onChange={e => setQuoteData({...quoteData, specialtyYears: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Contratos Afines</label>
                      <Input type="number" value={quoteData.similarContracts} onChange={e => setQuoteData({...quoteData, similarContracts: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-xl bg-white shadow-sm">
                    <div className="col-span-2 mb-2 border-b pb-2"><h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Building size={16}/> Datos Bancarios</h3></div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre del Banco</label>
                      <Input placeholder="Ej. INBURSA" value={quoteData.bankName} onChange={e => setQuoteData({...quoteData, bankName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">CLABE / Cuenta</label>
                      <Input value={quoteData.bankAccount} onChange={e => setQuoteData({...quoteData, bankAccount: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Beneficiario</label>
                      <Input value={quoteData.bankBeneficiary} onChange={e => setQuoteData({...quoteData, bankBeneficiary: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* 4. TABLA DE PARTIDAS */}
                <div className="border rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-[#0F172A]">
                      <TableRow>
                        <TableHead className="text-white w-12 text-center font-bold text-xs">#</TableHead>
                        <TableHead className="text-white font-bold text-xs">Descripción / Espec. Técnica</TableHead>
                        <TableHead className="text-white font-bold text-xs">Req. Técnicos / Versión / Fecha</TableHead>
                        <TableHead className="text-white w-20 font-bold text-xs">Cant.</TableHead>
                        <TableHead className="text-white w-24 font-bold text-xs">U.M.</TableHead>
                        <TableHead className="text-white w-32 font-bold text-xs">P. Unitario</TableHead>
                        <TableHead className="text-white w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="text-center font-bold text-slate-400">{index + 1}</TableCell>
                          <TableCell><Input className="text-xs" placeholder="Ej. Cinta de aluminio UNS..." value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)} /></TableCell>
                          <TableCell className="space-y-1">
                            <Input className="text-[10px] h-6" placeholder="Req: FET(H)..." value={item.techRequirements} onChange={e => updateLineItem(item.id, 'techRequirements', e.target.value)} />
                            <div className="flex gap-1">
                              <Input className="text-[10px] h-6 w-1/2" placeholder="Versión: 05" value={item.versionReference} onChange={e => updateLineItem(item.id, 'versionReference', e.target.value)} />
                              <Input className="text-[10px] h-6 w-1/2" placeholder="Fecha: 04/JUN/24" value={item.reqDate} onChange={e => updateLineItem(item.id, 'reqDate', e.target.value)} />
                            </div>
                          </TableCell>
                          <TableCell><Input className="text-xs" type="number" value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))} /></TableCell>
                          <TableCell><Input className="text-xs" placeholder="Kilogramo" value={item.unitMeasure} onChange={e => updateLineItem(item.id, 'unitMeasure', e.target.value)} /></TableCell>
                          <TableCell><Input className="text-xs" type="number" value={item.unitPrice} onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))} /></TableCell>
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