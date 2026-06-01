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
// 🚀 DICCIONARIO DE CONFIGURACIÓN AUTOMÁTICA DE PLANTILLAS CORPORATIVAS
// ==========================================
export const TEMPLATE_CONFIGS: Record<string, { 
  templateName: string; 
  primaryColor: string; 
  friendlyName: string;
  rfc: string;
  legalAddress: string;
  email: string;
  legalRepresentative: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  objetoSocial: string;
}> = {
  "AZAL": {
    templateName: "AZAL_TEMPLATE",
    primaryColor: "#0F172A", // Azul Marino Oscuro
    friendlyName: "Azal Mechanical Supports, S.A. de C.V.",
    rfc: "AMS161027SY5",
    legalAddress: "Lago Chapala 27, Los Manantiales, 54420, Nicolás Romero, Estado de México.",
    email: "azal@azalmechanical.com",
    legalRepresentative: "Ing. Víctor Hernández Hernández.",
    phone: "55 4854 0838 y 55 1733 2055",
    bankName: "GRUPO FINANCIERO INBURSA",
    bankAccount: "036 180 500 524 410 942",
    objetoSocial: "Adquirir, fabricar, ensamblar, procesar, preparar, reparar, vender, comprar, distribuir, importar, exportar e instalar todo tipo de resortes, muelles, tornillos, pernos, tuercas, arandelas, herramientas de corte, herramientas manuales, dispositivos, calibres troqueles y en general todo tipo de componentes estándar, herramienta y utillaje, especialmente pero no limitado para la industria vehicular, aeronáutica, militar y/u otras industrias sin limitación de trabajar y manipular todo tipo de cobre, acero hierro estaño plomo zinc, titanio y un sinfín de material existente utilizado en la fabricación metal mecánica."
  },
  "DEMA": {
    templateName: "DEMA_TEMPLATE",
    primaryColor: "#1E3A8A", // Azul Eléctrico Industrial
    friendlyName: "DEMA Ingeniería y Soluciones Industriales S.A. de C.V.",
    rfc: "DIS2302154R4",
    legalAddress: "Av. De los Jinetes #7, Piso 2, Interior 29, Las Arboledas, Atizapán de Zaragoza, estado de México, C.P. 52950",
    email: "dema@demaisi.com.mx",
    legalRepresentative: "Ing. Deisy Hernández Hernández",
    phone: "55 39731421",
    bankName: "BANORTE",
    bankAccount: "072180012321261862",
    objetoSocial: "Prestar servicios de ingeniería, diseño, desarrollo e implementación, asistencia técnica, mano de obra especializada, mantenimiento y servicio, compra, venta, distribution, ensamble, instalación e importación de equipo industrial, insumos y refacciones utilizadas para la operación de plantas de tratamiento de aguas residuales, pozos profundos, potabilizadoras y purificadoras de agua, aires acondicionados industriales, manejadoras de aire, calderas, sistemas de calentamiento de agua, hidroneumáticos, cuartos fríos, sistemas de refrigeración, conservación y congelamiento."
  },
  "HERMAL": {
    templateName: "HERMAL_TEMPLATE",
    primaryColor: "#000000", // Negro Corporativo
    friendlyName: "HERMAL Industrial, S.A. de C.V.",
    rfc: "HIN2305193K1",
    legalAddress: "Boulevard Manuel Ávila Camacho #2610, Torre B, P 10, oficina 10-A, Col. Valle de los Pinos, Tlalnepantla, Estado de México, Código Postal 54040.",
    email: "hermal@industrial.com.mx",
    legalRepresentative: "Lactive Hernández Mauro.",
    phone: "55 34 61 78 88.",
    bankName: "Banorte",
    bankAccount: "072180013415670012.",
    objetoSocial: "Fabricación, preparación, suministro, distribución, instalación y soporte, compra, venta, importación, exportación de materias primas, productos semiterminados, productos finales y toda clase de elementos propios de la industria metalmecánica aplicada a procesos industriales y de manufactura ."
  },
  "HGW": {
    templateName: "HGW_TEMPLATE",
    primaryColor: "#047857", // Verde Esmeralda
    friendlyName: "HGW PROCESS AND SOLUTIONS, S.A. DE C.V.",
    rfc: "HPS200624FG1.",
    legalAddress: "Av. Jorge Jiménez Cantú No. 1 int. 124, Valle Escondido, Atizapán de Zaragoza, Estado de México, Código Postal 52937",
    email: "hgw@hgwprocessolutions.com",
    legalRepresentative: "Ing. Octavio Soto Hernández.",
    phone: "55 45566367.",
    bankName: "Inbursa",
    bankAccount: "036180500583815041",
    objetoSocial: "Proporcionar el servicio de diseño, instalación, mantenimiento, soporte técnico, suministro, venta, compra e importación de equipo para distribución y transmisión de energía eléctrica, equipo industrial y de sus refacciones utilizadas en plantas de tratamiento de aguas residuales, calderas, aires acondicionados industriales, subestaciones eléctricas, y en general, para todo tipo de instalaciones que requieran de equipo industrial para su operación."
  },
  "HYH": {
    templateName: "HYH_TEMPLATE",
    primaryColor: "#B91C1C", // Rojo Carmesí
    friendlyName: "HYH SUMINISTROS Y MANTENIMIENTO INDUSTRIAL, S.A.S. DE C.V.",
    rfc: "HSM230216B45.",
    legalAddress: "Circuito circunvalación poniente, 149, Int. B, Ciudad Satélite, C.P. 53100, Naucalpan de Juárez, Estado de México.",
    email: "hyh@hyhsuministros.com",
    legalRepresentative: "Ing. Héctor Trejo Tovar.",
    phone: "55 4451 2172 y 55 9337 6548.",
    bankName: "Santander",
    bankAccount: "014 180 65509776799 2",
    objetoSocial: "Ejecutar toda clase de actos de comercio, pudiendo comprar y vender, importar y exportar toda clase de artículos y mercancías, así como la prestación de toda clase de servicios."
  }
};

