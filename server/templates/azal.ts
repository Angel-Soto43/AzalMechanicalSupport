import { amountToSpanishText } from "../quotes";

export function generateAzalTemplate(provider: any, quote: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  // 1. REGLA: Datos quemados de la empresa (Azal)
  const nombreEmpresa = 'Azal Mechanical Supports, S.A. de C.V.';
  const rfcEmpresa = 'AMS161027SY5';
  const direccionEmpresa = 'Lago Pátzcuaro 17, Los Manantiales, 54420, Nicolás Romero, Estado de México.';
  const telEmpresa = '55 4854 0838 y 55 1733 2055';
  const correoEmpresa = 'azal@azalmechanical.com';
  const webEmpresa = 'www.azalmechanical.com';
  const representante = 'Ing. Víctor Hernández Hernández.';
  const bancoEmpresa = 'GRUPO FINANCIERO INBURSA';
  const clabeEmpresa = '036 180 500 524 410 942';

  // Fecha formateada (Regla 4)
  const dateParts = (quote.quoteDate || "").split('-');
  let formattedDate = "";
  if (dateParts.length === 3) {
    const quoteDateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
    formattedDate = quoteDateObj.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // 3. REGLA: Cero texto de relleno (Manejo de Arreglos dinámicos)
  // Se asume que el backend ya hizo el JSON.parse() y los mandó en variables limpias
  const garantiasExtra = Array.isArray(quote.parsedGuarantees) && quote.parsedGuarantees.length > 0 
    ? quote.parsedGuarantees.map((g: string) => `<li>${g}</li>`).join('') 
    : '';

  const objetosSociales = Array.isArray(quote.parsedObjetos) && quote.parsedObjetos.length > 0
    ? quote.parsedObjetos.map((obj: string) => `<li>${obj}</li>`).join('')
    : `<li>La compra y/o venta de accesorios y refacciones, la compra, venta, importación... (Objeto social general)</li>`;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        /* REGLA 4: Layout y Espaciados */
        body { margin: 0; padding: 0 45px; font-family: Arial, sans-serif; font-size: 10pt; color: #000; line-height: 1.45; }
        .flex-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .title { text-align: center; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; font-size: 11pt; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; }
        th { background-color: #0F172A !important; color: white; font-weight: bold; font-size: 8.5pt; text-transform: uppercase; }
        .section-title { font-weight: bold; text-decoration: underline; margin-top: 20px; margin-bottom: 5px; }
        .list-bullet { list-style-type: disc; padding-left: 25px; margin-top: 5px; text-align: justify; }
        .list-bullet li { margin-bottom: 8px; }
        .signature-section { margin-top: 50px; text-align: center; page-break-inside: avoid; }
      </style>
    </head>
    <body>

    <!-- REGLA 4: Ajuste exacto al diseño original (Fecha arriba, Atención abajo en un solo párrafo) -->
      <div class="text-right" style="margin-bottom: 15px;">
        Nicolás Romero, Estado de México<br>
        a ${formattedDate}
      </div>

      <div class="text-left" style="margin-bottom: 25px;">
        <span class="bold">ATENCIÓN:</span><br>
        ${quote.attnGrado || quote.contactPerson ? `${quote.attnGrado || ''} ${quote.contactPerson || ''}`.trim() + '<br>' : ''}
        ${quote.attnCargo ? quote.attnCargo + '<br>' : ''}
        
        <!-- Junta Dependencia, Lugar, Dirección, Área y Ubicación en un solo renglón separado por comas -->
        ${[
          quote.destinationCompany, 
          quote.attnLugar, 
          quote.attnDireccion, 
          quote.attnArea, 
          quote.attnUbicacion
        ].filter(Boolean).join(', ')}
      </div>

      <div class="title">PROPUESTA ECONÓMICA</div>
      <div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 20px;">
        "${quote.attnNombreProcedimiento || quote.projectTitle || ''}."
      </div>

      <div class="title">PROPUESTA ECONÓMICA</div>
      <div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 20px;">
        "${quote.projectTitle || ''}."
      </div>

      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>DESCRIPCIÓN</th>
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
              <td>${item.quantity}</td>
              <td>${item.unitMeasure || 'Servicio'}</td>
              <td class="text-right">${formatCurrency(item.unitPrice)}</td>
              <td class="text-right">${formatCurrency(item.quantity * item.unitPrice)}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="4" style="border: none;"></td>
            <td class="bold text-right" style="background-color: #f2f2f2;">SUBTOTAL</td>
            <td class="bold text-right">${formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="4" style="border: none;"></td>
            <td class="bold text-right" style="background-color: #f2f2f2;">IVA (16%)</td>
            <td class="bold text-right">${formatCurrency(iva)}</td>
          </tr>
          <tr>
            <td colspan="4" style="border: none;"></td>
            <td class="bold text-right" style="background-color: #f2f2f2;">TOTAL</td>
            <td class="bold text-right">${formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>

      <div style="text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 20px;">
        ${totalEnTexto} IVA INCLUIDO.
      </div>

      <div class="section-title">CONDICIONES COMERCIALES:</div>
      <ul class="list-bullet">
        <li><span class="bold">Precios en Moneda Nacional.</span></li>
        <li><span class="bold">Vigencia de la cotización:</span> ${quote.validityDays} días.</li>
        <li><span class="bold">Origen de los servicios:</span> ${quote.goodsOrigin}.</li>
        <li><span class="bold">Nacionalidad del proveedor:</span> ${quote.providerNationality}.</li>
        <li><span class="bold">Condiciones de pago:</span> Mi representada tiene considerado que el pago será conforme a lo establecido en el Anexo Administrativo.</li>
        <li><span class="bold">Tiempo de entrega:</span> La entrega de los servicios de mantenimiento y documentación completa a partir del día hábil siguiente de la formalización del instrumento contractual.</li>
        <li><span class="bold">Lugar de la entrega:</span> ${nombreEmpresa}, entregará los servicios en las instalaciones que a continuación se indican: ${quote.deliveryPlace}.</li>
      </ul>


      <li><span class="bold">Condiciones de entrega:</span>
          <ul style="list-style-type: circle; margin-top: 5px; padding-left: 20px;">
            <li><span class="bold">${nombreEmpresa}</span>, establecerá comunicación vía telefónica con el área usuaria, a fin de gestionar la entrega y recepción de las partidas correspondientes.</li>
            <li>Se realizará en entrega parciales (partidas completas) o en una sola entrega la totalidad de los servicios, la cual no deberá rebasar la fecha de entrega establecida, el área usuaria, al recibir los servicios deberá elaborar y firmar la “constancia de recepción” de servicios, mediante la cual especifique que estos fueron recibidos conforme al documento contractual, misma que será remitida al área requirente y al administrador adjunto del contrato en un término no mayor a 48 horas.</li>
          </ul>
        </li>

      <div class="section-title">Garantía de calidad:</div>
      <ul class="list-bullet" style="list-style-type: circle;">
        <li><span class="bold">${nombreEmpresa}</span>, entregará una garantía de calidad por escrito que ampare los trabajos realizados y/o las partes y componentes reemplazados con vigencia de <span class="bold">${quote.guaranteeMonths} meses</span> a partir de la entrega y recepción definitiva...</li>
        ${garantiasExtra}
      </ul>

      <ul class="list-bullet">
        <li><span class="bold">Razón social:</span> ${nombreEmpresa}</li>
        <li><span class="bold">Objeto social o actividad que desarrolla:</span>
          <ul style="list-style-type: circle; margin-top: 5px;">
             ${objetosSociales}
          </ul>
        </li>
        <li><span class="bold">Domicilio legal:</span> ${direccionEmpresa}</li>
        <li><span class="bold">Teléfono:</span> ${telEmpresa}</li>
        <li><span class="bold">RFC:</span> ${rfcEmpresa}</li>
        <li><span class="bold">Nombre del representante legal:</span> ${representante}</li>
        <li><span class="bold">Correo electrónico:</span> ${correoEmpresa}</li>
        <li><span class="bold">Página web:</span> ${webEmpresa}</li>
      </ul>

      <ul class="list-bullet">
        <li><span class="bold">Forma de pago:</span> Transferencia Electrónica.</li>
        <li><span class="bold">Nombre del banco:</span> ${bancoEmpresa}</li>
        <li><span class="bold">Clabe Interbancaria:</span> ${clabeEmpresa}</li>
        <li><span class="bold">Beneficiario de la cuenta:</span> ${nombreEmpresa}</li>
      </ul>

      <div class="signature-section">
        <div class="bold" style="letter-spacing: 0.1em; margin-bottom: 45px;">ATENTAMENTE</div>
        <div style="width: 250px; height: 1px; background: #000; margin: 0 auto 5px auto;"></div>
        <div class="bold">${representante}</div>
        <div class="bold" style="font-size: 9pt;">DIRECTOR DE OPERACIONES</div>
      </div>
    </body>
    </html>
  `;
}