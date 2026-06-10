import { AMSBienesForm } from "@/components/quotations/forms/AMSBienesForm";
import { AMSServiciosForm } from "@/components/quotations/forms/AMSServiciosForm";
import type { AMSFormData, QuoteFormType } from "@/components/quotations/forms/form-types";

interface DynamicFormRendererProps {
  type: QuoteFormType;
  companyName?: string;
  data: AMSFormData;
  onChange: (data: AMSFormData) => void;
}

export function DynamicFormRenderer({ type, companyName, data, onChange }: DynamicFormRendererProps) {
  if (type === "bienes") {
    return (
      <AMSBienesForm
        companyName={companyName}
        values={{
          attnLugar: data.attnLugar,
          attnGrado: data.attnGrado,
          attnNombre: data.attnNombre,
          attnDependencia: data.attnDependencia,
          attnArea: data.attnArea,
          attnUbicacion: data.attnUbicacion,
          attnDireccion: data.attnDireccion,
          attnNombreProcedimiento: data.attnNombreProcedimiento,
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
          qualityGuarantees: data.qualityGuarantees,
          selectedSocialObjects: data.selectedSocialObjects,
          lineItems: data.lineItems
        }}
        onChange={(next) => onChange({ ...data, ...next, quoteType: "bienes" })}
      />
    );  
  }   

return (
  <AMSServiciosForm
    companyName={companyName}
    values={{
      attnLugar: data.attnLugar,
      attnGrado: data.attnGrado,
      attnNombre: data.attnNombre,
      attnDependencia: data.attnDependencia,
      attnArea: data.attnArea,
      attnUbicacion: data.attnUbicacion,
      attnDireccion: data.attnDireccion,
      attnNombreProcedimiento: data.attnNombreProcedimiento,
      attnContacto: data.attnContacto,
      attnCargo: data.attnCargo,
      validityDays: data.validityDays,
      paymentTerms: data.paymentTerms,
      goodsOrigin: data.goodsOrigin,
      deliveryTime: data.deliveryTime,
      deliverySingle: data.deliverySingle,
      deliveryLocation: data.deliveryLocation,
      deliveryLocations: data.deliveryLocations,
      qualityGuarantees: data.qualityGuarantees,
      selectedSocialObjects: data.selectedSocialObjects,
      lineItems: data.lineItems
    }}
    onChange={(next) => onChange({ ...data, ...next, quoteType: "servicios" })}
  />
);
}