// ==========================================================================
// RENDERIZADOR HTML INSTITUCIONAL CENTRALIZADO CON SELECCIÓN DINÁMICA
// ==========================================================================
export function generateQuoteHTML(quote: any, provider: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  // 1. Obtener la plantilla activa desde el modelo de la base de datos
  const activeTemplate = quote.templateName || "AZAL_TEMPLATE";

  // 2. Extraer los datos estáticos correctos basándose en la clave del templateMap
  let currentCompanyKey = "AZAL";
  if (activeTemplate.includes("DEMA")) currentCompanyKey = "DEMA";
  else if (activeTemplate.includes("HERMAL")) currentCompanyKey = "HERMAL";
  else if (activeTemplate.includes("HGW")) currentCompanyKey = "HGW";
  else if (activeTemplate.includes("HYH")) currentCompanyKey = "HYH";

  const companyMeta = TEMPLATE_CONFIGS[currentCompanyKey];
  
  const nombreEmpresa = companyMeta.friendlyName;
  const nombreCliente = quote.destinationCompany || 'NOMBRE DEL CLIENTE Y/O EMPRESA';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 0 45px; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000000; line-height: 1.45; background: #ffffff; }
        .attention-block { margin-top: 10px; margin-bottom: 25px; font-size: 10pt; line-height: 1.4; color: #555; text-align: left; }
        .attention-title { font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
        .header-title { text-align: center; margin-bottom: 20px; font-size: 11pt; }
        .title { font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
        .subtitle { font-weight: bold; text-decoration: underline; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; }
        
        /* 🚀 INYECCIÓN DEL COLOR CORPORATIVO DINÁMICO SEGÚN LA EMPRESA SELECCIONADA */
        th { background-color: ${companyMeta.primaryColor} !important; color: white; font-weight: bold; font-size: 8.5pt; text-transform: uppercase; }
        
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .section-title { font-weight: bold; text-decoration: underline; margin-top: 20px; margin-bottom: 5px; }
        
        /* 🚀 CLASE ÚNICA DE VIÑETAS PARA PUNTOS PRIMARIOS */
        .list-bullet { list-style-type: disc; padding-left: 25px; margin-top: 5px; }
        .list-bullet li { margin-bottom: 8px; text-align: justify; }
        
        .text-center-total { text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; font-size: 10pt; }
        .professional-signature-section { margin-top: 50px; margin-bottom: 10px; text-align: center; page-break-inside: avoid; }
        .signature-title-label { font-size: 10pt; font-weight: bold; letter-spacing: 0.1em; margin-bottom: 45px; }
        .signature-solid-line { width: 250px; height: 1px; background: #000000; margin: 0 auto 8px auto; }
        .signature-fullname-text { font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
        .signature-role-subtext { font-size: 9pt; font-weight: bold; text-transform: uppercase; }
      </style>
    </head>
    <body>

      <div class="attention-block">
        <div class="attention-title">ATENCIÓN:</div>
        <div>C. Tte. Cor. Inf.</div>
        <div>Vicente Herrera Valdez,</div>
        <div>Jefe de I.M. de la Dir. Gral. Ind. Mil.</div>
      </div>

      <div class="header-title">
        <div class="title">PROPUESTA ECONÓMICA</div>
        <div class="subtitle">Requisición No. ${quote.requisitionNumber || ''}, "${quote.projectTitle || ''}."</div>
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
            const versionString = refVersion.toUpperCase().includes('VERSIÓN') || refVersion.toUpperCase().includes('VERSION') ? refVersion : `VERSIÓN: ${refVersion}`;
            return `
              <tr>
                <td>${index + 1}</td>
                <td class="text-left">${item.description}</td>
                <td>${item.techRequirements || ''}<br>${versionString}<br>${item.reqDate || ''}</td>
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

      <div class="text-center-total">
        ${totalEnTexto} IVA INCLUIDO.
      </div>

      <div class="section-title">CONDICIONES COMERCIALES:</div>
      <ul class="list-bullet">
        <li><span class="bold">Precios en Moneda Nacional.</span></li>
        <li><span class="bold">Vigencia de la cotización:</span> ${quote.validityDays || 120} días.</li>
        <li><span class="bold">Origen de los bienes:</span> ${quote.goodsOrigin || 'Nacional'}.</li>
        <li><span class="bold">Nacionalidad del proveedor:</span> ${quote.providerNationality || 'mexicana'}.</li>
        <li><span class="bold">Condiciones de pago:</span> Mi representada tiene considerado que el pago será a los ${quote.paymentDays || 17} días hábiles posteriores a la entrega de la factura, previa entrega de los bienes a satisfacción del Área requirente. Así mismo, el pago será mediante transferencia electrónica.</li>
        <li><span class="bold">Tiempo de entrega:</span> ${nombreEmpresa} realizará la entrega de los bienes requeridos y documentación completa a partir del día natural siguiente a la comunicación del fallo y a más tardar &nbsp;${quote.deliveryTime ? quote.deliveryTime.replace(/\s*al\s+fallo/i, '') : '3 meses'}  a referido evento.</li>
        <li><span class="bold">Lugar de la entrega:</span> ${nombreEmpresa}, entregará los bienes en las instalaciones que a continuación se indica: ${quote.deliveryPlace || 'UBICACIÓN DE LA EMPRESA Y/O CLIENTE.'}</li>
        <li><span class="bold">Contacto:</span> ${quote.contactPerson ? quote.contactPerson.replace(/^Contacto:\s*/i, '') : 'Contacto del cliente'}</li> 
        <li><span class="bold">Tiempo de fabricación:</span> ${quote.manufacturingTime || '2 meses'}.</li>
      </ul>

      <ul class="list-bullet">
        <li>La responsabilidad de <span class="bold">${nombreEmpresa}</span>, en relación con esta garantía consistirá en que este, sin ningún costo para la “${nombreCliente}”, reemplazará los “bienes”, en un plazo no mayor a 30 días hábiles conforme a los términos y condiciones para su aplicación.</li>
        <div class="section-title">Garantía de calidad:</div>
        <ul style="list-style-type: circle; margin-left: 25px; padding-left: 0; text-align: justify;">
          <li> ${nombreEmpresa}, deberá entregar por escrito una garantía de calidad contra defectos de fabricación y/o vicios ocultos que especifique que el “bien”, que oferta es nuevo de fábrica, que está libre de defectos y en buenas condiciones, conforme a las especificaciones técnicas del fabricante, la cual deberá responder de los defectos de fabricación y/o vicios ocultos que llegue a presentar el “bien”, por un plazo de <span class="bold">${quote.guaranteeMonths || 12} (doce) meses</span>, a partir de la expedición del acta de aceptación que formule con motivo de la entrega y recepción definitiva del “bien” a plena y entera satisfacción de la ${nombreCliente}.</li>
          <li>Esta garantía de calidad contra defectos de fabricación y/o vicios ocultos se cancelará una vez que haya fenecido el plazo estipulado en el inciso anterior a partir de la fecha de entrega total del “bien” y a entera satisfacción de la ${nombreCliente}.</li>
          <li>Para la aplicación de dicha garantía <span class="bold">${nombreEmpresa}</span>, en cualquier caso, de desperfecto que presente o daños que sufran “los bienes” adquiridos serán remplazados al 100% sin costo para la ${nombreCliente}.</li>
          <li>La reposición de los “bienes” con defectos de fabricación y/o vicios ocultos, se realizará en el lugar indicado en el apartado Ubicación del lugar donde se realizará la Entrega de los Bienes; para lo cual <span class="bold">${nombreEmpresa}</span> deberá establecer coordinación con el contacto especificado.</li>
          <li><span class="bold">${nombreEmpresa}</span> deberá recoger los “bienes” que presenten defectos de fabricación y/o vicios ocultos en el lugar indicado en el inciso anterior, sin costo adicional para la “${nombreCliente}”.</li>
          <li>La responsabilidad de <span class="bold">${nombreEmpresa}</span>, en relación con esta garantía consistirá en que este, sin ningún costo para la “${nombreCliente}”, reemplazará el “bien” que resulte defectuoso y en un plazo no mayor a 30 días hábiles.</li>
        </ul>
        <li><span class="bold">${nombreEmpresa}</span> cumplirá con las condiciones de entrega conforme a el Anexo Administrativo.</li>
        <li><span class="bold">${nombreEmpresa}</span> cumple con los atributos, normas, garantías y documentación indicada en el Anexo “C”, así como en el Anexo Administrativo y Anexo Técnico.</li>
        <li>Mi representada(o) cuenta con la capacidad técnica para el suministro de los bienes requeridos.</li>
        <li><span class="bold">El porcentaje de garantía de cumplimiento será del:</span> ${quote.complianceWarranty || 10}%</li>
        <li>Mi representada se encuentra inscrita en el Sistema Compras MX y Registro Único de Proveedores y de Contratistas (RUPC).</li>
        <li><span class="bold">Años de experiencia en el mercado:</span> ${quote.experienceYears || 5}</li>
        <li><span class="bold">Años de especialidad en el mercado:</span> ${quote.specialtyYears || 5}</li>
        <li><span class="bold">Número de contratos afines de los servicios a adquirir o contratar:</span> ${quote.similarContracts || 3}</li>
      </ul>

      <ul class="list-bullet">
        <li><span class="bold">Razón social:</span> ${nombreEmpresa}</li>
        <li><span class="bold">Objeto social o actividad que desarrolla:</span> ${companyMeta.objetoSocial}</li>
        <li><span class="bold">Domicilio legal:</span> ${companyMeta.legalAddress}</li>
        <li><span class="bold">Teléfono:</span> ${companyMeta.phone}</li>
        <li><span class="bold">RFC:</span> ${companyMeta.rfc}</li>
        <li><span class="bold">Nombre del representante legal:</span> ${companyMeta.legalRepresentative}</li>
        <li><span class="bold">Correo electrónico:</span> ${companyMeta.email}</li>
        <li><span class="bold">Página web:</span> ${companyMeta.email.includes('azal') ? 'www.azalmechanical.com' : ''}</li>
      </ul>

      <ul class="list-bullet">
        <li><span class="bold">Forma de pago:</span> Transferencia Electrónica.</li>
        <li><span class="bold">Nombre del banco:</span> ${companyMeta.bankName}</li>
        <li><span class="bold">Clabe Interbancaria:</span> ${companyMeta.bankAccount}</li>
        <li><span class="bold">Beneficiario de la cuenta:</span> ${nombreEmpresa}</li>
      </ul>

      <div style="text-align: justify; margin-top: 15px; margin-bottom: 30px;">
        Con la presente oferta económica manifestamos interés en participar en los bienes requeridos por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.
      </div>

      <div class="professional-signature-section">
        <div class="signature-title-label">ATENTAMENTE</div>
        <div class="signature-solid-line"></div>
        <div class="signature-fullname-text">${companyMeta.legalRepresentative}</div>
        <div class="signature-role-subtext">DIRECTOR DE OPERACIONES</div>
      </div>
    </body>
    </html>
  `;
}