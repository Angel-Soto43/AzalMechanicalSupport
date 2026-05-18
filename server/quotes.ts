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
  unitPrice: number;
  amount?: number;
}

export interface NormalizedQuoteLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitMeasure: string;
  techRequirements: string;
  versionReference: string;
  unitPriceCents: number;
  amountCents: number;
}

// ==========================================
// FUNCIONES DE CONTROL MONETARIO (CENTAVOS)
// ==========================================
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

// ==========================================
// VALIDACIONES DE PARTIDAS E IMPORTES
// ==========================================
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
    const unitPriceValue = Number(rawItem.unitPrice || rawItem.precio || 0);
    const providedAmountValue = rawItem.amount !== undefined ? Number(rawItem.amount) : undefined;

    if (!description) {
      errors.push(`La partida ${index + 1} requiere descripción`);
      continue;
    }

    if (!unit) {
      errors.push(`La partida ${index + 1} requiere unidad`);
      continue;
    }

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      errors.push(`La partida ${index + 1} tiene cantidad inválida; la cantidad debe ser un número entero mayor a cero`);
      continue;
    }

    if (!Number.isFinite(unitPriceValue) || unitPriceValue < 0) {
      errors.push(`La partida ${index + 1} tiene precio unitario inválido`);
      continue;
    }

    const quantityRounded = quantity;
    const unitPriceCents = toCents(unitPriceValue);
    const amountCents = Math.round(quantityRounded * unitPriceCents);

    if (providedAmountValue !== undefined && Number.isFinite(providedAmountValue)) {
      const providedAmountCents = toCents(providedAmountValue);
      if (providedAmountCents !== amountCents) {
        errors.push(`La partida ${index + 1} no cumple la regla importe = cantidad * precio unitario`);
      }
    }

    normalizedItems.push({
      description,
      quantity: quantityRounded,
      unit,
      unitMeasure,
      techRequirements,
      versionReference,
      unitPriceCents,
      amountCents,
    });
  }

  const totalCents = normalizedItems.reduce((acc, item) => acc + item.amountCents, 0);
  return { normalizedItems, totalCents, errors };
}

export function getLineItemsTotalCents(items: Array<{ amount: number }>): number {
  return items.reduce((acc, item) => acc + (Number(item.amount) || 0) * 100, 0);
}

export function getQuoteItemsTotalCents(items: Array<{ amount: number }>): number {
  return items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
}

export function convertQuoteItemFromDb(item: any): any {
  return {
    ...item,
    unitPrice: fromCents(Number(item.unitPrice) || 0),
    amount: fromCents(Number(item.amount) || 0),
  };
}

export function convertQuoteItemsFromDb(items: any[]): any[] {
  return items.map(convertQuoteItemFromDb);
}

// ==========================================
// TRADUCCIÓN DE MONEDA A PALABRAS (ESPAÑOL)
// ==========================================
const units = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const specialTens: Record<number, string> = {
  10: "diez",
  11: "once",
  12: "doce",
  13: "trece",
  14: "catorce",
  15: "quince",
  20: "veinte",
};
const tensNames: Record<number, string> = {
  2: "veinte",
  3: "treinta",
  4: "cuarenta",
  5: "cincuenta",
  6: "sesenta",
  7: "setenta",
  8: "ochenta",
  9: "noventa",
};
const hundredsNames: Record<number, string> = {
  1: "ciento",
  2: "doscientos",
  3: "trescientos",
  4: "cuatrocientos",
  5: "quinientos",
  6: "seiscientos",
  7: "setecientos",
  8: "ochocientos",
  9: "novecientos",
};

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

  if (millions > 0) {
    const millionText = millions === 1 ? "un millón" : `${spanishNumber(millions)} millones`;
    parts.push(millionText);
  }

  if (thousands > 0) {
    parts.push(thousands === 1 ? "mil" : `${spanishNumber(thousands)} mil`);
  }

  if (remainder > 0) {
    parts.push(spanishUnderThousand(remainder));
  }

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

