import { amountToSpanishText } from "../quotes";

export function generateDemaTemplate(provider: any, quote: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const nombreEmpresa = provider.companyName || 'DEMA Ingeniería y Soluciones Industriales S.A. de C.V.';
  const nombreCliente = quote.destinationCompany || 'SECRETARÍA DE LA DEFENSA NACIONAL';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 40px; font-family: Arial, sans-serif; font-size: 10pt; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: center; }
        th { background-color: #1E3A8A !important; color: white; text-transform: uppercase; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
      </style>
    </head>
    <body>
      <div style="text-align: center; font-weight: bold; margin-bottom: 20px;">OFERTA ECONÓMICA</div>
      
      <table>
        <thead>
          <tr>
            <th>PTDA.</th>
            <th>DESCRIPCIÓN</th>
            <th>CANT.</th>
            <th>U.M.</th>
            <th>COSTO UNITARIO</th>
            <th>IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td class="text-left">${item.description}</td>
              <td>${item.quantity}</td>
              <td>${item.unitMeasure || item.unit}</td>
              <td class="text-right">${formatCurrency(item.unitPrice)}</td>
              <td class="text-right">${formatCurrency(item.quantity * item.unitPrice)}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="4" style="border:none"></td>
            <td class="bold">SUBTOTAL</td>
            <td class="bold text-right">${formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="4" style="border:none"></td>
            <td class="bold">IVA</td>
            <td class="bold text-right">${formatCurrency(iva)}</td>
          </tr>
          <tr>
            <td colspan="4" style="border:none"></td>
            <td class="bold">TOTAL</td>
            <td class="bold text-right">${formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>

      <p class="bold">(${totalEnTexto})</p>

      <div class="section-title">TÉRMINOS COMERCIALES:</div>
      <ul>
        <li>Moneda: Moneda Nacional</li>
        <li>Vigencia: ${quote.validityDays || 90} días</li>
        <li>Lugar de entrega: ${provider.companyName} hará entrega en: ${quote.deliveryPlace}</li>
      </ul>

      <div style="margin-top: 50px; text-align: center;">
        <div style="border-top: 1px solid #000; width: 200px; margin: 0 auto;"></div>
        <p class="bold">${provider.legalRepresentative}</p>
        <p>REPRESENTANTE LEGAL</p>
      </div>
    </body>
    </html>
  `;
}