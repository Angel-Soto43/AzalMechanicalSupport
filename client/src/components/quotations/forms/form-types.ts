export type QuoteFormType = "bienes" | "servicios";

export interface AMSFormData {
  quoteType: QuoteFormType;

  technicalScope: string;
  goodsOrigin: string;
  providerNationality: string;
  manufacturingTime: string;
  deliveryTime: string;
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
  technicalScope: "",
  goodsOrigin: "Nacional",
  providerNationality: "Mexicana",
  manufacturingTime: "2 meses",
  deliveryTime: "3 meses posteriores al fallo",
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
