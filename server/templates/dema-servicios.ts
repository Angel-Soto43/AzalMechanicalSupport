import { amountToSpanishText } from "../quotes";
import fs from "fs";
import path from "path";

export function generateDemaServiciosTemplate(quote: any, items: any[]) {
  const safeParse = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    try { return JSON.parse(data || "[]"); } catch { return []; }
  };

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  const deliveryLocations  = safeParse(quote.deliveryLocations  || quote.deliveryLocationsJson);
  const deliveryConditions = safeParse(quote.deliveryConditions || quote.deliveryConditionsJson);
  const qualityGuarantees  = safeParse(quote.qualityGuarantees  || quote.qualityGuaranteesJson);
  const selectedSocialObjs = safeParse(quote.selectedSocialObjects || quote.selectedSocialObjectsJson);
  const requiredDocuments  = safeParse(quote.requiredDocuments  || quote.requiredDocumentsJson);
  const serviceNormsTable  = safeParse(quote.serviceNormsTable  || quote.serviceNormsTableJson);

  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva      = subtotal * 0.16;
  const total    = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  let firmaBase64 = "";
  try {
    const firmaPath = path.join(process.cwd(), 'server', 'assets', 'firma-DEMA.png');
    if (fs.existsSync(firmaPath)) {
      firmaBase64 = `data:image/png;base64,${fs.readFileSync(firmaPath).toString('base64')}`;
    }
  } catch { /* firma no disponible */ }

  // ── Sección derecha del encabezado ──────────────────────────────────────
  const hasDate = quote.attnLugar || quote.attnDia || quote.attnMes || quote.attnAnio;
  const fechaHtml = hasDate
    ? `<div style="width:45%;text-align:right;padding-top:30px;">${quote.attnLugar || ''} a ${quote.attnDia || ''} de ${quote.attnMes || ''} de ${quote.attnAnio || ''}.</div>`
    : `<div style="width:45%;"></div>`;

  // ── Sección izquierda del encabezado ────────────────────────────────────
  const hasAttn = quote.attnGrado || quote.contactPerson || quote.attnCargo;
  const attnBlock = hasAttn ? `
    <div style="font-size:11pt;font-weight:bold;margin-top:4px;">Atención:</div>
    ${quote.attnGrado     ? `<div>${quote.attnGrado}</div>`     : ''}
    ${quote.contactPerson ? `<div>${quote.contactPerson}</div>` : ''}
    ${quote.attnCargo     ? `<div>${quote.attnCargo}</div>`     : ''}
  ` : '';

  const projectBlock = quote.projectTitle ? `
    <div style="font-size:11pt;font-weight:bold;margin-top:4px;">Proyecto:</div>
    <div>${quote.projectTitle}</div>
  ` : '';

  // ── Punto II: Lugar de entrega ───────────────────────────────────────────
  let deliveryBodyHtml = '';
  const isSingle = quote.deliverySingle !== false && quote.deliverySingle !== 'false';
  if (isSingle) {
    const loc      = quote.deliveryLocation || '';
    const contacto = quote.attnContacto     || '';
    if (loc || contacto) {
      deliveryBodyHtml = `<div style="margin-top:4px;">${loc}${contacto ? `<br>Contacto: ${contacto}` : ''}</div>`;
    }
  } else if (deliveryLocations.length > 0) {
    const hasContact = deliveryLocations.some((l: any) => l.contact && l.contact.trim());
    deliveryBodyHtml = `
      <table style="margin-top:8px;">
        <thead>
          <tr>
            <th>Partida</th>
            <th>Dirección</th>
            ${hasContact ? '<th>Contacto</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${deliveryLocations.map((loc: any, i: number) => `
            <tr${i % 2 === 1 ? ' class="alt-row"' : ''}>
              <td>${loc.noPartida || ''}</td>
              <td class="txt-left">${loc.address || ''}</td>
              ${hasContact ? `<td class="txt-left">${loc.contact || ''}</td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // ── Punto VIII: Condiciones de entrega (condicional) ────────────────────
  const validConditions = deliveryConditions.filter((c: string) => c && c.trim());
  const deliveryConditionsPoint = validConditions.length > 0 ? `
    <li style="margin-bottom:10px;text-align:justify;">Bajo protesta de decir verdad, en caso de resultar adjudicada con los servicios ofertados, DEMA Ingeniería y Soluciones Industriales, S.A. de C.V., se ajustará a las siguientes condiciones de entrega:
      <ol class="list-alpha-upper">
        ${validConditions.map((c: string) => `<li>${c}</li>`).join('')}
      </ol>
    </li>
  ` : '';

  // ── Punto IX: Garantía de calidad (condicional) ─────────────────────────
  const validGuarantees = qualityGuarantees.filter((g: string) => g && g.trim());
  const qualityGuaranteesPoint = validGuarantees.length > 0 ? `
    <li style="margin-bottom:10px;text-align:justify;">Garantía de calidad:
      <ol class="list-alpha-upper">
        ${validGuarantees.map((g: string) => `<li>${g}</li>`).join('')}
      </ol>
    </li>
  ` : '';

  // ── Punto X: Documentación requerida + tabla de normas (condicional) ────
  const validReqDocs  = requiredDocuments.filter((d: string) => d && d.trim());
  const hasNormsTable = serviceNormsTable.length > 0;

  let normsTableHtml = '';
  if (hasNormsTable) {
    normsTableHtml = `
      <table style="margin-top:10px;">
        <thead>
          <tr>
            <th>PTDA.</th>
            <th>DESCRIPCIÓN</th>
            <th>CANT.</th>
            <th>U.M.</th>
            <th>NORMA</th>
          </tr>
        </thead>
        <tbody>
          ${serviceNormsTable.map((row: any, i: number) => `
            <tr${i % 2 === 1 ? ' class="alt-row"' : ''}>
              <td>${i + 1}</td>
              <td class="txt-left">${row.description || ''}</td>
              <td>${row.quantity || ''}</td>
              <td>${row.unitMeasure || ''}</td>
              <td class="txt-left">${row.norm || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  let requiredDocumentsPoint = '';
  if (validReqDocs.length > 0 || hasNormsTable) {
    const docsList = validReqDocs.length > 0 ? `
      como a continuación se enlista:
      <ol class="list-alpha-upper">
        ${validReqDocs.map((d: string) => `<li>${d}</li>`).join('')}
      </ol>
    ` : '';
    requiredDocumentsPoint = `
      <li style="margin-bottom:10px;text-align:justify;">Documentación requerida: Bajo protesta de decir verdad, en caso de resultar adjudicada con los servicios de mantenimiento ofertados, DEMA Ingeniería y Soluciones Industriales, S.A. de C.V., entregará a ${quote.destinationCompany || ''}, la documentación que ampare que los servicios de mantenimiento realizados cumplen con las especificaciones, características técnicas, de acuerdo con las especificaciones requeridas conforme el Anexo Técnico, en forma escrita en idioma español${docsList ? `, ${docsList}` : '.'}
        ${normsTableHtml}
      </li>
    `;
  }

  // ── Punto XII: Objeto social ─────────────────────────────────────────────
  const socialObjectsHtml = selectedSocialObjs.length > 0
    ? selectedSocialObjs.map((o: string) => `<p style="margin:0 0 4px 0;">${o}</p>`).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 0 45px;
      font-family: 'Ebrima', Arial, sans-serif;
      font-size: 10pt;
      color: #000;
      line-height: 1.4;
    }
    .bold    { font-weight: bold; }
    .titulo  { font-size: 11pt; font-weight: bold; }
    .underline { text-decoration: underline; }
    .txt-center { text-align: center; }
    .txt-left   { text-align: left; }
    .txt-right  { text-align: right; }
    .txt-justify { text-align: justify; }

    table { width: 100%; border-collapse: collapse; margin: 8px 0 14px 0; font-size: 10pt; }
    th {
      background-color: #2E7D32;
      color: #ffffff;
      font-weight: bold;
      border: 1px solid #1B5E20;
      padding: 5px 4px;
      text-align: center;
      font-size: 10pt;
    }
    td {
      border: 1px solid #1B5E20;
      padding: 5px 4px;
      text-align: center;
      vertical-align: middle;
      font-size: 10pt;
    }
    tr.alt-row td { background-color: #E8F5E9; }

    /* Tabla subtotales: filas sin borde lateral */
    .no-border { border: none !important; background: transparent !important; }

    .list-roman      { list-style-type: upper-roman; padding-left: 30px; margin: 8px 0 12px 0; }
    .list-roman > li { margin-bottom: 10px; text-align: justify; }
    .list-alpha-upper      { list-style-type: upper-alpha; padding-left: 28px; margin: 6px 0 4px 0; }
    .list-alpha-upper > li { margin-bottom: 6px; text-align: justify; }
    .list-alpha-lower      { list-style-type: lower-alpha; padding-left: 28px; margin: 6px 0 4px 0; }
    .list-alpha-lower > li { margin-bottom: 4px; text-align: justify; }

    p { margin: 0 0 8px 0; text-align: justify; }

    .firma-section { margin-top: 50px; text-align: center; page-break-inside: avoid; }
    .firma-line    { width: 320px; height: 1px; background: #000; margin: 0 auto 5px auto; }
  </style>
</head>
<body>

  <!-- ════════════════ ENCABEZADO ════════════════ -->
  <div style="display:flex;justify-content:space-between;margin-bottom:22px;">
    <div style="width:55%;text-align:left;line-height:1.5;">
      ${quote.destinationCompany ? `<div>${quote.destinationCompany}</div>` : ''}
      ${quote.attnArea           ? `<div>${quote.attnArea}</div>`           : ''}
      ${quote.attnUbicacion      ? `<div>${quote.attnUbicacion}</div>`      : ''}
      ${quote.attnDireccion      ? `<div>${quote.attnDireccion}</div>`      : ''}
      ${attnBlock}
      ${projectBlock}
    </div>
    ${fechaHtml}
  </div>

  <!-- ════════════════ PROPOSICIÓN ECONÓMICA ════════════════ -->
  <div class="txt-center titulo underline" style="margin-bottom:8px;">PROPOSICIÓN ECONÓMICA</div>
  <div class="txt-center bold" style="margin-bottom:4px;">DEMA INGENIERÍA Y SOLUCIONES INDUSTRIALES S.A. DE C.V.</div>
  <div class="txt-center bold" style="margin-bottom:4px;">CALZADA DE LOS JINETES #7, PISO 2, INT. 29, LAS ARBOLEDAS, C.P. 52950, ATIZAPÁN DE ZARAGOZA, ESTADO DE MÉXICO.</div>
  <div class="txt-center bold" style="margin-bottom:4px;">TELÉFONO: 5539731421</div>
  <div class="txt-center bold" style="margin-bottom:16px;">R.F.C. DIS2302154R4</div>

  <!-- ════════════════ TABLA DE PARTIDAS ════════════════ -->
  <table>
    <thead>
      <tr>
        <th style="width:7%;">PTDA.</th>
        <th>DESCRIPCIÓN</th>
        <th style="width:8%;">CANT.</th>
        <th style="width:8%;">U.M.</th>
        <th style="width:13%;">COSTO</th>
        <th style="width:14%;">IMPORTE</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item, i) => `
        <tr${i % 2 === 1 ? ' class="alt-row"' : ''}>
          <td>${item.noPartida || i + 1}</td>
          <td class="txt-left">${item.description || ''}</td>
          <td>${item.quantity}</td>
          <td>${item.unitMeasure || item.unit || ''}</td>
          <td class="txt-right">${formatCurrency(Number(item.unitPrice))}</td>
          <td class="txt-right">${formatCurrency(Number(item.quantity) * Number(item.unitPrice))}</td>
        </tr>
      `).join('')}
      <tr>
        <td colspan="4" class="no-border"></td>
        <td class="bold txt-right" style="border:1px solid #1B5E20;">SUBTOTAL</td>
        <td class="bold txt-right" style="border:1px solid #1B5E20;">${formatCurrency(subtotal)}</td>
      </tr>
      <tr>
        <td colspan="4" class="no-border"></td>
        <td class="bold txt-right" style="border:1px solid #1B5E20;">IVA</td>
        <td class="bold txt-right" style="border:1px solid #1B5E20;">${formatCurrency(iva)}</td>
      </tr>
      <tr>
        <td colspan="4" class="no-border"></td>
        <td class="bold txt-right" style="border:1px solid #1B5E20;">TOTAL</td>
        <td class="bold txt-right" style="border:1px solid #1B5E20;">${formatCurrency(total)}</td>
      </tr>
    </tbody>
  </table>

  <!-- TOTAL EN PALABRAS -->
  <div class="txt-center bold" style="margin-bottom:20px;text-transform:uppercase;">
    ${totalEnTexto} M.N. I.V.A. INCLUIDO
  </div>

  <!-- ════════════════ TÉRMINOS COMERCIALES ════════════════ -->
  <div class="titulo underline" style="margin-bottom:8px;">TÉRMINOS COMERCIALES:</div>

  <ol class="list-roman">

    <!-- I. Tiempo de entrega -->
    <li>Tiempo de entrega: DEMA Ingeniería y Soluciones Industriales, S.A. de C.V., podrá realizar la entrega de los servicios de mantenimiento de las partidas del presente procedimiento de contratación conforme a lo siguiente: ${quote.deliveryTime || ''}.
    </li>

    <!-- II. Lugar de entrega -->
    <li>Lugar de entrega: DEMA Ingeniería y Soluciones Industriales, S.A. de C.V. hará entrega de los servicios contratados en las instalaciones que a continuación se indican:
      ${deliveryBodyHtml}
    </li>

    <!-- III. Condiciones de pago -->
    <li>Condiciones de pago: ${quote.paymentTerms || ''}.
    </li>

    <!-- IV. Precios en Moneda Nacional -->
    <li>Precios en Moneda Nacional.
    </li>

    <!-- V. Vigencia -->
    <li>Vigencia de la cotización y condiciones de precio: precios fijos y definitivos hasta la entrega total de los servicios y conclusión del contrato, por lo que no están sujetos a ajustes de costo por variaciones en el mercado nacional o internacional. La vigencia de la presente cotización es de ${quote.validityDays || ''} días.
    </li>

    <!-- VI. Origen -->
    <li>Origen de los servicios, refacciones e insumos que serán empleados para proporcionar los servicios de mantenimiento ofertados: ${quote.goodsOrigin || ''}.
    </li>

    <!-- VII. Manifestación de origen (fijo) -->
    <li>DEMA Ingeniería y Soluciones Industriales, S.A. de C.V., manifiesta bajo protesta de decir verdad, que estará en condiciones de entregar cualquier documento que sea requerido por el "ÁREA CONTRATANTE" para efectos de verificar el país de origen de las refacciones que serán empleados para proporcionar los servicios de mantenimiento ofertados.
    </li>

    <!-- VIII. Condiciones de entrega (condicional) -->
    ${deliveryConditionsPoint}

    <!-- IX. Garantía de calidad (condicional) -->
    ${qualityGuaranteesPoint}

    <!-- X. Documentación requerida + normas (condicional) -->
    ${requiredDocumentsPoint}

    <!-- XI. Capacidad técnica (fijo, SUMINISTRO DE LOS SERVICIOS en negritas) -->
    <li>Mi representada cuenta con la capacidad técnica para el <strong>suministro de los servicios</strong> requeridos.
    </li>

    <!-- XII. Razón social -->
    <li>Razón social: DEMA Ingeniería y Soluciones Industriales, S.A. de C.V.
      <ol class="list-alpha-lower">
        <li>Objeto Social: ${socialObjectsHtml}
        </li>
        <li>Domicilio legal: Calzada de los Jinetes #7, Piso 2, Int. 29, Las Arboledas, C.P. 52950, Atizapán de Zaragoza, Estado de México.
        </li>
        <li>Correo electrónico: <a href="mailto:dema@demaisi.com.mx" style="color:#5A69D4;text-decoration:underline;">dema@demaisi.com.mx</a>
        </li>
        <li>Registro Federal de Contribuyentes: DIS2302154R4.
        </li>
      </ol>
    </li>

  </ol>

  <!-- ════════════════ CIERRE ════════════════ -->
  <p class="txt-justify" style="margin-top:14px;">Con la presente oferta económica manifestamos interés en participar en la adquisición de los servicios por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.</p>

  <!-- ════════════════ FIRMA ════════════════ -->
  <div class="firma-section">
    <div class="titulo bold">ATENTAMENTE.</div>
    <div style="min-height:80px;display:flex;justify-content:center;align-items:flex-end;margin:8px 0 5px 0;">
      ${firmaBase64 ? `<img src="${firmaBase64}" style="max-height:90px;width:auto;" />` : '<br><br>'}
    </div>
    <div class="firma-line"></div>
    <div class="bold" style="margin-top:4px;">ING. DEISY HERNÁNDEZ HERNÁNDEZ</div>
    <div class="bold">REPRESENTANTE LEGAL</div>
  </div>

</body>
</html>`;
}
