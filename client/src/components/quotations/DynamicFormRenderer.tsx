import { AMSBienesForm } from "@/components/quotations/forms/AMSBienesForm";
import { AMSServiciosForm } from "@/components/quotations/forms/AMSServiciosForm";
import { HGWBienesForm } from "@/components/quotations/forms/HGWBienesForm";
import { HGWServiciosForm } from "@/components/quotations/forms/HGWServiciosForm";
import { DEMABienesForm } from "@/components/quotations/forms/DEMABienesForm";
import { DEMAServiciosForm } from "@/components/quotations/forms/DEMAServiciosForm";
import { HERMALBienesForm } from "@/components/quotations/forms/HERMALBienesForm";
import { HERMALServiciosForm } from "@/components/quotations/forms/HERMALServiciosForm";
import { HYHBienesForm } from "@/components/quotations/forms/HYHBienesForm";
import { HYHServiciosForm } from "@/components/quotations/forms/HYHServiciosForm";
import type { AMSFormData, QuoteFormType } from "@/components/quotations/forms/form-types";

interface DynamicFormRendererProps {
  type: QuoteFormType;
  company?: string;       // "AMS" | "HGW" | "DEMA" | "HERMAL" | "HYH"
  companyName?: string;
  data: AMSFormData;
  onChange: (data: AMSFormData) => void;
}

const bienesValues = (data: AMSFormData) => ({
  attnLugar: data.attnLugar,
  attnDia: data.attnDia,
  attnMes: data.attnMes,
  attnAnio: data.attnAnio,
  attnGrado: data.attnGrado,
  contactPerson: data.contactPerson,
  destinationCompany: data.destinationCompany,
  attnArea: data.attnArea,
  attnUbicacion: data.attnUbicacion,
  attnDireccion: data.attnDireccion,
  projectTitle: data.projectTitle,
  attnContacto: data.attnContacto,
  attnCargo: data.attnCargo,
  validityDays: data.validityDays,
  paymentTerms: data.paymentTerms,
  goodsOrigin: data.goodsOrigin,
  deliveryTime: data.deliveryTime,
  hasManufacturingTime: data.hasManufacturingTime,
  manufacturingTime: data.manufacturingTime,
  deliverySingle: data.deliverySingle,
  deliveryLocation: data.deliveryLocation,
  deliveryLocations: data.deliveryLocations,
  deliveryDates: (data as any).deliveryDates,
  deliveryConditions: (data as any).deliveryConditions,
  qualityGuarantees: data.qualityGuarantees,
  requiredDocuments: data.requiredDocuments,
  normsTable: data.normsTable,
  selectedSocialObjects: data.selectedSocialObjects,
  lineItems: data.lineItems,
  hasRegionalMilitary: (data as any).hasRegionalMilitary,
  warrantyPercentageApplies: (data as any).warrantyPercentageApplies,
  warrantyPercentage: (data as any).warrantyPercentage,
  deliveryNotes: (data as any).deliveryNotes,
});

const serviciosValues = (data: AMSFormData) => ({
  attnLugar: data.attnLugar,
  attnDia: data.attnDia,
  attnMes: data.attnMes,
  attnAnio: data.attnAnio,
  attnGrado: data.attnGrado,
  contactPerson: data.contactPerson,
  destinationCompany: data.destinationCompany,
  attnArea: data.attnArea,
  attnUbicacion: data.attnUbicacion,
  attnDireccion: data.attnDireccion,
  projectTitle: data.projectTitle,
  attnContacto: data.attnContacto,
  attnCargo: data.attnCargo,
  validityDays: data.validityDays,
  paymentTerms: data.paymentTerms,
  goodsOrigin: data.goodsOrigin,
  deliveryTime: data.deliveryTime,
  hasManufacturingTime: data.hasManufacturingTime,
  manufacturingTime: data.manufacturingTime,
  deliverySingle: data.deliverySingle,
  deliveryLocation: data.deliveryLocation,
  deliveryLocations: data.deliveryLocations,
  deliveryDates: (data as any).deliveryDates,
  deliveryConditions: (data as any).deliveryConditions,
  qualityGuarantees: data.qualityGuarantees,
  requiredDocuments: data.requiredDocuments,
  normsTable: data.normsTable,
  serviceNormsTable: data.serviceNormsTable,
  selectedSocialObjects: data.selectedSocialObjects,
  lineItems: data.lineItems,
  hasRegionalMilitary: (data as any).hasRegionalMilitary,
  warrantyPercentageApplies: (data as any).warrantyPercentageApplies,
  warrantyPercentage: (data as any).warrantyPercentage,
  deliveryNotes: (data as any).deliveryNotes,
});

export function DynamicFormRenderer({ type, company, companyName, data, onChange }: DynamicFormRendererProps) {
  const co = (company ?? "").toUpperCase();

  // ── AMS ────────────────────────────────────────────────────────────────────
  if (co === "AMS") {
    if (type === "bienes")
      return <AMSBienesForm companyName={companyName} values={bienesValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "bienes" })} />;
    return <AMSServiciosForm companyName={companyName} values={serviciosValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "servicios" })} />;
  }

  // ── HGW ────────────────────────────────────────────────────────────────────
  if (co === "HGW") {
    if (type === "bienes")
      return <HGWBienesForm companyName={companyName} values={bienesValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "bienes" })} />;
    return <HGWServiciosForm companyName={companyName} values={serviciosValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "servicios" })} />;
  }

  // ── DEMA ───────────────────────────────────────────────────────────────────
  if (co === "DEMA") {
    if (type === "bienes")
      return <DEMABienesForm companyName={companyName} values={bienesValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "bienes" })} />;
    return <DEMAServiciosForm companyName={companyName} values={serviciosValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "servicios" })} />;
  }

  // ── HERMAL ─────────────────────────────────────────────────────────────────
  if (co === "HERMAL") {
    if (type === "bienes")
      return <HERMALBienesForm companyName={companyName} values={bienesValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "bienes" })} />;
    return <HERMALServiciosForm companyName={companyName} values={serviciosValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "servicios" })} />;
  }

  // ── HYH ────────────────────────────────────────────────────────────────────
  if (co === "HYH") {
    if (type === "bienes")
      return <HYHBienesForm companyName={companyName} values={bienesValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "bienes" })} />;
    return <HYHServiciosForm companyName={companyName} values={serviciosValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "servicios" })} />;
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  if (type === "bienes")
    return <AMSBienesForm companyName={companyName} values={bienesValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "bienes" })} />;
  return <AMSServiciosForm companyName={companyName} values={serviciosValues(data)} onChange={(next) => onChange({ ...data, ...next, quoteType: "servicios" })} />;
}
