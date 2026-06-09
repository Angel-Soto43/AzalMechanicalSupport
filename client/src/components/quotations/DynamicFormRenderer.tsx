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
          technicalScope: data.technicalScope,
          goodsOrigin: data.goodsOrigin,
          providerNationality: data.providerNationality,
          manufacturingTime: data.manufacturingTime,
          deliveryTime: data.deliveryTime,
          complianceWarranty: data.complianceWarranty,
          similarContracts: data.similarContracts,
          qualityStandards: data.qualityStandards,
          warrantyCoverage: data.warrantyCoverage,
        }}
        onChange={(next) => onChange({ ...data, ...next, quoteType: "bienes" })}
      />
    );
  }

  return (
    <AMSServiciosForm
      companyName={companyName}
      values={{
        serviceScope: data.serviceScope,
        serviceOrigin: data.serviceOrigin,
        providerNationality: data.providerNationality,
        serviceSchedule: data.serviceSchedule,
        serviceInspection: data.serviceInspection,
        complianceWarranty: data.complianceWarranty,
        similarContracts: data.similarContracts,
        experienceYears: data.experienceYears,
        specialtyYears: data.specialtyYears,
        qualityStandards: data.qualityStandards,
        warrantyCoverage: data.warrantyCoverage,
      }}
      onChange={(next) => onChange({ ...data, ...next, quoteType: "servicios" })}
    />
  );
}
