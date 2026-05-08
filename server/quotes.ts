export interface RawQuoteLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount?: number;
}

export interface NormalizedQuoteLineItem {
  description: string;
  quantity: number;
  unit: string;
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

export function generateQuoteHTML(quote: any, provider: any, lineItems: any[]): string {
  const totalCents = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const total = fromCents(totalCents);
  const totalText = amountToSpanishText(total);

  const itemsHTML = lineItems.map(item => `
    <tr>
      <td style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 12px;">${item.quantity}</td>
      <td style="border: 1px solid #000; padding: 8px; font-size: 12px;">${item.unit}</td>
      <td style="border: 1px solid #000; padding: 8px; font-size: 12px;">${item.description}</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 12px;">$${item.unitPrice.toFixed(2)}</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 12px;">$${item.amount.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cotización ${quote.folio}</title>
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          margin: 0;
          padding: 20px;
          font-size: 12px;
          line-height: 1.4;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        .header p {
          margin: 5px 0;
          font-size: 14px;
        }
        .quote-info {
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
        }
        .info-section {
          width: 48%;
        }
        .info-section h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
        }
        .info-section p {
          margin: 3px 0;
        }
        .commercial-terms {
          margin-bottom: 20px;
        }
        .commercial-terms h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
        }
        th {
          border: 1px solid #000;
          padding: 8px;
          background-color: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        td {
          border: 1px solid #000;
          padding: 8px;
        }
        .total-section {
          text-align: right;
          margin-top: 20px;
          font-weight: bold;
        }
        .total-section p {
          margin: 5px 0;
          font-size: 14px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 10px;
          border-top: 1px solid #000;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>HGW Mechanical Support</h1>
        <p>Cotización de Servicios Mecánicos</p>
      </div>

      <div class="quote-info">
        <div class="info-section">
          <h3>Información de la Cotización</h3>
          <p><strong>Folio:</strong> ${quote.folio}</p>
          <p><strong>Fecha:</strong> ${quote.quoteDate}</p>
          <p><strong>Empresa Destino:</strong> ${quote.empresaDestino}</p>
        </div>
        <div class="info-section">
          <h3>Información del Proveedor</h3>
          <p><strong>Empresa:</strong> ${provider.companyName}</p>
          <p><strong>Representante Legal:</strong> ${provider.legalRepresentative}</p>
          <p><strong>Teléfono:</strong> ${provider.phone}</p>
          <p><strong>Email:</strong> ${provider.email}</p>
        </div>
      </div>

      <div class="commercial-terms">
        <h3>Condiciones Comerciales</h3>
        <p>${quote.commercialTerms}</p>
      </div>

      <h3 style="border-bottom: 1px solid #000; padding-bottom: 5px;">Partidas de la Cotización</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 10%;">Cantidad</th>
            <th style="width: 15%;">Unidad</th>
            <th style="width: 45%;">Descripción</th>
            <th style="width: 15%;">Precio Unitario</th>
            <th style="width: 15%;">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="total-section">
        <p><strong>Total: $${total.toFixed(2)} MXN</strong></p>
        <p><strong>Cantidad en letra: ${totalText}</strong></p>
      </div>

      <div class="footer">
        <p>HGW Mechanical Support - Cotización generada automáticamente el ${new Date().toLocaleDateString('es-ES')}</p>
        <p>Esta cotización es válida por 30 días a partir de la fecha de emisión</p>
      </div>
    </body>
    </html>
  `;
}
