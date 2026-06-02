import { amountToSpanishText } from "../quotes";

export function generateHyhTemplate(provider: any, quote: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  // Dato azul: Razón social del proveedor
  const nombreEmpresa = provider.companyName || 'HYH SUMINISTROS Y MANTENIMIENTO INDUSTRIAL, S.A.S. DE C.V.';
  
  // Genera dinámicamente el listado de números de partida (ej. "1, 2, 3, 4")
  const partidasNumeros = items.map((_, i) => i + 1).join(', ');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 45px; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000000; line-height: 1.5; background: #ffffff; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; }
        /* Se usa un color rojo/guinda distintivo para HYH */
        th { background-color: #B91C1C !important; color: white; font-weight: bold; text-transform: uppercase; }
        .text-left { text-align: left; }
        
        .signature-section { margin-top: 50px; text-align: center; page-break-inside: avoid; }
        .signature-line { width: 250px; height: 1px; background: #000000; margin: 0 auto 5px auto; }
        
        p { margin: 0 0 10px 0; text-align: justify; }
      </style>
    </head>
    <body>

      <table>
        <thead>
          <tr>
            <th>PTA.</th>
            <th>DESCRIPCIÓN</th>
            <th>CANTIDAD</th>
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
            <td colspan="4" style="border: none;"></td>
            <td class="bold text-right">SUBTOTAL</td>
            <td class="bold text-right">${formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="4" style="border: none;"></td>
            <td class="bold text-right">IVA</td>
            <td class="bold text-right">${formatCurrency(iva)}</td>
          </tr>
          <tr>
            <td colspan="4" style="border: none;"></td>
            <td class="bold text-right">TOTAL</td>
            <td class="bold text-right">${formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>

      <div class="bold" style="margin-bottom: 10px;">TÉRMINOS COMERCIALES:</div>
      <p>Moneda en que se cotiza: Moneda Nacional.</p>
      <p>Vigencia de la cotización: ${quote.validityDays || 90} días</p>
      <p>Fecha de entrega: a partir del día siguiente hábil a la formalización del respectivo instrumento contractual y teniendo como fecha límite ${quote.deliveryTime || '95 días naturales'} posteriores de referida formalización.</p>
      <p>Lugar de entrega: ${quote.deliveryPlace || 'En los Almacenes Generales de Materiales de Guerra, ubicado en el Campo Militar Estratégico Conjunto No. 37-D, “Gral. Div. P.A Alfredo Lezama Álvarez”, Santa Lucía, México, Carretera México-Pachuca Km, 42.5, C.P. 55640, considerando que referida entrega será de lunes a viernes en un horario de 08:00 a 14:00 Hrs.'}</p>
      <p>Condiciones de entrega: Conforme a el Anexo Administrativo.</p>
      
      <p class="bold" style="margin-bottom: 5px;">Garantía de calidad:</p>
      <p>Carta escrita membretada bajo protesta de decir verdad, en donde manifieste que otorgará ${quote.guaranteeMonths || 3} (${quote.guaranteeMonthsText || 'tres'}) meses de garantía de calidad para las partidas números: ${partidasNumeros}.</p>
      <p>La garantía de calidad deberá de cubrir por ${quote.guaranteeMonths || 3} (${quote.guaranteeMonthsText || 'tres'}) meses el buen estado y empleo de las refacciones, accesorios e insumos que fueron adquiridos.</p>
      <p>La garantía de Calidad se activará una vez que se detecte en el plazo de su vigencia, alguna falla, deterioro, o mal funcionamiento que impidan el uso adecuado de los bienes que fueron adquiridos.</p>
      <p>La garantía de calidad surtirá efectos a partir de que se hayan recibido los bienes a entera satisfacción del área usuaria mediante el acta de recepción definitiva.</p>
      <p>En la garantía de calidad se indicará que la obligación de ${nombreEmpresa}, será que sin costo para esta Secretaría de Estado llevará a cabo el cambio de los insumos por otros de buena calidad, sin que para ello transcurran más de 7 (siete) días hábiles, a partir de la fecha y hora de la notificación.</p>
      <p>${nombreEmpresa}, será notificado de la falla, deterioro, o mal funcionamiento de los bienes, atribuibles a su mala calidad, a través de una carta dirigida al representante legal y enviada por correo electrónico a la dirección electrónica que el proveedor dispondrá para tal fin.</p>
      <p>${nombreEmpresa}, coordinará con el Administrador del contrato lo relativo al acceso al sitio donde se encuentran los bienes a ser reemplazados por activación de la garantía de calidad.</p>
      
      <p>Forma de Pago: Transferencia Electrónica.</p>
      <p>Mi representada cumple con las Condiciones de Entrega, Especificaciones Técnicas, Normas y Atributos Indicados en el Anexo Técnico y Administrativo.</p>
      
      <p>Razón social: ${nombreEmpresa}<br>
      RFC: ${provider.rfc}.<br>
      Domicilio: ${provider.legalAddress}<br>
      Correo electrónico: ${provider.email}<br>
      Origen de la empresa: ${quote.providerNationality || 'Mexicana'}.<br>
      Banco: ${provider.bankName || 'Santander'}.<br>
      Clave Bancaria Estándar: ${provider.bankAccount || '014 180 65509776799 2'}<br>
      Nombre del representante legal: ${provider.legalRepresentative}<br>
      Teléfono: ${provider.phone}.<br>
      Objeto Social: ${provider.businessActivity}</p>
      
      <p>Con la presente oferta económica manifestamos interés en participar en el servicio de adquisición de bienes requerido por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.</p>

      <div class="signature-section">
        <div class="bold">ATENTAMENTE</div>
        <br><br><br>
        <div class="signature-line"></div>
        <div class="bold">${provider.legalRepresentative ? provider.legalRepresentative.toUpperCase() : 'ING. HECTOR TREJO TOVAR'}</div>
        <div class="bold">REPRESENTANTE LEGAL</div>
      </div>

    </body>
    </html>
  `;
}