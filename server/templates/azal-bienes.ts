import { amountToSpanishText } from "../quotes";
import fs from "fs";
import path from "path";

export function generateAzalBienesTemplate(provider: any, quote: any, items: any[]) {
  // Cálculos matemáticos
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  // 1. LÓGICA DE FECHA Y LUGAR
  let fechaFormateada = "";
  if (quote.attnDia && quote.attnMes && quote.attnAnio) {
    fechaFormateada = `${quote.attnDia} de ${quote.attnMes.toLowerCase()} de ${quote.attnAnio}`;
  } else {
    const dateParts = (quote.quoteDate || "").split('-');
    if (dateParts.length === 3) {
      const quoteDateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
      fechaFormateada = quoteDateObj.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  }
  const lugarExpedicion = quote.attnLugar || "Nicolás Romero, Estado de México";

  // 2. LÓGICA DE LUGARES DE ENTREGA Y CONTACTO CONDICIONAL
  let lugaresEntregaHtml = "";
  let contactoGlobalHtml = "";

  let deliveryLocs = quote.deliveryLocations || quote.deliveryLocationsJson;
  if (typeof deliveryLocs === 'string') {
    try { deliveryLocs = JSON.parse(deliveryLocs); } catch (e) { deliveryLocs = []; }
  }

  // Búsqueda del nombre de contacto general para la viñeta de "Contacto:"
  const nombreAtencion = quote.attnNombre || quote.contactPerson || quote.contacto || '';

  if (quote.deliverySingle !== false) {
    lugaresEntregaHtml = quote.deliveryPlace || quote.deliveryLocation || "Por definir";
    contactoGlobalHtml = `<span class="bold">Contacto:</span> ${quote.attnContacto || nombreAtencion}`;
  } else if (Array.isArray(deliveryLocs) && deliveryLocs.length > 0) {
    lugaresEntregaHtml = `
      <br><br>
      <table style="width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 5px; font-size: 9pt;">
        <thead>
          <tr>
            <th style="border: 1px solid #5A69D4; padding: 6px 4px; background-color: #5A69D4; color: white; width: 12%; text-align: center;">NO.<br>PARTIDA</th>
            <th style="border: 1px solid #5A69D4; padding: 6px 4px; background-color: #5A69D4; color: white; width: 44%; text-align: center;">DIRECCIÓN</th>
            <th style="border: 1px solid #5A69D4; padding: 6px 4px; background-color: #5A69D4; color: white; width: 44%; text-align: center;">CONTACTO</th>
          </tr>
        </thead>
        <tbody>
          ${deliveryLocs.map((loc: any) => `
            <tr>
              <td style="border: 1px solid #5A69D4; padding: 6px 4px; text-align: center; vertical-align: middle;">${loc.noPartida || ''}</td>
              <td style="border: 1px solid #5A69D4; padding: 8px; text-align: left;">${loc.address || ''}</td>
              <td style="border: 1px solid #5A69D4; padding: 8px; text-align: left;">${loc.contact || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    contactoGlobalHtml = "";
  }

  // 3. LÓGICA CONDICIONAL: Tiempo de Fabricación
  const tiempoFabricacionHtml = quote.hasManufacturingTime 
    ? `<li><span class="bold">Tiempo de fabricación:</span> ${quote.manufacturingTime || '2 meses'}.</li>` 
    : '';

  // 4. LÓGICA DINÁMICA: Objeto Social
  let socialObjs = quote.selectedSocialObjects || quote.selectedSocialObjectsJson;
  if (typeof socialObjs === 'string') {
    try { socialObjs = JSON.parse(socialObjs); } catch (e) { socialObjs = []; }
  }
  
  let objetoSocialHtml = "";
  if (Array.isArray(socialObjs) && socialObjs.length > 0) {
    objetoSocialHtml = socialObjs.join(' ');
  } else {
    objetoSocialHtml = "Adquirir, fabricar, ensamblar, procesar, preparar, reparar, vender, comprar, distribuir, importar, exportar e instalar todo tipo de componentes...";
  }

  // 5. LÓGICA DINÁMICA: Garantías de Calidad
  let qGuarantees = quote.qualityGuarantees || quote.qualityGuaranteesJson;
  if (typeof qGuarantees === 'string') {
    try { qGuarantees = JSON.parse(qGuarantees); } catch (e) { qGuarantees = []; }
  }

  let garantiasHtml = "";
  if (Array.isArray(qGuarantees) && qGuarantees.length > 0) {
    const validGuarantees = qGuarantees.filter((g: any) => typeof g === 'string' && g.trim() !== "");
    if (validGuarantees.length > 0) {
      garantiasHtml = validGuarantees.map((g: string) => `<li style="margin-bottom: 8px;">${g}</li>`).join('');
    }
  }

  // LÓGICA PARA LEER LA FIRMA DE AZAL EN BASE64
  let firmaBase64 = "";
  try {
    const firmaPath = path.join(process.cwd(), 'server', 'assets', 'firma-azal.png');
    if (fs.existsSync(firmaPath)) {
      firmaBase64 = `data:image/png;base64,${fs.readFileSync(firmaPath).toString('base64')}`;
    }
  } catch (error) {
    console.warn("No se pudo cargar la firma de Azal:", error);
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          margin: 0; 
          padding: 0 45px 45px 45px; 
          font-family: "Aptos Narrow", Arial, sans-serif; 
          font-size: 11pt; 
          color: #000000; 
          line-height: 1.5; 
          background: #ffffff; 
        }

        /* 🚀 1. EL ENCABEZADO FIJO FLOTANTE */
        .fixed-header {
          position: fixed;
          top: 0;
          left: 45px;
          right: 45px;
          z-index: 10;
          padding-top: 10px;
          background: #ffffff;
        }

        /* 🚀 2. LA TABLA CONTENEDORA QUE EMPUJA EL TEXTO */
        .content-table { width: 100%; border-collapse: collapse; border: none; }
        .content-table > thead { display: table-header-group; }
        .content-table > tbody { display: table-row-group; }
        .content-table > thead > tr > td { border: none; padding: 0; }
        .content-table > tbody > tr > td { border: none; padding: 0; }
        
        /* 🚀 3. EL ESPACIADOR FANTASMA (Ajusta la altura del bloque) */
        .header-space {
          height: 160px; 
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        
        /* 🚀 TABLA DE DATOS DE AZAL */
        .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; font-size: 10pt; }
        .data-table th, .data-table td { border: 1px solid #5A69D4; padding: 6px 4px; text-align: center; vertical-align: middle; }
        .data-table th { background-color: #5A69D4; color: white; font-weight: bold; text-transform: uppercase; }
        
        .list-bullet { list-style-type: disc; padding-left: 25px; margin-top: 5px; margin-bottom: 15px; }
        .list-bullet li { margin-bottom: 6px; text-align: justify; }
        
        .list-circle { list-style-type: circle; padding-left: 25px; margin-top: 5px; margin-bottom: 15px; }
        .list-circle li { margin-bottom: 6px; text-align: justify; }

        .signature-section { margin-top: 50px; text-align: center; page-break-inside: avoid; }
        .signature-line { width: 250px; height: 1px; background: #000000; margin: 0 auto 5px auto; }
        
        p { margin: 0 0 10px 0; text-align: justify; }
      </style>
    </head>
    <body>

      <div class="fixed-header">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
          <div style="line-height: 1.3; width: 60%; text-align: left;">
            <span class="bold">ATENCIÓN:</span><br>
            ${quote.attnGrado ? quote.attnGrado + '<br>' : ''}
            ${nombreAtencion ? nombreAtencion + '<br>' : ''}
            ${quote.attnCargo ? quote.attnCargo + '<br>' : ''}
            ${quote.destinationCompany || quote.attnDependencia || ''}<br>
            ${quote.attnArea ? quote.attnArea + '<br>' : ''}
            ${quote.attnUbicacion ? quote.attnUbicacion + '<br>' : ''}
            ${quote.attnDireccion ? quote.attnDireccion : ''}
          </div>
          <div class="text-right" style="width: 40%;">
            ${lugarExpedicion}<br>
            a ${fechaFormateada}
          </div>
        </div>
      </div>

      <table class="content-table">
        <thead>
          <tr>
            <td>
              <div class="header-space"></div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>

              <div class="bold text-center" style="font-size: 11pt; margin-bottom: 10px; text-decoration: underline;">PROPUESTA ECONÓMICA</div>
              <div class="bold text-center" style="margin-bottom: 20px;">
                ${quote.attnNombreProcedimiento || quote.requisitionNumber || 'S/N'}
              </div>

              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 5%;">No.</th>
                    <th style="width: 25%;">DESCRIPCIÓN</th>
                    <th style="width: 26%;">REQUERIMIENTOS TÉCNICOS</th>
                    <th style="width: 8%;">CANT.</th>
                    <th style="width: 8%;">U.M.</th>
                    <th style="width: 13%;">COSTO UNITARIO</th>
                    <th style="width: 15%;">COSTO TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item, index) => {
                    const reqTecnicos = [
                      item.techRequirements ? item.techRequirements : '',
                      item.versionReference ? 'VERSIÓN: ' + item.versionReference : '',
                      item.reqDate ? item.reqDate : ''
                    ].filter(Boolean).join('<br>');

                    return `
                      <tr>
                        <td>${item.noPartida || index + 1}</td>
                        <td class="text-left">${item.description}</td>
                        <td class="text-left" style="font-size: 8pt;">${reqTecnicos}</td>
                        <td>${item.quantity}</td>
                        <td>${item.unitMeasure || item.unit}</td>
                        <td class="text-right">${formatCurrency(item.unitPriceCents ? item.unitPriceCents / 100 : item.unitPrice)}</td>
                        <td class="text-right">${formatCurrency(item.quantity * (item.unitPriceCents ? item.unitPriceCents / 100 : item.unitPrice))}</td>
                      </tr>
                    `;
                  }).join('')}
                  <tr>
                    <td colspan="5" style="border: none !important; background-color: #ffffff;"></td>
                    <td class="bold text-center">SUBTOTAL</td>
                    <td class="bold text-right">${formatCurrency(subtotal)}</td>
                  </tr>
                  <tr>
                    <td colspan="5" style="border: none !important; background-color: #ffffff;"></td>
                    <td class="bold text-center">IVA</td>
                    <td class="bold text-right">${formatCurrency(iva)}</td>
                  </tr>
                  <tr>
                    <td colspan="5" style="border: none !important; background-color: #ffffff;"></td>
                    <td class="bold text-center">TOTAL</td>
                    <td class="bold text-right">${formatCurrency(total)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="bold text-center" style="margin-bottom: 25px; text-transform: uppercase;">
                ${totalEnTexto} IVA INCLUIDO.
              </div>

              <div class="bold" style="text-decoration: underline; margin-bottom: 5px;">CONDICIONES COMERCIALES:</div>
              <ul class="list-bullet">
                <li><span class="bold">Precios en Moneda Nacional.</span></li>
                <li><span class="bold">Vigencia de la cotización:</span> ${quote.validityDays || 120} días.</li>
                <li><span class="bold">Origen de los bienes:</span> ${quote.goodsOrigin || 'Nacional'}.</li>
                <li><span class="bold">Nacionalidad del proveedor:</span> mexicana.</li>
                <li><span class="bold">Condiciones de pago:</span> Mi representada tiene considerado que el pago será a los <span class="bold">${quote.paymentTerms || '17 días hábiles'}</span> posteriores a la entrega de la factura, previa entrega de los bienes a satisfacción del Área requirente. Así mismo, el pago será mediante transferencia electrónica.</li>
                <li><span class="bold">Tiempo de entrega:</span> Azal Mechanical Supports S.A. de C.V., realizará la entrega de los bienes requeridos y documentación completa a partir del día natural siguiente a la comunicación del fallo y a más tardar ${quote.deliveryTime || '3 meses'}.</li>
                
                <li><span class="bold">Lugar de la entrega:</span> Azal Mechanical Supports S.A. de C.V., entregará los bienes en las instalaciones que a continuación se indica:<br>${lugaresEntregaHtml}</li>
                
                ${contactoGlobalHtml}
                
                ${tiempoFabricacionHtml}
              
                <li>La responsabilidad de <span class="bold">Azal Mechanical Supports, S.A. de C.V.</span>, en relación con esta garantía consistirá en que este, sin ningún costo para la "${quote.attnDependencia || 'Secretaría de la Defensa Nacional'}", reemplazará los "bienes", en un plazo no mayor a 30 días hábiles conforme a los términos y condiciones para su aplicación.</li>
                
                <li>
                  <span class="bold">Garantía de calidad:</span>
                  ${garantiasHtml ? `<ul class="list-circle">${garantiasHtml}</ul>` : ''}
                </li>

                <li>Azal Mechanical Supports, S.A. de C.V., cumplirá con las condiciones de entrega conforme a el Anexo Administrativo.</li>
                <li>Azal Mechanical Supports, S.A. de C.V., cumple con los atributos, normas, garantías y documentación indicada en el Anexo “C”, así como en el Anexo Administrativo y Anexo Técnico.</li>
                <li>Mi representada(o) cuenta con la capacidad técnica para el suministro de los bienes requeridos.</li>
                <li>El porcentaje de garantía de cumplimiento será del: 10%</li>
                <li>Mi representada se encuentra inscrita en el Sistema Compras MX y Registro Único de Proveedores y de Contratistas (RUPC).</li>
                <li>Años de experiencia en el mercado: 5</li>
                <li>Años de especialidad en el mercado: 5</li>
                <li>Número de contratos afines de los servicios a adquirir o contratar: 3</li>
                <li><span class="bold">Razón social:</span> Azal Mechanical Supports, S.A. de C.V.</li>
                
                <li><span class="bold">Objeto social o actividad que desarrolla:</span> ${objetoSocialHtml}</li>
                
                <li><span class="bold">Domicilio legal:</span> Lago Chapala 27, Los Manantiales,54420, Nicolás Romero, Estado de México.</li>
                <li><span class="bold">Teléfono:</span> 55 4854 0838 y 55 1733 2055</li>
                <li><span class="bold">RFC:</span> AMS161027SY5</li>
                <li><span class="bold">Nombre del representante legal:</span> Ing. Víctor Hernández Hernández.</li>
                <li><span class="bold">Correo electrónico:</span> azal@azalmechanical.com</li>
                <li><span class="bold">Página web:</span> www.azalmechanical.com</li>
                <li><span class="bold">Forma de pago:</span> Transferencia Electrónica.</li>
                <li><span class="bold">Nombre del banco:</span> GRUPO FINANCIERO INBURSA</li>
                <li><span class="bold">Clabe Interbancaria:</span> 036 180 500 524 410 942</li>
                <li><span class="bold">Beneficiario de la cuenta:</span> Azal Mechanical Supports, S.A. de C.V.</li>
              </ul>

              <div style="text-align: justify; margin-top: 15px; margin-bottom: 30px;">
                Con la presente oferta económica manifestamos interés en participar en los bienes requeridos por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.
              </div>

              <div class="signature-section">
                <div class="bold">ATENTAMENTE</div>
                <div style="margin: 10px 0;">
                  ${firmaBase64 ? `<img src="${firmaBase64}" style="max-height: 90px; width: auto;" />` : '<br><br><br>'}
                </div>
                <div class="signature-line"></div>
                <div class="bold">ING. VÍCTOR HERNÁNDEZ HERNÁNDEZ</div>
                <div class="bold">DIRECTOR DE OPERACIONES</div>
              </div>

            </td>
          </tr>
        </tbody>
      </table>

    </body>
    </html>
  `;
}