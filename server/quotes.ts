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

export function generateQuoteHTML(quote: any, provider: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 2cm; }
        body { font-family: 'Arial', sans-serif; font-size: 10pt; color: #000; line-height: 1.4; }
        .header { text-align: center; font-weight: bold; margin-bottom: 25px; }
        .title { text-decoration: underline; margin-bottom: 10px; font-size: 11pt; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 5px; text-align: center; vertical-align: middle; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .section-title { font-weight: bold; text-decoration: underline; margin-top: 20px; margin-bottom: 5px; }
        .list-no-bullet { list-style-type: none; padding-left: 0; margin-top: 5px; }
        .list-no-bullet li { margin-bottom: 5px; text-align: justify; }
        .signature-box { margin-top: 60px; text-align: center; }
        .signature-line { width: 250px; border-bottom: 1px solid #000; margin: 0 auto 5px auto; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">PROPUESTA ECONÓMICA</div>
        <div>Requisición No. ${quote.requisitionNumber || ''}, "${quote.projectTitle || ''}."</div>
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
          ${items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td class="text-left">${item.description}</td>
              <td>${item.techRequirements}<br>VERSIÓN:${item.versionReference}<br>${item.reqDate || ''}</td>
              <td>${item.quantity}</td>
              <td>${item.unitMeasure || item.unit}</td>
              <td class="text-right">${formatCurrency(item.unitPrice)}</td>
              <td class="text-right">${formatCurrency(item.quantity * item.unitPrice)}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="5" style="border: none;"></td>
            <td class="bold text-right" style="background-color: #f2f2f2;">SUBTOTAL</td>
            <td class="bold text-right">${formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="5" style="border: none;"></td>
            <td class="bold text-right" style="background-color: #f2f2f2;">IVA</td>
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
        ${quote.totalText ? quote.totalText + ' M.N. IVA INCLUIDO.' : ''}
      </div>

      <div class="section-title">CONDICIONES COMERCIALES:</div>
      <ul class="list-no-bullet">
        <li><span class="bold">Precios en Moneda Nacional.</span></li>
        <li><span class="bold">Vigencia de la cotización:</span> ${quote.validityDays || 120} días.</li>
        <li><span class="bold">Origen de los bienes:</span> ${quote.goodsOrigin || 'Nacional'}.</li>
        <li><span class="bold">Nacionalidad del proveedor:</span> ${quote.providerNationality || 'mexicana'}.</li>
        <li><span class="bold">Condiciones de pago:</span> Mi representada tiene considerado que el pago será a los ${quote.paymentDays || 17} días hábiles posteriores a la entrega de la factura, previa entrega de los bienes a satisfacción del Área requirente. Así mismo, el pago será mediante transferencia electrónica.</li>
        <li><span class="bold">Tiempo de entrega:</span> ${provider.companyName}, realizará la entrega de los bienes requeridos y documentación completa a partir del día natural siguiente a la comunicación del fallo y a más tardar ${quote.deliveryTime || '3 meses'} posteriores a referido evento.</li>
        <li><span class="bold">Lugar de la entrega:</span> ${provider.companyName}, entregará los bienes en las instalaciones que a continuación se indica:<br>
        ${quote.deliveryPlace || 'Subdirección de Almacenes de la Dirección General de Industria Militar.'}<br>
        <span class="bold">Contacto:</span> ${quote.contactPerson || 'Tte. Cor. Ing. Ind. Omar Luna Ramírez'}</li>
        <li><span class="bold">Tiempo de fabricación:</span> ${quote.manufacturingTime || '2 meses'}.</li>
      </ul>

      <div style="text-align: justify; margin-bottom: 10px;">
        La responsabilidad de <span class="bold">${provider.companyName}</span>, en relación con esta garantía consistirá en que este, sin ningún costo para la “Secretaría de la Defensa Nacional”, reemplazará los “bienes”, en un plazo no mayor a 30 días hábiles conforme a los términos y condiciones para su aplicación.
      </div>

      <div class="bold" style="margin-bottom: 5px;">Garantía de calidad:</div>
      <div style="text-align: justify; margin-bottom: 15px;">
        <span class="bold">${provider.companyName}</span>, deberá entregar por escrito una garantía de calidad contra defectos de fabricación y/o vicios ocultos que especifique que el “bien”, que oferta es nuevo de fábrica, que está libre de defectos y en buenas condiciones... por un plazo de <span class="bold">${quote.guaranteeMonths || 12} meses</span>, a partir de la expedición del acta de aceptación...
        <br><br>
        Mi representada se encuentra inscrita en el Sistema Compras MX y Registro Único de Proveedores y de Contratistas (RUPC).<br>
        <span class="bold">El porcentaje de garantía de cumplimiento será del:</span> ${quote.complianceWarranty || 10}%<br>
        <span class="bold">Años de experiencia en el mercado:</span> ${quote.experienceYears || 5}<br>
        <span class="bold">Años de especialidad en el mercado:</span> ${quote.specialtyYears || 5}<br>
        <span class="bold">Número de contratos afines:</span> ${quote.similarContracts || 3}
      </div>

      <ul class="list-no-bullet">
        <li><span class="bold">Razón social:</span> ${provider.companyName}</li>
        <li><span class="bold">Objeto social o actividad que desarrolla:</span> ${provider.businessActivity || ''}</li>
        <li><span class="bold">Domicilio legal:</span> ${provider.legalAddress || ''}</li>
        <li><span class="bold">Teléfono:</span> ${provider.phone}</li>
        <li><span class="bold">RFC:</span> ${provider.rfc || ''}</li>
        <li><span class="bold">Nombre del representante legal:</span> ${provider.legalRepresentative}</li>
        <li><span class="bold">Correo electrónico:</span> ${provider.email}</li>
        <li><span class="bold">Página web:</span> ${provider.website || ''}</li>
      </ul>

      <ul class="list-no-bullet">
        <li><span class="bold">Forma de pago:</span> Transferencia Electrónica.</li>
        <li><span class="bold">Nombre del banco:</span> ${quote.bankName || ''}</li>
        <li><span class="bold">Clabe Interbancaria:</span> ${quote.bankAccount || ''}</li>
        <li><span class="bold">Beneficiario de la cuenta:</span> ${quote.bankBeneficiary || ''}</li>
      </ul>

      <div style="text-align: justify; margin-top: 15px; margin-bottom: 30px;">
        Con la presente oferta económica manifestamos interés en participar en los bienes requeridos por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.
      </div>

      <div class="signature-box">
        <div class="bold">ATENTAMENTE</div>
        <br><br><br>
        <div class="signature-line"></div>
        <div class="bold" style="text-transform: uppercase;">${provider.legalRepresentative}</div>
        <div class="bold">DIRECTOR DE OPERACIONES</div>
      </div>
    </body>
    </html>
  `;
}
