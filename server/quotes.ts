import { pgTable, text, varchar, timestamp, integer, serial, boolean, bigint, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==========================================
// INTERFACES Y TIPOS
// ==========================================
export interface RawQuoteLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitMeasure?: string;
  techRequirements?: string;
  versionReference?: string;
  reqDate?: string;
  unitPrice: number;
  amount?: number;
  // 🚀 NUEVOS CAMPOS INTERNOS
  supplier?: string;
  purchaseCost?: number;
  profitMargin?: number;
  profitFactor?: number;
}

export interface NormalizedQuoteLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitMeasure: string;
  techRequirements: string;
  versionReference: string;
  reqDate: string;
  unitPriceCents: number;
  amountCents: number;
  // 🚀 NUEVOS CAMPOS INTERNOS
  supplier: string;
  purchaseCost: number;
  profitMargin: number;
  profitFactor: number;
}

export function normalizeMoney(value: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function toCents(value: number): number {
  const normalized = normalizeMoney(value);
  return Math.round(normalized * 100);
}

export function fromCents(value: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Number((value / 100).toFixed(2));
}

export function validateQuoteItems(items: any[]): { normalizedItems: NormalizedQuoteLineItem[]; totalCents: number; errors: string[] } {
  const normalizedItems: NormalizedQuoteLineItem[] = [];
  const errors: string[] = [];

  if (!Array.isArray(items) || items.length === 0) {
    errors.push("Debe proporcionar al menos una partida de cotización");
    return { normalizedItems, totalCents: 0, errors };
  }

  for (const [index, rawItem] of items.entries()) {
    const description = (rawItem.description || rawItem.descripcion || "").toString().trim();
    const quantity = Number(rawItem.quantity || rawItem.cantidad || 0);
    const unit = (rawItem.unit || rawItem.unidad || "").toString().trim();
    const unitMeasure = (rawItem.unitMeasure || rawItem.medidaUnidad || "").toString().trim() || unit;
    const techRequirements = (rawItem.techRequirements || rawItem.requisitosTecnicos || "").toString().trim();
    const versionReference = (rawItem.versionReference || rawItem.referenciaVersion || "").toString().trim();
    const reqDate = (rawItem.reqDate || "").toString().trim();
    const unitPriceValue = Number(rawItem.unitPrice || rawItem.precio || 0);
    
    // 🚀 CAMPOS INTERNOS
    const supplier = (rawItem.supplier || "").toString().trim();
    const purchaseCost = Number(rawItem.purchaseCost || 0);
    const profitMargin = Number(rawItem.profitMargin || 0);
    const profitFactor = Number(rawItem.profitFactor || 1);

    if (!description) { errors.push(`La partida ${index + 1} requiere descripción`); continue; }
    if (!unit) { errors.push(`La partida ${index + 1} requiere unidad`); continue; }
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) { errors.push(`La partida ${index + 1} tiene cantidad inválida`); continue; }
    if (!Number.isFinite(unitPriceValue) || unitPriceValue < 0) { errors.push(`La partida ${index + 1} tiene precio unitario inválido`); continue; }

    const quantityRounded = quantity;
    const unitPriceCents = toCents(unitPriceValue);
    const amountCents = Math.round(quantityRounded * unitPriceCents);

    normalizedItems.push({
      description,
      quantity: quantityRounded,
      unit,
      unitMeasure,
      techRequirements,
      versionReference,
      reqDate,
      unitPriceCents,
      amountCents,
      supplier,
      purchaseCost,
      profitMargin,
      profitFactor
    });
  }

  const totalCents = normalizedItems.reduce((acc, item) => acc + item.amountCents, 0);
  return { normalizedItems, totalCents, errors };
}

export function convertQuoteItemFromDb(item: any): any {
  return {
    ...item,
    unitPrice: fromCents(Number(item.unitPrice) || 0),
    amount: fromCents(Number(item.amount) || 0),
    purchaseCost: Number(item.purchaseCost || 0),
    profitMargin: Number(item.profitMargin || 0),
    profitFactor: Number(item.profitFactor || 1)
  };
}

export function convertQuoteItemsFromDb(items: any[]): any[] {
  return items.map(convertQuoteItemFromDb);
}

// Lógica de traducción de dinero (Sin cambios)
const units = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const specialTens: Record<number, string> = { 10: "diez", 11: "once", 12: "doce", 13: "trece", 14: "catorce", 15: "quince", 20: "veinte" };
const tensNames: Record<number, string> = { 2: "veinte", 3: "treinta", 4: "cuarenta", 5: "cincuenta", 6: "sesenta", 7: "setenta", 8: "ochenta", 9: "noventa" };
const hundredsNames: Record<number, string> = { 1: "ciento", 2: "doscientos", 3: "trescientos", 4: "cuatrocientos", 5: "quinientos", 6: "seiscientos", 7: "setecientos", 8: "ochocientos", 9: "novecientos" };

function spanishUnderHundred(n: number): string {
  if (n < 10) return units[n];
  if (specialTens[n]) return specialTens[n];
  if (n < 16) return `dieci${units[n - 10]}`;
  if (n < 20) return `dieci${units[n - 10]}`;
  if (n < 30) return `veinti${units[n - 20]}`;
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  const tenName = tensNames[ten] || "";
  return unit === 0 ? tenName : `${tenName} y ${units[unit]}`;
}

function spanishUnderThousand(n: number): string {
  if (n === 0) return "";
  if (n < 100) return spanishUnderHundred(n);
  if (n === 100) return "cien";
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const hundredName = hundredsNames[hundred] || "";
  return rest === 0 ? hundredName : `${hundredName} ${spanishUnderHundred(rest)}`;
}

function spanishNumber(n: number): string {
  if (n === 0) return "cero";
  if (n < 0) return `menos ${spanishNumber(Math.abs(n))}`;
  const parts: string[] = [];
  const millions = Math.floor(n / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const remainder = n % 1000;
  if (millions > 0) parts.push(millions === 1 ? "un millón" : `${spanishNumber(millions)} millones`);
  if (thousands > 0) parts.push(thousands === 1 ? "mil" : `${spanishNumber(thousands)} mil`);
  if (remainder > 0) parts.push(spanishUnderThousand(remainder));
  return parts.join(" ").trim();
}

export function amountToSpanishText(amount: number): string {
  const cents = toCents(amount);
  const pesos = Math.floor(cents / 100);
  const centavos = cents % 100;
  const pesosText = pesos === 1 ? "peso" : "pesos";
  const integerWords = spanishNumber(pesos);
  const capitalizedWords = integerWords.charAt(0).toUpperCase() + integerWords.slice(1);
  return `${capitalizedWords} ${pesosText} ${String(centavos).padStart(2, "0")}/100 M.N.`;
}