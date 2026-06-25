import { amountToSpanishText } from "../quotes";
import fs from "fs";
import path from "path";

export function generateAzalServiciosTemplate(provider: any, quote: any, items: any[]) {
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

  const parseArrayValue = (value: any) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const deliveryConditions = parseArrayValue(quote.deliveryConditionsJson || quote.deliveryConditions);
  const deliveryPlaceText = (quote.deliveryPlace || quote.deliveryLocation || quote.lugarEntrega || "").toString().trim();

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
    lugaresEntregaHtml = deliveryPlaceText || "Por definir";
    contactoGlobalHtml = `<li><span class="bold">Contacto:</span> ${quote.attnContacto || nombreAtencion}</li>`;
  } else if (Array.isArray(deliveryLocs) && deliveryLocs.length > 0) {
    lugaresEntregaHtml = `
      <br><br>
      <table style="width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 5px; font-size: 9pt;">
        <thead>
          <tr>
            <th style="background-color: #ffffff; color: #000000; width: 12%; text-align: center;">NO.<br>PARTIDA</th>
            <th style="background-color: #ffffff; color: #000000; width: 44%; text-align: center;">DIRECCIÓN</th>
            <th style="background-color: #ffffff; color: #000000; width: 44%; text-align: center;">CONTACTO</th>
          </tr>
        </thead>
        <tbody>
          ${deliveryLocs.map((loc: any) => `
            <tr>
              <td style="text-align: center; vertical-align: middle;">${loc.noPartida || ''}</td>
              <td class="text-left" style="padding: 8px;">${loc.address || ''}</td>
              <td class="text-left" style="padding: 8px;">${loc.contact || ''}</td>
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
        body { margin: 0; padding: 10px 45px 45px 45px; font-family: "Aptos Narrow", Arial, sans-serif; font-size: 11pt; color: #000000; line-height: 1.5; background: #ffffff; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; font-size: 10pt; }
        th, td { border: 1px solid #5A69D4; padding: 6px 4px; text-align: center; vertical-align: middle; }
        th { background-color: #5A69D4; color: white; font-weight: bold; text-transform: uppercase; }
        
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

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
        <div style="line-height: 1.3; width: 60%; text-align: left;">
          <span class="bold">ATENCIÓN:</span><br>
          <!-- 🚀 CORRECCIÓN DEL ENCABEZADO: Aseguramos que el nombre esté debajo del grado sin romper la estructura -->
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

      <div class="bold text-center" style="font-size: 11pt; margin-bottom: 10px; text-decoration: underline;">PROPUESTA ECONÓMICA</div>
      <div class="bold text-center" style="margin-bottom: 20px;">
        ${quote.attnNombreProcedimiento || quote.requisitionNumber || 'S/N'}
      </div>

     <table style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr style="background-color: #5C6BC0; color: white;">
      <th style="width: 8%; padding: 8px;">No.</th>
      <th style="width: 35%; padding: 8px;">DESCRIPCIÓN</th>
      <th style="width: 10%; padding: 8px;">CANT.</th>
      <th style="width: 10%; padding: 8px;">U.M.</th>
      <th style="width: 17%; padding: 8px;">COSTO UNITARIO</th>
      <th style="width: 20%; padding: 8px;">COSTO TOTAL</th>
    </tr>
  </thead>
  <tbody>
    ${items.map((item, index) => `
      <tr>
        <td style="border: 1px solid #5C6BC0; padding: 8px; text-align: center;">${item.noPartida || index + 1}</td>
        <td style="border: 1px solid #5C6BC0; padding: 8px; text-align: left;">${item.description}</td>
        <td style="border: 1px solid #5C6BC0; padding: 8px; text-align: center;">${item.quantity}</td>
        <td style="border: 1px solid #5C6BC0; padding: 8px; text-align: center;">${item.unitMeasure || item.unit}</td>
        <td style="border: 1px solid #5C6BC0; padding: 8px; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="border: 1px solid #5C6BC0; padding: 8px; text-align: right;">${formatCurrency(item.quantity * item.unitPrice)}</td>
      </tr>
    `).join('')}

    <tr>
      <td colspan="4" style="border: none;"></td>
      <td style="border: 1px solid #5C6BC0; padding: 8px; font-weight: bold;">SUBTOTAL</td>
      <td style="border: 1px solid #5C6BC0; padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(subtotal)}</td>
    </tr>
    <tr>
      <td colspan="4" style="border: none;"></td>
      <td style="border: 1px solid #5C6BC0; padding: 8px; font-weight: bold;">IVA</td>
      <td style="border: 1px solid #5C6BC0; padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(iva)}</td>
    </tr>
    <tr>
      <td colspan="4" style="border: none;"></td>
      <td style="border: 1px solid #5C6BC0; padding: 8px; font-weight: bold;">TOTAL</td>
      <td style="border: 1px solid #5C6BC0; padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(total)}</td>
    </tr>
  </tbody>
</table>

      <div class="bold text-center" style="margin-bottom: 25px; text-transform: uppercase;">
        ${totalEnTexto} IVA INCLUIDO.
      </div>
      <div class="bold" style="text-decoration: underline; margin-bottom: 5px;">CONDICIONES COMERCIALES:</div>
      <ul style="list-style-type: disc; padding-left: 20px;">
  <li style="margin-bottom: 5px;">Precios en Moneda Nacional.</li>
  <li style="margin-bottom: 5px;">Vigencia de la cotización: <span style="color: #63A6E1; font-weight: bold;">${quote.validityDays || 90} días</span>.</li>
  <li style="margin-bottom: 5px;">Origen de los bienes: <span style="color: #63A6E1; font-weight: bold;">${quote.goodsOrigin || 'Nacional'}</span>.</li>
  <li style="margin-bottom: 5px;">Nacionalidad del proveedor: <span style="color: #63A6E1; font-weight: bold;">mexicana</span></li>
  <li style="margin-bottom: 5px;">Condiciones de pago: Mi representada tiene considerado que el pago será conforme a lo establecido en el Anexo Administrativo.</li>
  <li style="margin-bottom: 5px;">Tiempo de entrega: La entrega de los servicios de mantenimiento y documentación completa a partir del día hábil siguiente de la formalización del instrumento contractual.</li>
</ul>
          
        
  <ul style="list-style-type: disc; padding-left: 20px; margin: 0 0 15px 0;">
    <li style="margin-bottom: 8px; display: list-item;">
      <span style="font-weight: normal;">Condiciones de entrega:</span>
      <ul style="list-style-type: circle; margin: 6px 0 0 18px; padding-left: 18px;">
        ${deliveryConditions.map((c: any) => {
          const text = typeof c === 'string' ? c : (c?.text || c?.value || "");
          const isAzal = String(text).trim().startsWith("Azal Mechanical");
          
          if (isAzal) {
            const restOfText = String(text).substring("Azal Mechanical".length);
            return `<li style="margin-bottom: 5px;"><span style="color: #63A6E1; font-weight: bold;">Azal Mechanical</span>${restOfText}</li>`;
          }
          
          return `<li style="margin-bottom: 5px;">${text}</li>`;
        }).join('')}
      </ul>
    </li>

    <li style="margin-bottom: 8px; display: list-item;">
      <span style="font-weight: normal;">Lugar de entrega:</span>
      <ul style="list-style-type: circle; margin: 6px 0 0 18px; padding-left: 18px;">
        <li style="margin-bottom: 5px;">${deliveryPlaceText}</li>
      </ul>
    </li>
  </ul>




${tiempoFabricacionHtml}

<li style="margin-bottom: 15px; font-weight: normal;">
  <span style="font-weight: normal;">Garantía de calidad. </span>
  <span style="color: #63A6E1; font-weight: bold;">Azal Mechanical Support</span>
  <span style="font-weight: normal;">, presentará una carta de garantía de calidad, bajo los siguientes términos:</span>
  ${garantiasHtml ? `<ul class="list-circle" style="list-style-type: circle; padding-left: 20px; font-weight: normal;">${garantiasHtml}</ul>` : ''}
</li>

 <ul style="list-style-type: circle; padding-left: 20px;">
  <!-- Garantía de calidad principal -->
  <li style="margin-bottom: 15px;">
    <span style="color: #63A6E1; font-weight: bold;">Azal Mechanical Support.</span> 
    entregará una garantía de calidad por escrito que ampare los trabajos realizados y/o las partes y componentes reemplazados con vigencia de 6 (seis) meses a partir de la entrega y recepción definitiva por partida completa del último servicio y a entera satisfacción de esta Secretaría. Lo anterior para responder por la calidad, defectos y vicios ocultos, así como de las fallas que presenten los equipos.
  </li>

  <!-- Subviñeta de recepción -->
  <li style="margin-bottom: 15px;">
    La garantía surtirá efectos a partir de que el equipo se haya recibido a entera satisfacción del área usuaria, mediante la constancia de recepción de los servicios.
  </li>

  <!-- Solución inmediata -->
  <li style="margin-bottom: 15px;">
    <span style="color: #63A6E1; font-weight: bold;">Azal Mechanical.</span> 
    deberá otorgar solución inmediata a la problemática con respecto a la calidad del servicio de mantenimiento, debiendo emplear refacciones nuevas y originales para evitar problemas de calidad, defectos y vicios ocultos y corresponder al equipo que se le dará el servicio.
  </li>

  <!-- Soporte técnico -->
  <li style="margin-bottom: 15px;">
    <span style="color: #63A6E1; font-weight: bold;">Azal Mechanical.</span> 
    deberá proporcionar un número telefónico con número de extensión, así como un correo electrónico en el cual se puedan realizar los reportes de mantenimiento por fallas y solicitud de apoyo técnico para la corrección de fallas en los equipos industriales a los cuales se les haya realizado el mantenimiento.
  </li>

  <!-- Notificación de fallas -->
  <li style="margin-bottom: 15px;">
    La notificación a 
    <span style="color: #63A6E1; font-weight: bold;">Azal Mechanical</span>, 
    de la falla, avería o mal funcionamiento de los equipos, atribuible al servicio de mantenimiento que proporcionó, se realizará a través de una carta dirigida al representante legal y enviada por correo electrónico a la dirección electrónica que el proveedor dispondrá, teniendo un plazo de 15 días naturales para la aplicación de la garantía.
  </li>
</ul>
  
    <li style="margin-bottom: 15px;">
  <span style="color: #63A6E1; font-weight: bold;">Azal Mechanical</span> 
  cumplirá con las condiciones de entrega.
</li>
<li> <span style="color: #63A6E1; font-weight: bold;">Azal Mechanical.</span> 
  Cumplirá con las características técnicas y normas requeridas en el Anexo Técnico.
</li>
    </li>
     <li> El porcentaje de garantía de cumplimiento será del:<span style="color: #63A6E1; font-weight: bold;">${quote.complianceWarranty}%</span>  </li> 
    <li> Mi representada se encuentra inscrita en el Sistema ComprasMX y Registro Único de Proveedores y de Contratistas (RUPC).</li>
    <li>Años de experiencia en el mercado: <span style="color: #63A6E1; font-weight: bold;">${quote.experienceYears}</span></li>
    <li>Años de especialidad en el mercado: <span style="color: #63A6E1; font-weight: bold;">${quote.specialtyYears}</span></li>
    <li>Razón social: <span style="color: #63A6E1; font-weight: bold;">Azal Mechanical Supports, S.A. de C.V.</span></li>

    <ul style="list-style-type: disc; padding-left: 20px;">
  <!-- Título con su propia viñeta -->
  <li style="font-weight: bold; margin-bottom: 5px;">Objeto social:</li>
  
  <!-- Opciones dinámicas del formulario, cada una con su viñeta -->
  ${(quote.selectedSocialObjects || []).map((o: string) => `
    <li style="margin-bottom: 8px; font-weight: normal;">${o}</li>
  `).join('')}
</ul>

<!-- DATOS DE CONTACTO Y BANCARIOS -->
<!-- Aquí se abre una nueva lista independiente con viñetas al mismo nivel -->
<ul style="list-style-type: disc; padding-left: 20px; margin-top: 0;">
  <li><span>Domicilio legal:</span> <span style="color: #63A6E1; font-weight: bold;">Lago Chapala 27, Los Manantiales, 54420, Nicolás Romero, Estado de México.</span></li>
  <li><span>Teléfono:</span> <span style="color: #63A6E1; font-weight: bold;">55 4854 0838 y 55 1733 2055</span></li>
  <li><span>RFC:</span> <span style="color: #63A6E1; font-weight: bold;">AMS161027SY5</span></li>
  <li><span>Nombre del representante legal:</span> <span style="color: #63A6E1; font-weight: bold;">Ing. Víctor Hernández Hernández.</span></li>
  <li><span>Correo electrónico:</span> <span style="color: #63A6E1; font-weight: bold;">azal@azalmechanical.com</span></li>
  <li><span>Página web:</span> <span style="color: #63A6E1; font-weight: bold;">www.azalmechanical.com</span></li>
  <li><span>Forma de pago:</span> <span style="color: #63A6E1; font-weight: bold;">Transferencia Electrónica.</span></li>
  <li><span>Nombre del banco:</span> <span style="color: #63A6E1; font-weight: bold;">GRUPO FINANCIERO INBURSA</span></li>
  <li><span>Clabe Interbancaria:</span> <span style="color: #63A6E1; font-weight: bold;">036 180 500 524 410 942</span></li>
  <li><span>Beneficiario de la cuenta:</span> <span style="color: #63A6E1; font-weight: bold;">Azal Mechanical Supports, S.A. de C.V.</span></li>
</ul>
<p>
  <span style="color: #63A6E1; font-weight: bold;">Azal Mechanical ,</span> 
  cumplirá con las siguientes 
  <span style="color: #63A6E1; font-weight: bold;">características técnicas.</span>
</p>

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

    </body>
    </html>
  `;
}