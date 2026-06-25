export type QuoteFormType = "bienes" | "servicios";

export interface LineItem {
  id: number;
  noPartida: string;
  regionMilitar?: string;
  description: string;
  techRequirements: string;
  versionReference: string;
  reqDate: string;
  quantity: number;
  unitMeasure: string;
  unitPrice: number;
  supplier: string;
  purchaseCost: number;
  profitFactor: number;
  importe: number;
  previo: number;
}

export const defaultLineItem: LineItem = {
  id: 1,
  noPartida: "",
  description: "",
  techRequirements: "",
  versionReference: "",
  reqDate: "",
  quantity: 1,
  unitMeasure: "KG",
  unitPrice: 0,
  supplier: "",
  purchaseCost: 0,
  profitFactor: 1,
  importe: 0,
  previo: 0,
};

export interface AMSFormData {
  quoteType: QuoteFormType;

  // ─── Sección 1 "Atención" ───────────────────────────────
  attnLugar: string;
  attnDia: string;
  attnMes: string;
  attnAnio: string;
  attnGrado: string;
  
  // 🚀 AQUÍ ESTÁN LOS 3 NOMBRES YA CORREGIDOS 🚀
  contactPerson: string; 
  destinationCompany: string; 
  projectTitle: string; 
  
  attnArea: string;
  attnUbicacion: string;
  attnDireccion: string;
  attnContacto: string;
  attnCargo: string;

  // ─── Sección 2 ──────────────────────────────────────────
  validityDays: number;
  paymentTerms: string;
  goodsOrigin: string;
  deliveryTime: string;
  manufacturingTime: string;
  hasManufacturingTime: boolean;
  deliverySingle: boolean;
  deliveryLocation: string;
  deliveryLocations: Array<{ noPartida: string; regionMilitar?: string; address: string; contact: string }>;
  deliveryConditions: Array<string | { text: string; subItems: string[] }>;
  selectedDeliveryClauses: string[];

  // ─── Sección 3 "Garantía de calidad" ────────────────────
  qualityGuarantees: string[];
  requiredDocuments: string[];
  normsTable: Array<{ description: string; norm: string }>;
  serviceNormsTable: Array<{ description: string; quantity: string; unitMeasure: string; norm: string }>;
  selectedSocialObjects: string[];

  // ─── Tabla de partidas ───────────────────────────────────
  lineItems: LineItem[];

  // ─── Resto ──────────────────────────────────────────────
  technicalScope: string;
  providerNationality: string;
  complianceWarranty: number;
  similarContracts: number;
  qualityStandards: string;
  warrantyCoverage: string;
  serviceScope: string;
  serviceOrigin: string;
  serviceSchedule: string;
  serviceInspection: string;
  experienceYears: number;
  specialtyYears: number;
}

export const defaultAMSFormData: AMSFormData = {
  quoteType: "bienes",

  attnLugar: "",
  attnDia: "",
  attnMes: "",
  attnAnio: "",
  attnGrado: "",
  
  // 🚀 TAMBIÉN LOS CORREGIMOS EN LOS VALORES POR DEFECTO 🚀
  contactPerson: "",
  destinationCompany: "",
  projectTitle: "",
  
  attnArea: "",
  attnUbicacion: "",
  attnDireccion: "",
  attnContacto: "",
  attnCargo: "",
  validityDays: 120,
  paymentTerms: "",
  goodsOrigin: "Nacional",
  deliveryTime: "3 meses posteriores al fallo",
  manufacturingTime: "2 meses",
  hasManufacturingTime: false,
  deliverySingle: true,
  deliveryLocation: "",
  deliveryLocations: [],
  deliveryConditions: [{ text: "", subItems: [] }],
  selectedDeliveryClauses: [],

  qualityGuarantees: [""],
  requiredDocuments: [""],
  normsTable: [{ description: "", norm: "" }],
  serviceNormsTable: [{ description: "", quantity: "", unitMeasure: "", norm: "" }],
  selectedSocialObjects: [],

  lineItems: [{ ...defaultLineItem }],

  technicalScope: "",
  providerNationality: "Mexicana",
  complianceWarranty: 10,
  similarContracts: 3,
  qualityStandards: "",
  warrantyCoverage: "",
  serviceScope: "",
  serviceOrigin: "Nacional",
  serviceSchedule: "A partir de la comunicación del fallo",
  serviceInspection: "",
  experienceYears: 5,
  specialtyYears: 5,
};