// ==========================================
// RENDERIZADOR HTML INSTITUCIONAL (PLANTILLA AZAL)
// ==========================================
export function generateQuoteHTML(quote: any, provider: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  let displayDate = "1 de abril de 2026";
  if (quote.quoteDate) {
    try {
      const dateParts = quote.quoteDate.split('-');
      if (dateParts.length === 3) {
        const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const day = parseInt(dateParts[2], 10);
        const month = months[parseInt(dateParts[1], 10) - 1];
        const year = dateParts[0];
        displayDate = `${day} de ${month} de ${year}`;
      }
    } catch (e) {
      displayDate = quote.quoteDate;
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        /* 🚀 RESERVA DE MÁRGENES NATIVOS DE IMPRESIÓN PARA COMPORTAMIENTO HEADER/FOOTER LIMPIO */
        @page { 
          size: A4; 
          margin-top: 170px; 
          margin-bottom: 160px; 
          margin-linecap: round;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .pdf-header { position: fixed; top: -170px; left: 0; right: 0; height: 165px; background: #ffffff; z-index: 25; }
          .pdf-footer { position: fixed; bottom: -160px; left: 0; right: 0; height: 155px; background: #ffffff; z-index: 25; }
        }
        
        body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000000; line-height: 1.45; background: #ffffff; box-sizing: border-box; }
        .pdf-container { width: 100%; padding: 10px 55px; position: relative; box-sizing: border-box; }
        .pdf-header-inner, .footer-inner { width: 100%; padding: 0 55px; box-sizing: border-box; }
        
        /* CINTILLO SUPERIOR */
        .header-shapes { position: absolute; top: 0; left: 0; right: 0; height: 50px; overflow: hidden; }
        .header-shapes .shape-blue-top { position: absolute; top: 0; right: 280px; width: 350px; height: 26px; background: #0012CC; transform: skewX(-45deg); }
        .header-shapes .shape-red-fold { position: absolute; top: 0; right: 250px; width: 45px; height: 50px; background: #B30000; transform: skewX(-45deg); z-index: 2; }
        .header-shapes .shape-red-main { position: absolute; top: 0; right: 0; width: 270px; height: 50px; background: #E60000; z-index: 3; }
        .header-shapes .shape-blue-bottom { position: absolute; top: 26px; right: 90px; width: 220px; height: 24px; background: #0012CC; transform: skewX(-45deg); z-index: 1; }
        
        /* LOGO SUPERIOR */
        .header-main { display: flex; justify-content: space-between; align-items: flex-start; padding-top: 42px; background: #ffffff; }
        .brand-wrapper { display: flex; align-items: center; gap: 15px; }
        .brand-vector-logo { width: 110px; height: auto; display: block; }
        .brand-logo-text { display: flex; flex-direction: column; justify-content: center; }
        .brand-mark-title { font-size: 38px; font-weight: 900; letter-spacing: -0.04em; text-transform: uppercase; line-height: 0.85; font-family: 'Arial Black', sans-serif; }
        .brand-mark-title .red { color: #E60000; }
        .brand-mark-title .blue { color: #0012CC; }
        .brand-box-subtitle { display: block; width: 175px; text-align: center; padding: 3px 0; background: #1B2A4A; color: #ffffff; font-size: 10px; font-weight: 700; letter-spacing: 0.35em; text-transform: uppercase; margin-top: 2px; }
        .header-date-info { text-align: right; font-size: 10pt; color: #000000; line-height: 1.4; padding-top: 15px; font-weight: normal; }
        
        /* SECCIÓN DE ATENCIÓN */
        .attention-block { margin-top: 10px; margin-bottom: 20px; font-size: 10pt; line-height: 1.4; color: #000000; text-align: left; }
        .attention-title { font-weight: bold; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.02em; }
        .attention-body { font-weight: normal; }

        /* Estilos del Cuerpo */
        .proposal-block { margin-top: 5px; margin-bottom: 20px; line-height: 1.5; }
        .proposal-title-main { font-size: 11pt; font-weight: bold; text-decoration: underline; color: #000000; margin-bottom: 4px; text-transform: uppercase; }
        .proposal-subtitle-main { font-size: 10pt; font-weight: normal; color: #000000; }

        /* PIE DE PÁGINA ASIMÉTRICO BLINDADO */
        .footer-inner-wrapper { border-top: 1px solid #94A3B8; padding-top: 12px; font-size: 9.5pt; color: #000199; font-weight: bold; font-family: Arial, sans-serif; background: #ffffff; }
        .footer-address-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .footer-columns-container { display: flex; gap: 60px; padding-left: 24px; }
        .footer-column-block { display: flex; flex-direction: column; gap: 8px; }
        .footer-item-row { display: flex; align-items: center; gap: 10px; }
        .footer-link { color: #000199; text-decoration: none; }
        .footer-link:hover { text-decoration: underline; }
        .footer-icon-marker { display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; color: #000199; }
        .footer-icon-marker svg { width: 15px; height: 15px; fill: #000199; }
        
        /* GEOMETRÍA DEL FOOTER */
        .footer-bar { position: relative; height: 32px; margin-top: 12px; overflow: hidden; background: #ffffff; }
        .footer-bar .shape-blue-f { position: absolute; left: -30px; bottom: 0; width: 440px; height: 22px; background: #000199; transform: skewX(-45deg); }
        .footer-bar .shape-red-fold-f { position: absolute; left: 385px; bottom: 0; width: 35px; height: 32px; background: #B30000; transform: skewX(-45deg); z-index: 2; }
        .footer-bar .shape-red-f { position: absolute; right: 0; bottom: 0; width: 400px; height: 32px; background: #E60000; z-index: 3; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 18px; font-size: 9pt; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th, td { border: 1px solid #000; padding: 6px 6px; text-align: center; vertical-align: middle; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .section-title { font-weight: bold; text-decoration: underline; margin-top: 20px; margin-bottom: 7px; }
        .list-no-bullet { list-style-type: none; padding-left: 0; margin-top: 5px; }
        .list-no-bullet li { margin-bottom: 5px; text-align: justify; }
        
        .professional-signature-section { margin-top: 55px; margin-bottom: 35px; text-align: center; page-break-inside: avoid; break-inside: avoid; }
        .signature-title-label { font-size: 10pt; font-weight: bold; letter-spacing: 0.1em; margin-bottom: 45px; color: #000000; }
        .signature-solid-line { width: 250px; height: 1px; background: #000000; margin: 0 auto 8px auto; }
        .signature-fullname-text { font-size: 10pt; font-weight: bold; text-transform: uppercase; color: #000000; margin-bottom: 2px; }
        .signature-role-subtext { font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #000000; letter-spacing: 0.05em; }
      </style>
    </head>
    <body>
      <div class="pdf-header">
        <div class="header-shapes">
          <div class="shape-blue-top"></div>
          <div class="shape-red-fold"></div>
          <div class="shape-red-main"></div>
          <div class="shape-blue-bottom"></div>
        </div>
        <div class="pdf-header-inner">
          <div class="header-main">
            <div class="brand-wrapper">
              <svg class="brand-vector-logo" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 130V10L50 80L90 10V130" stroke="#0012CC" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M42 130L82 25L122 130" stroke="#E60000" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M57 95H107" stroke="#E60000" stroke-width="14" stroke-linecap="round"/>
              </svg>
              <div class="brand-logo-text">
                <div class="brand-mark-title"><span class="red">A</span><span class="blue">Z</span><span class="red">A</span><span class="blue">L</span></div>
                <div class="brand-box-subtitle">MECHANICAL</div>
              </div>
            </div>
            <div class="header-date-info">
              Nicolás Romero, Estado de México<br>
              a ${displayDate}
            </div>
          </div>
        </div>
      </div>
      
      <div class="pdf-container">
        <div class="attention-block">
          <div class="attention-title">ATENCIÓN:</div>
          <div class="attention-body">
            C. Tte. Cor. Inf.<br>
            Vicente Herrera Valdez,<br>
            Jefe de I.M. de la Dir. Gral. Ind. Mil.
          </div>
        </div>

        <div class="proposal-block">
          <div class="proposal-title-main">PROPUESTA ECONÓMICA</div>
          <div class="proposal-subtitle-main">Requisición No. ${quote.requisitionNumber || ''}, “${quote.projectTitle || ''}.”</div>
        </div>

      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>DESCRIPCIÓN</th>
            <th>REQUERIMIENTOS TÉCNICOS</th>
            <th>CANT.</th>
            <th>U.M.</th>
            <th>COSTO UNITARIO</th>
            <th>COSTO TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, index) => {
            const refVersion = item.versionReference || '';
            const versionString = refVersion.toUpperCase().includes('VERSIÓN') || refVersion.toUpperCase().includes('VERSION')
              ? refVersion 
              : `VERSIÓN: ${refVersion}`;

            return `
              <tr>
                <td>${index + 1}</td>
                <td class="text-left">${item.description}</td>
                <td>
                  ${item.techRequirements || ''}<br>
                  ${versionString}<br>
                  ${item.reqDate || ''}
                </td>
                <td>${item.quantity}</td>
                <td>${item.unitMeasure || item.unit}</td>
                <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                <td class="text-right">${formatCurrency(item.quantity * item.unitPrice)}</td>
              </tr>
            `;
          }).join('')}
          <tr>
            <td colspan="5" style="border: none;"></td>
            <td class="bold text-right" style="background-color: #f2f2f2;">SUBTOTAL</td>
            <td class="bold text-right">${formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="5" style="border: none;"></td>
            <td class="bold text-right" style="background-color: #f2f2f2;">IVA (16%)</td>
            <td class="bold text-right">${formatCurrency(iva)}</td>
          </tr>
          <tr>
            <td colspan="5" style="border: none;"></td>
            <td class="bold text-right" style="background-color: #f2f2f2;">TOTAL</td>
            <td class="bold text-right">${formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>

      <div class="bold" style="text-transform: uppercase; margin-bottom: 20px;">
        ${totalEnTexto} IVA INCLUIDO.
      </div>

      <div class="section-title">CONDICIONES COMERCIALES:</div>
      <ul class="list-no-bullet">
        <li><span class="bold">Precios en Moneda Nacional.</span></li>
        <li><span class="bold">Vigencia de la cotización:</span> ${quote.validityDays || 120} días.</li>
        <li><span class="bold">Origen de los bienes:</span> ${quote.goodsOrigin || 'Nacional'}.</li>
        <li><span class="bold">Nacionalidad del proveedor:</span> ${quote.providerNationality || 'mexicana'}.</li>
        <li><span class="bold">Condiciones de pago:</span> Mi representada tiene considerado que el pago será a los ${quote.paymentDays || 17} días hábiles posteriores a la entrega de la factura, previa entrega de los bienes a satisfacción del Área requirente. Así mismo, el pago será mediante transferencia electrónica.</li>
        <li><span class="bold">Tiempo de entrega:</span> ${provider.companyName || 'Azal Mechanical Supports S.A. de C.V.'}, realizará la entrega de los bienes requeridos y documentación completa a partir del día natural siguiente a la comunicación del fallo y a más tardar ${quote.deliveryTime || '3 meses'} posteriores a referido evento.</li>
        <li><span class="bold">Lugar de la entrega:</span> ${provider.companyName || 'Azal Mechanical Supports S.A. de C.V.'}, entregará los bienes en las instalaciones que a continuación se indica:<br>
        ${quote.deliveryPlace || 'Subdirección de Almacenes de la Dirección General de Industria Militar ubicada en: Campo Militar No. 25-E "Venustiano Carranza de la Garza", ubicado en Carretera Federal 140-D, km 1.5, Predio "Gral. Div. D.E.M. Salvador Cienfuegos Zepeda", Municipio de Oriental, Estado de Puebla, C.P. 75020, de lunes a viernes (días hábiles) de 0830 a 1800 hrs.'}</li>
        <li><span class="bold">Contacto:</span> ${quote.contactPerson || 'Tte. Cor. Ing. Ind. Omar Luna Ramírez, Jefe de la Fábrica de Proyectiles y Morteros o quien haga sus veces al momento de la recepción, teléfono conmutador 27-6890-8867, ext. 1590, de lunes a viernes en días hábiles, en un horario de 0830 a 1800 horas.'}</li>
        <li><span class="bold">Tiempo de fabricación:</span> ${quote.manufacturingTime || '2 meses'}.</li>
      </ul>

      <div style="text-align: justify; margin-bottom: 10px;">
        La responsabilidad de <span class="bold">${provider.companyName || 'Azal Mechanical Supports, S.A. de C.V.'}</span>, en relación con esta garantía consistirá en que este, sin ningún costo para la “Secretaría de la Defensa Nacional”, reemplazará los “bienes”, en un plazo no mayor a 30 días hábiles conforme a los términos y condiciones para su aplicación.
      </div>

      <div class="bold" style="margin-bottom: 5px;">Garantía de calidad:</div>
      <div style="text-align: justify; margin-bottom: 15px;">
        <span class="bold">${provider.companyName || 'Azal Mechanical Supports S.A. de C.V.'}</span>, deberá entregar por escrito una garantía de calidad contra defectos de fabricación y/o vicios ocultos que especifique que el “bien”, que oferta es nuevo de fábrica, que está libre de defectos y en buenas condiciones, conforme a las especificaciones técnicas del fabricante, la cual deberá responder de los defectos de fabricación y/o vicios ocultos que llegue a presentar el “bien”, por un plazo de <span class="bold">${quote.guaranteeMonths || 12} (doce) meses</span>, a partir de la expedición del acta de aceptación que formule con motivo de la entrega y recepción definitiva del “bien” a plena y entera satisfacción de la Dirección General de Industria Militar.
        <br><br>
        Esta garantía de calidad contra defectos de fabricación y/o vicios ocultos se cancelará una vez que haya fenecido el plazo estipulado en el inciso anterior a partir de la fecha de entrega total del “bien” y a entera satisfacción de la Dirección General de Industria Militar.
        <br><br>
        Para la aplicación de dicha garantía <span class="bold">${provider.companyName || 'Azal Mechanical Supports, S.A. de C.V.'}</span>, en cualquier caso, de desperfecto que presente o daños que sufran “los bienes” adquiridos serán remplazados al 100% sin costo para la Dirección General de Industria Militar.
        <br><br>
        La reposición de los “bienes” con defectos de fabricación y/o vicios ocultos, se realizará en el lugar indicado en el apartado Ubicación del lugar donde se realizará la Entrega de los Bienes; para lo cual <span class="bold">${provider.companyName || 'Azal Mechanical Supports, S.A. de C.V.'}</span>, deberá establecer coordinación con el contacto especificado en el mismo apartado.
        <br><br>
        <span class="bold">${provider.companyName || 'Azal Mechanical Supports, S.A. de C.V.'}</span>, deberá recoger los “bienes” que presenten defectos de fabricación y/o vicios ocultos en el lugar indicado en el inciso anterior, sin costo adicional para la “Secretaría de la Defensa Nacional”, así mismo el “bien” sustituido será entregado por el proveedor en el mismo lugar antes mencionado.
        <br><br>
        La responsabilidad de <span class="bold">${provider.companyName || 'Azal Mechanical Supports, S.A. de C.V.'}</span>, en relación con esta garantía consistirá en que este, sin ningún costo para la “Secretaría de la Defensa Nacional”, reemplazará el “bien” que resulte defectuoso y en un plazo no mayor a 30 días hábiles, conforme a los términos y condiciones para su aplicación.
        <br><br>
        <span class="bold">${provider.companyName || 'Azal Mechanical Supports, S.A. de C.V.'}</span>, cumplirá con las condiciones de entrega conforme a el Anexo Administrativo.
        <br><br>
        <span class="bold">${provider.companyName || 'Azal Mechanical Supports, S.A. de C.V.'}</span>, cumple con los atributos, normas, garantías y documentación indicada en el Anexo “C”, así como en el Anexo Administrativo y Anexo Técnico.
        <br><br>
        Mi representada(o) cuenta con la capacidad técnica para el suministro de los bienes requeridos.
        <br><br>
        Mi representada se encuentra inscrita en el Sistema Compras MX y Registro Único de Proveedores y de Contratistas (RUPC).<br>
        <span class="bold">El porcentaje de garantía de cumplimiento será del:</span> ${quote.complianceWarranty || 10}%<br>
        <span class="bold">Años de experiencia en el mercado:</span> ${quote.experienceYears || 5}<br>
        <span class="bold">Años de especialidad en el mercado:</span> ${quote.specialtyYears || 5}<br>
        <span class="bold">Número de contratos afines de los servicios a adquirir o contratar:</span> ${quote.similarContracts || 3}
      </div>

      <ul class="list-no-bullet">
        <li><span class="bold">Razón social:</span> ${provider.companyName || 'Azal Mechanical Supports, S.A. de C.V.'}</li>
        <li><span class="bold">Objeto social o actividad que desarrolla:</span> ${provider.businessActivity || 'Adquirir, fabricar, ensamblar, procesar, preparar, reparar, vender, comprar, distribuir, importar, exportar e instalar todo tipo de resortes, muelles, tornillos, pernos, tuercas, arandelas, herramientas de corte, herramientas manuales, dispositivos, calibres troqueles y en general todo tipo de componentes estándar, herramienta y utillaje, especialmente pero no limitado para la industria vehicular, aeronáutica, militar y/u otras industrias sin limitación de trabajar y manipular todo tipo de cobre, acero hierro estaño plomo zinc, titanio y un sinfín de material existente utilizado en la fabricación metal mecánica.'}</li>
        <li><span class="bold">Domicilio legal:</span> ${provider.legalAddress || 'Lago Chapala 27, Los Manantiales, 54420, Nicolás Romero, Estado de México.'}</li>
        <li><span class="bold">Teléfono:</span> ${provider.phone || '55 4854 0838 y 55 1733 2055'}</li>
        <li><span class="bold">RFC:</span> ${provider.rfc || 'AMS161027SY5'}</li>
        <li><span class="bold">Nombre del representative legal:</span> ${provider.legalRepresentative || 'Ing. Víctor Hernández Hernández.'}</li>
        <li><span class="bold">Correo electrónico:</span> ${provider.email || 'azal@azalmechanical.com'}</li>
        <li><span class="bold">Página web:</span> ${provider.website || 'www.azalmechanical.com'}</li>
      </ul>

      <ul class="list-no-bullet">
        <li><span class="bold">Forma de pago:</span> Transferencia Electrónica.</li>
        <li><span class="bold">Nombre del banco:</span> ${quote.bankName || 'GRUPO FINANCIERO INBURSA'}</li>
        <li><span class="bold">Clabe Interbancaria:</span> ${quote.bankAccount || '036 180 500 524 410 942'}</li>
        <li><span class="bold">Beneficiario de la cuenta:</span> ${quote.bankBeneficiary || 'Azal Mechanical Supports, S.A. de C.V.'}</li>
      </ul>

      <div style="text-align: justify; margin-top: 15px; margin-bottom: 30px;">
        Con la presente oferta económica manifestamos interés en participar en los bienes requeridos por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.
      </div>

      <div class="professional-signature-section">
        <div class="signature-title-label">ATENTAMENTE</div>
        <div class="signature-solid-line"></div>
        <div class="signature-fullname-text">${provider.legalRepresentative || 'ING. VÍCTOR HERNÁNDEZ HERNÁNDEZ'}</div>
        <div class="signature-role-subtext">DIRECTOR DE OPERACIONES</div>
      </div>
    </div>

    <div class="pdf-footer">
      <div class="footer-inner-wrapper">
        <div class="footer-inner">
          <div style="width: 100%;">
            <div class="footer-address-row">
              <span class="footer-icon-marker">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              </span>
              <span>Lago Chapala No. 27, Los Manantiales, 54420, Nicolás Romero, Estado de México</span>
            </div>
            
            <div class="footer-columns-container">
              <div class="footer-column-block">
                <div class="footer-item-row">
                  <span class="footer-icon-marker">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                  </span>
                  <a class="footer-link" href="http://www.azalmechanical.com" target="_blank">www.azalmechanical.com</a>
                </div>
                <div class="footer-item-row">
                  <span class="footer-icon-marker">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  </span>
                  <a class="footer-link" href="mailto:azal@azalmechanical.com">azal@azalmechanical.com</a>
                </div>
              </div>
              
              <div class="footer-column-block">
                <div class="footer-item-row">
                  <span class="footer-icon-marker">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  </span>
                  <span>55 4854 0838</span>
                </div>
                <div class="footer-item-row">
                  <span class="footer-icon-marker">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  </span>
                  <span>55 1733 2055</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="footer-bar">
        <div class="shape-blue-f"></div>
        <div class="shape-red-fold-f"></div>
        <div class="shape-red-f"></div>
      </div>
    </div>
    </body>
    </html>
  `;
}