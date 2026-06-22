import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// 🚀 AÑADIDOS LOS ICONOS NUEVOS PARA LAS TARJETAS (Building2, Package, Wrench, ArrowLeft)
import { Plus, Trash2, Users, FileText, Clock, Award, Building, Folder, MoreVertical, Download, Edit3, Building2, Package, Wrench, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DynamicFormRenderer } from "@/components/quotations/DynamicFormRenderer";
import type { AMSFormData, QuoteFormType } from "@/components/quotations/forms/form-types";
import { defaultAMSFormData, defaultLineItem } from "@/components/quotations/forms/form-types";

interface LineItem {
  id: number;
  description: string;
  techRequirements: string;
  versionReference: string;
  reqDate: string;
  quantity: number;
  unitMeasure: string;
  unitPrice: number; 
  supplier: string;
  purchaseCost: number;
  profitMargin: number;
  profitFactor: number;
}

const unitMeasureAbbreviations: Record<string, string> = {
  kilogramo: "KG",
  pieza: "PZA",
  metro: "M",
  litro: "LT",
  unidad: "UND",
};

const normalizeUnitMeasure = (value: string) => {
  if (!value || typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  return unitMeasureAbbreviations[normalized] || value;
};

export default function QuotesPage() {
  const { toast } = useToast();
  
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // 🚀 NUEVOS ESTADOS PARA EL WIZARD (PASOS)
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedType, setSelectedType] = useState("");
  
  // ================= ESTADOS DE PROVEEDORES (VENDORS) =================
  const [vendorData, setVendorData] = useState({
    companyName: "",       
    businessActivity: "",  
    legalAddress: "",      
    phone: "",             
    rfc: "",               
    legalRep: "",          
    email: "",             
    website: "",
    bankName: "",
    bankAccount: "",
    bankBeneficiary: ""
  });

  // ================= ESTADOS DE COTIZACIÓN (QUOTES) =================
  const [quoteData, setQuoteData] = useState({
    folio: "",
    requisitionNumber: "",
    destinationCompany: "", 
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
    providerNationality: "Mexicana",
    manufacturingTime: "2 meses",
    complianceWarranty: 10,
    experienceYears: 5,
    specialtyYears: 5,
    similarContracts: 3,
    bankName: "GRUPO FINANCIERO INBURSA",
    bankAccount: "000",
    bankBeneficiary: "Azal"
  });

  const [quoteType, setQuoteType] = useState<QuoteFormType>("bienes");
  const [amsFormData, setAmsFormData] = useState<AMSFormData>(defaultAMSFormData);

  // 🚀 INICIALIZAMOS LOS NUEVOS CAMPOS INTERNOS EN LA PARTIDA VACÍA
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 1, description: "", techRequirements: "", versionReference: "", reqDate: "", quantity: 1, unitMeasure: "KG", unitPrice: 0, supplier: "", purchaseCost: 0, profitMargin: 0, profitFactor: 1 }
  ]);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedVendorId, setSelectedVendorId] = useState<string>("");

  const [selectFolderModalOpen, setSelectFolderModalOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  // Estado de edición: id y folio original de la cotización que se está editando
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [editingFolio, setEditingFolio] = useState<string>("");
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

  const { data: vendors = [] } = useQuery<any[]>({ 
    queryKey: ["/api/providers"],
    refetchInterval: 2000,
    refetchIntervalInBackground: true
  });

  const selectedVendor = vendors.find(v => v.id?.toString() === selectedVendorId);

  const { data: quotes = [], isLoading: loadingQuotes } = useQuery<any[]>({ 
    queryKey: ["/api/quotes"],
    refetchInterval: 2000,
    refetchIntervalInBackground: true
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredQuotes = quotes.filter((q) => {
    if (!normalizedSearch) return true;
    const searchFields = [
      q.internalFolio,
      q.folio,
      q.requisitionNumber,
      q.destinationCompany,
      q.total?.toString(),
    ];
    return searchFields.some((field) =>
      field?.toString().toLowerCase().includes(normalizedSearch)
    );
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Date.now(), description: "", techRequirements: "", versionReference: "", reqDate: "", quantity: 1, unitMeasure: "KG", unitPrice: 0, supplier: "", purchaseCost: 0, profitMargin: 0, profitFactor: 1 }]);
  };

  const updateLineItem = (id: number, field: keyof LineItem, value: any) => {
    const cellValue = field === 'unitMeasure' ? normalizeUnitMeasure(value) : value;
    
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item;
      
      const newItem = { ...item, [field]: cellValue };

      if (field === 'purchaseCost' || field === 'profitMargin') {
        const cost = field === 'purchaseCost' ? Number(value || 0) : item.purchaseCost;
        const margin = field === 'profitMargin' ? Number(value || 0) : item.profitMargin;
        const factor = 1 + (margin / 100);
        newItem.profitFactor = Number(factor.toFixed(2));
        newItem.unitPrice = Number((cost * factor).toFixed(2)); 
      } else if (field === 'profitFactor') {
        const factor = Number(value || 1);
        newItem.profitMargin = Number(((factor - 1) * 100).toFixed(2));
        newItem.unitPrice = Number((item.purchaseCost * factor).toFixed(2));
      }

      return newItem;
    }));
  };

  // Carga todos los datos de una cotización existente en el formulario AMS
  const handleEditQuote = async (q: any) => {
    try {
      const res = await fetch(`/api/quotes/${q.id}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al cargar la cotización" }));
        throw new Error(err.error || "No se pudo cargar la cotización");
      }
      const data = await res.json();
      const { quote: fullQuote, lineItems: fullLineItems } = data;

      // Mapear campos del backend al formato exacto de AMSFormData
      const hasManufacturingTimeBool = fullQuote.hasManufacturingTime ?? !!(fullQuote.manufacturingTime?.trim());
      const mapped: any = {
        ...defaultAMSFormData,
        // ─── Sección 1 ──────────────────────────────────────────────────────
        attnDia: fullQuote.attnDia || "",
        attnMes: fullQuote.attnMes || "",
        attnAnio: fullQuote.attnAnio || "",
        attnLugar: fullQuote.attnLugar || "",
        attnGrado: fullQuote.attnGrado || "",
        contactPerson: fullQuote.contactPerson || "",
        destinationCompany: fullQuote.destinationCompany || "",
        attnArea: fullQuote.attnArea || "",
        attnUbicacion: fullQuote.attnUbicacion || "",
        attnDireccion: fullQuote.attnDireccion || "",
        projectTitle: fullQuote.requisitionNumber || fullQuote.projectTitle || "",
        attnContacto: fullQuote.attnContacto || "",
        attnCargo: fullQuote.attnCargo || "",
        // ─── Sección 2 ──────────────────────────────────────────────────────
        validityDays: Number(fullQuote.validityDays) || 120,
        paymentTerms: fullQuote.paymentTerms || "",
        goodsOrigin: fullQuote.goodsOrigin || "Nacional",
        deliveryTime: fullQuote.deliveryTime || "",
        manufacturingTime: fullQuote.manufacturingTime || "",
        hasManufacturingTime: hasManufacturingTimeBool,
        deliverySingle: fullQuote.deliverySingle ?? true,
        deliveryLocation: fullQuote.deliveryPlace || "",
        deliveryLocations: Array.isArray(fullQuote.deliveryLocations) ? fullQuote.deliveryLocations : [],
        deliveryDates: Array.isArray(fullQuote.deliveryDates) ? fullQuote.deliveryDates : [],
        deliveryConditions: Array.isArray(fullQuote.deliveryConditions) ? fullQuote.deliveryConditions : [],
        // ─── Sección HGW: Región Militar y Garantía ─────────────────────────
        hasRegionalMilitary: fullQuote.hasRegionalMilitary ?? false,
        warrantyPercentageApplies: fullQuote.warrantyPercentageApplies ?? false,
        warrantyPercentage: fullQuote.warrantyPercentage ? Number(fullQuote.warrantyPercentage) : undefined,
        deliveryNotes: fullQuote.deliveryNotes ?? "",
        // ─── Sección 3 ──────────────────────────────────────────────────────
        qualityGuarantees: Array.isArray(fullQuote.qualityGuarantees) && fullQuote.qualityGuarantees.length > 0
          ? fullQuote.qualityGuarantees
          : [""],
        selectedSocialObjects: Array.isArray(fullQuote.selectedSocialObjects) ? fullQuote.selectedSocialObjects : [],
        // ─── Partidas ────────────────────────────────────────────────────────
        lineItems: Array.isArray(fullLineItems) && fullLineItems.length > 0
          ? fullLineItems.map((li: any, idx: number) => ({
              id: li.id || idx + 1,
              noPartida: li.noPartida || "",
              description: li.description || "",
              techRequirements: li.techRequirements || "",
              versionReference: li.versionReference || "",
              reqDate: li.reqDate || "",
              quantity: Number(li.quantity) || 1,
              unitMeasure: li.unitMeasure || li.unit || "PZA",
              unitPrice: Number(li.unitPrice) || 0,
              supplier: li.supplier || "",
              purchaseCost: Number(li.purchaseCost) || 0,
              profitFactor: Number(li.profitFactor) || 1,
              previo: (Number(li.purchaseCost) || 0) * (Number(li.profitFactor) || 1),
              importe: (Number(li.purchaseCost) || 0) * (Number(li.quantity) || 1),
            }))
          : [{ ...defaultLineItem }],
      };

      setAmsFormData(mapped as AMSFormData);
      setEditingQuoteId(q.id);
      setEditingFolio(fullQuote.internalFolio || fullQuote.folio || "");

      const resolvedCompany = (fullQuote.companyOrigin || "AMS").toUpperCase();
      const resolvedType = (fullQuote.proposalType || "bienes") as QuoteFormType;
      setSelectedCompany(resolvedCompany);
      setSelectedType(resolvedType === "bienes" ? "Bienes" : "Servicios");
      setQuoteType(resolvedType);
      setWizardStep(3);
      setIsQuoteModalOpen(true);
    } catch (err: any) {
      toast({ title: "Error al cargar la cotización", description: err.message, variant: "destructive" });
    }
  };

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
        companyName: "", businessActivity: "", legalAddress: "", phone: "", rfc: "", legalRep: "", email: "", website: "",
        bankName: "", bankAccount: "", bankBeneficiary: "" 
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const quoteMutation = useMutation({
    mutationFn: async () => {
      const items = amsFormData.lineItems ?? [];
      if (items.length === 0) {
        throw new Error("Debe agregar al menos una partida antes de generar la propuesta.");
      }
      const emptyDescItems = items.filter(i => !i.description?.trim());
      if (emptyDescItems.length > 0) {
        throw new Error("Todas las partidas deben tener descripción.");
      }
      const invalidQtyItems = items.filter(i => !Number.isInteger(Number(i.quantity)) || Number(i.quantity) <= 0);
      if (invalidQtyItems.length > 0) {
        throw new Error("La cantidad de cada partida debe ser un número entero mayor a cero.");
      }

      // M-01/M-02: Buscar proveedor correspondiente a la empresa seleccionada
      const matchedVendor = vendors.find(v =>
        v.companyName && v.companyName.toUpperCase().includes(selectedCompany.toUpperCase())
      );
      if (!matchedVendor) {
        throw new Error(`No se encontró un proveedor registrado para "${selectedCompany}". Regístralo primero en "Nuevo Proveedor".`);
      }
      const provId = Number(matchedVendor.id);

      // En edición se conserva el folio original; en creación se genera uno único
      const isEditing = editingQuoteId !== null;
      const folio = isEditing
        ? editingFolio
        : `${selectedCompany.toUpperCase()}-${quoteType === 'bienes' ? 'B' : 'S'}-${Date.now()}`;

      // M-03: Payload construido con el formato exacto que espera el backend
      const payload = {
        internalFolio: folio,
        destinationCompany: amsFormData.destinationCompany?.trim() || "",
        requisitionNumber: amsFormData.projectTitle?.trim() || "S/N",
        companyOrigin: selectedCompany,
        proposalType: quoteType,
        projectTitle: amsFormData.projectTitle?.trim() || "",
        quoteDate: new Date().toISOString().split('T')[0],
        deliveryPlace: amsFormData.deliveryLocation?.trim() || amsFormData.deliveryLocations?.[0]?.address?.trim() || "Por definir",
        deliveryTime: amsFormData.deliveryTime || "Por definir",
        guaranteeMonths: 12,
        validityDays: Number(amsFormData.validityDays) || 120,
        paymentDays: 17,
        contactPerson: amsFormData.contactPerson?.trim() || "",
        commercialTerms: "Precios en Moneda Nacional. IVA Incluido.",

        providerId: provId,

        goodsOrigin: amsFormData.goodsOrigin || "Nacional",
        providerNationality: "Mexicana",
        manufacturingTime: amsFormData.hasManufacturingTime ? (amsFormData.manufacturingTime || "") : "",
        complianceWarranty: 10,
        experienceYears: 5,
        specialtyYears: 5,
        similarContracts: 3,

        bankName: matchedVendor.bankName || "",
        bankAccount: matchedVendor.bankAccount || "",
        bankBeneficiary: matchedVendor.bankBeneficiary || "",
        empresaId: provId,
        templateName: `${selectedCompany}:${quoteType}`,

        // ─── Sección 1 "Atención" ──────────────────────────────────────────
        attnDia: amsFormData.attnDia || "",
        attnMes: amsFormData.attnMes || "",
        attnAnio: amsFormData.attnAnio || "",
        attnLugar: amsFormData.attnLugar || "",
        attnGrado: amsFormData.attnGrado || "",
        attnArea: amsFormData.attnArea || "",
        attnUbicacion: amsFormData.attnUbicacion || "",
        attnDireccion: amsFormData.attnDireccion || "",
        attnCargo: amsFormData.attnCargo || "",
        attnContacto: amsFormData.attnContacto || "",

        // ─── Sección 2 "Condiciones" ───────────────────────────────────────
        paymentTerms: amsFormData.paymentTerms || "",
        hasManufacturingTime: amsFormData.hasManufacturingTime ?? false,
        deliverySingle: amsFormData.deliverySingle ?? true,
        deliveryLocations: amsFormData.deliveryLocations || [],

        // ─── Sección 2: Fechas y condiciones de entrega ────────────────────
        deliveryDates: (amsFormData as any).deliveryDates || [],
        deliveryConditions: (amsFormData as any).deliveryConditions || [],

        // ─── Sección HGW: Región Militar y Garantía ────────────────────────
        hasRegionalMilitary: (amsFormData as any).hasRegionalMilitary ?? false,
        warrantyPercentageApplies: (amsFormData as any).warrantyPercentageApplies ?? false,
        warrantyPercentage: (amsFormData as any).warrantyPercentage ?? 0,
        deliveryNotes: (amsFormData as any).deliveryNotes ?? "",

        // ─── Sección 3 "Garantías y objetos sociales" ─────────────────────
        qualityGuarantees: amsFormData.qualityGuarantees || [],
        selectedSocialObjects: amsFormData.selectedSocialObjects || [],

        lineItems: items.map(item => ({
          noPartida: item.noPartida || "",
          description: item.description,
          techRequirements: item.techRequirements || "",
          versionReference: item.versionReference || "",
          reqDate: item.reqDate || "",
          quantity: Math.round(Number(item.quantity)),
          unit: item.unitMeasure || "PZA",
          unitMeasure: item.unitMeasure || "PZA",
          unitPrice: Number(item.unitPrice) || 0,
          supplier: item.supplier || "",
          purchaseCost: Number(item.purchaseCost) || 0,
          profitFactor: Number(item.profitFactor) || 1,
          importe: Number(item.importe) || 0,
          previo: Number(item.previo) || 0,
        })),
      };

      const url = isEditing ? `/api/quotes/${editingQuoteId}` : "/api/quotes";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error de red al procesar la solicitud." }));
        throw new Error(err.error || "Error al generar la cotización.");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      const wasEditing = editingQuoteId !== null;
      const folio = data.quote?.internalFolio || data.internalFolio || "";
      toast({
        title: wasEditing ? "¡Propuesta actualizada!" : "¡Propuesta generada con éxito!",
        description: folio ? `Folio: ${folio}` : "La operación se realizó correctamente.",
      });
      setIsQuoteModalOpen(false);
      setAmsFormData(defaultAMSFormData);
      setEditingQuoteId(null);
      setEditingFolio("");
      // Abrir selector de carpeta sólo al crear (no al actualizar)
      if (!wasEditing) {
        const generatedId = data.id || data.quote?.id;
        if (generatedId) {
          setSelectedQuoteId(generatedId);
          setSelectFolderModalOpen(true);
        }
      }
    },
    onError: (error: any) => {
      const title = editingQuoteId !== null ? "Error al actualizar propuesta" : "Error al generar propuesta";
      toast({ title, description: error.message, variant: "destructive" });
    }
  });
  

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 p-6 flex flex-col gap-6 w-full">
        
        {/* BOTONERA SUPERIOR */}
        <div className="flex items-center justify-end gap-4 w-full">
          <div className="w-44 min-w-0">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Folio, Requisición, Empresa o Monto"
              className="min-w-0 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm transition duration-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200/60 dark:bg-[rgba(28,37,65,0.72)] dark:border-[rgba(0,180,216,0.22)] dark:text-[#E0FBFC] dark:placeholder:text-slate-500 dark:shadow-[0_0_24px_rgba(0,180,216,0.12)] dark:backdrop-blur-xl dark:focus:border-cyan-400 dark:focus:ring-cyan-400/25"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3">
          
          {/* MODAL: NUEVO PROVEEDOR */}
          <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white shadow-sm px-6">
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
                <div className="col-span-2 mt-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Datos Bancarios</h3>
                </div>
                <Input placeholder="Nombre del Banco (Ej. INBURSA)" value={vendorData.bankName} onChange={e => setVendorData({...vendorData, bankName: e.target.value})} />
                <Input placeholder="CLABE / Cuenta" maxLength={18} value={vendorData.bankAccount} onChange={e => setVendorData({...vendorData, bankAccount: e.target.value})} />
                <Input className="col-span-2" placeholder="Beneficiario" value={vendorData.bankBeneficiary} onChange={e => setVendorData({...vendorData, bankBeneficiary: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                <Button variant="ghost" onClick={() => setIsVendorModalOpen(false)}>Cancelar</Button>
                <Button 
                  className="bg-[#1E40AF] text-white hover:bg-blue-800" 
                  onClick={() => vendorMutation.mutate()}
                  disabled={vendorMutation.status === 'pending'}
                >
                  {vendorMutation.status === 'pending' ? "Guardando..." : "Guardar Proveedor"}
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

          {/* MODAL: NUEVA PROPUESTA ECONÓMICA CON WIZARD */}
          <Dialog open={isQuoteModalOpen} onOpenChange={(open) => {
            setIsQuoteModalOpen(open);
            if (!open) { setEditingQuoteId(null); setEditingFolio(""); }
          }}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setWizardStep(1);
                  setSelectedCompany("");
                  setSelectedType("");
                  setEditingQuoteId(null);
                  setEditingFolio("");
                  setAmsFormData(defaultAMSFormData);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white shadow-md px-6 font-semibold"
              >
                <Plus className="mr-2 h-4 w-4" /> Nueva Propuesta Económica
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] overflow-y-auto shadow-2xl dark:bg-slate-950 dark:backdrop-blur-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 dark:text-white">
                  <FileText className="text-blue-600" /> 
                  {wizardStep === 1 && "Selecciona la Empresa"}
                  {wizardStep === 2 && `Tipo de Propuesta - ${selectedCompany}`}
                  {wizardStep === 3 && `Detalle de la Propuesta (${selectedCompany} - ${selectedType})`}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
              {/* 🚀 PASO 1: TARJETAS DE EMPRESA */}
              {wizardStep === 1 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 p-4 mt-8">
                  {['AMS', 'HGW', 'DEMA', 'HERMAL', 'HYH'].map(company => (
                    <Card 
                      key={company} 
                      className="cursor-pointer border-2 border-transparent hover:border-blue-500 hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-900" 
                      onClick={() => { setSelectedCompany(company); setWizardStep(2); }}
                    >
                      <CardContent className="flex flex-col items-center justify-center p-8 h-48">
                        <Building2 size={56} className="mb-4 text-slate-400 dark:text-slate-300 group-hover:text-blue-500 transition-colors" />
                        <span className="font-bold text-2xl dark:text-white">{company}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* 🚀 PASO 2: TARJETAS DE TIPO (BIENES O SERVICIOS) */}
              {wizardStep === 2 && (
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl px-4">
                    <Card 
                      className="cursor-pointer border-2 border-transparent hover:border-blue-500 hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-900" 
                      onClick={() => { setSelectedType('Bienes'); setQuoteType('bienes'); setWizardStep(3); }}
                    >
                      <CardContent className="flex flex-col items-center justify-center p-8 h-56">
                        <Package size={72} className="mb-6 text-blue-500" />
                        <span className="font-bold text-3xl dark:text-white">Bienes</span>
                      </CardContent>
                    </Card>

                    <Card 
                      className="cursor-pointer border-2 border-transparent hover:border-emerald-500 hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-900" 
                      onClick={() => { setSelectedType('Servicios'); setQuoteType('servicios'); setWizardStep(3); }}
                    >
                      <CardContent className="flex flex-col items-center justify-center p-8 h-56">
                        <Wrench size={72} className="mb-6 text-emerald-500" />
                        <span className="font-bold text-3xl dark:text-white">Servicios</span>
                      </CardContent>
                    </Card>
                  </div>
                  <Button variant="ghost" className="mt-12 dark:text-slate-300" onClick={() => setWizardStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Selección de Empresa
                  </Button>
                </div>
              )}

              {/* 🚀 PASO 3: EL FORMULARIO */}
              {wizardStep === 3 && (
                <div className="space-y-6 py-4">
                  
                  {/* BANNER DE SELECCIÓN */}
                  <div className="mb-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                    <div>
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Empresa seleccionada:</span> 
                      <Badge variant="outline" className="ml-2 mr-6 text-blue-700 dark:text-blue-300 border-blue-300 bg-white dark:bg-slate-800 text-sm">{selectedCompany}</Badge>
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tipo:</span> 
                      <Badge variant="outline" className="ml-2 text-emerald-700 dark:text-emerald-300 border-emerald-300 bg-white dark:bg-slate-800 text-sm">{selectedType}</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setWizardStep(2)} className="dark:text-white dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700">
                      Cambiar Selección
                    </Button>
                  </div>


                  <div className="col-span-4">
                    <DynamicFormRenderer
                      type={quoteType}
                      company={selectedCompany}
                      companyName={selectedVendor?.companyName}
                      data={amsFormData}
                      onChange={setAmsFormData}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <Button variant="ghost" onClick={() => { setIsQuoteModalOpen(false); setEditingQuoteId(null); setEditingFolio(""); }}>Cancelar</Button>
                    <Button onClick={() => quoteMutation.mutate()} disabled={quoteMutation.status === 'pending'} className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white px-10 font-bold">
                      {quoteMutation.status === 'pending' ? "Generando..." : "Finalizar y Generar PDF"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

        {/* HISTORIAL */}
      <div className="w-full bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-4">
          Historial de Cotizaciones Generadas
        </h3>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-[rgba(255,255,255,0.04)]">
                <TableHead className="px-6 py-3 text-xs font-bold uppercase dark:text-[#8D99AE]">Folio</TableHead>
                <TableHead className="px-6 py-3 text-xs font-bold uppercase dark:text-[#8D99AE]">Requisición</TableHead>
                <TableHead className="px-6 py-3 text-xs font-bold uppercase dark:text-[#8D99AE]">Empresa Destino</TableHead>
                <TableHead className="px-6 py-3 text-xs font-bold uppercase text-right dark:text-[#8D99AE]">Monto Total</TableHead>
                <TableHead className="px-6 py-3 text-xs font-bold uppercase text-center dark:text-[#8D99AE]">Estado</TableHead>
                <TableHead className="px-6 py-3 text-xs font-bold uppercase text-center dark:text-[#8D99AE]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingQuotes ? <TableRow><TableCell colSpan={6} className="text-center py-10">Cargando...</TableCell></TableRow> :
               !loadingQuotes && filteredQuotes.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">No se encontraron resultados para tu búsqueda.</TableCell></TableRow> :
               filteredQuotes.map(q => (
                <TableRow key={q.id} className="hover:bg-slate-50 transition-colors dark:hover:bg-[rgba(0,180,216,0.08)] dark:hover:border-l-4 dark:hover:border-cyan-400/70 dark:hover:shadow-[inset_0_0_0_1px_rgba(0,180,216,0.15)] dark:text-[#E0FBFC]">
                  <TableCell className="px-6 py-4 font-mono text-xs font-bold text-blue-700 dark:text-[#E0FBFC]">{q.internalFolio || q.folio}</TableCell>
                  <TableCell className="px-6 py-4 text-xs text-slate-600 dark:text-[#E0FBFC]">{q.requisitionNumber || 'N/A'}</TableCell>
                  <TableCell className="px-6 py-4 text-sm font-medium dark:text-[#E0FBFC]">{q.destinationCompany || 'Sin asignar'}</TableCell>
                  <TableCell className="px-6 py-4 text-right font-bold text-sm dark:text-[#E0FBFC]">${Number(q.total || 0).toLocaleString()}</TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-bold">COMPLETADO</Badge>
                  </TableCell>
                  
                  <TableCell className="px-6 py-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 transition-colors dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white dark:hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12)] dark:border dark:border-slate-700/50">
                          <MoreVertical size={16} className="text-slate-500 dark:text-slate-200" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white shadow-lg border rounded-lg p-1 min-w-[150px] z-50">
                        
                        <DropdownMenuItem 
                          onClick={() => window.open(`/api/quotes/${q.id}/pdf`, '_blank')}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          <Download size={14} className="text-blue-600" />
                          <span>Descargar PDF</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleEditQuote(q)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit3 size={14} className="text-emerald-600" />
                          <span>Editar</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                          onClick={async () => {
                            if (confirm(`¿Estás seguro de que deseas eliminar la cotización ${q.internalFolio || q.folio}?`)) {
                              try {
                                const res = await fetch(`/api/quotes/${q.id}`, { method: "DELETE" });
                                if (!res.ok) throw new Error("No se pudo eliminar el registro de la API");
                                
                                queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
                                toast({ title: "¡Eliminado!", description: "La cotización se quitó del historial con éxito." });
                              } catch (err: any) {
                                toast({ title: "Error", description: err.message, variant: "destructive" });
                              }
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 rounded hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 size={14} />
                          <span>Eliminar</span>
                        </DropdownMenuItem>

                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      </main>
    </div>
  );
}