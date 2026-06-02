import { amountToSpanishText } from "../quotes";

export function generateHgwTemplate(provider: any, quote: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  // Dato azul: Razón social del proveedor
  const nombreEmpresa = provider.companyName || 'HGW PROCESS AND SOLUTIONS, S.A. DE C.V.';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 45px; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000000; line-height: 1.5; background: #ffffff; }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }
        .underline { text-decoration: underline; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; }
        th { background-color: #047857 !important; color: white; font-weight: bold; text-transform: uppercase; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        
        .signature-section { margin-top: 50px; text-align: center; page-break-inside: avoid; }
        .signature-line { width: 250px; height: 1px; background: #000000; margin: 0 auto 5px auto; }
        
        p { margin: 0 0 10px 0; text-align: justify; }
      </style>
    </head>
    <body>

      <div class="bold" style="margin-bottom: 5px;">PROPUESTA ECONÓMICA.</div>
      <div class="bold" style="margin-bottom: 20px;">“${quote.projectTitle || 'PROGRAMA ANUAL DE ADQUISICIONES, ARRENDAMIENTOS Y SERVICOS (P.A.A.A.S.) 2027.'}”</div>

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
            <td colspan="4" style="border: none;"></td>
            <td class="bold text-right">SUBTOTAL:</td>
            <td class="bold text-right">${formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="4" style="border: none;"></td>
            <td class="bold text-right">IVA:</td>
            <td class="bold text-right">${formatCurrency(iva)}</td>
          </tr>
          <tr>
            <td colspan="4" style="border: none;"></td>
            <td class="bold text-right">TOTAL:</td>
            <td class="bold text-right">${formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-bottom: 20px; text-transform: uppercase;" class="bold">
        ${totalEnTexto} M.N. IVA INCLUIDO.
      </div>

      <div class="bold" style="margin-bottom: 10px;">TÉRMINOS COMERCIALES :</div>
      <p>Moneda en que se cotiza: Moneda Nacional.</p>
      <p>Origen de los bienes: ${quote.goodsOrigin || 'Estados Unidos Mexicanos'}.</p>
      <p>Vigencia de la cotización: ${quote.validityDays || 90} días.</p>
      <p>Fecha de entrega: ${nombreEmpresa}, podrá realizar la entrega de los bienes con sus accesorios y documentación completa a partir del día hábil siguiente de la formalización del instrumento contractual y a más tardar ${quote.deliveryTime || '6 (seis) meses'} posteriores a referido evento.</p>
      <p>Lugar de entrega: ${nombreEmpresa}, hará entrega de los bienes contratados en las instalaciones ${quote.deliveryPlace || 'Instalaciones del 4/o. E.M.M.E.S.I., (Campo Militar No. 1-A, Gral. Div. Álvaro Obregón, Cd. Méx.) , ubicados en carretera Avenida del Conscripto 9981 Pta. 3'} .</p>
      <p>${nombreEmpresa}, cumplirá con las especificaciones técnicas, documentación y atributos de los bienes requeridos, indicadas en el Anexo Técnico.</p>
      
      <p class="bold">Condiciones de entrega:</p>
      <p>Una vez formalizado el contrato, ${nombreEmpresa}, deberá establecer comunicación vía telefónica con el área usuaria, a fin de gestionar la entrega y recepción de las partidas correspondientes.</p>
      <p>${nombreEmpresa}, podrá realizar entregas parciales (por partida completa) o en una sola exhibición la totalidad de los bienes, la cual no deberá rebasar la fecha de entrega establecida.</p>
      <p>El personal que designe ${nombreEmpresa}, para realizar el suministro de los bienes deberá identificarse plenamente y sujetarse a las disposiciones de acceso y control de las instalaciones militares que se señalen (ingresar únicamente por las áreas autorizadas, respetar los límites de velocidad, etc.).</p>

      <p class="bold">Garantía de calidad:</p>
      <p>${nombreEmpresa}, entregara una garantía de calidad por escrito, firmada por el representante legal o persona facultado para ello, en papel membretado, de conformidad con las Políticas, Bases y Lineamientos en Materia de Adquisiciones, Arrendamientos y Servicios de la Secretaría de la Defensa Nacional, vigentes, numeral VI.3.3 inciso D, subinciso a; que garantice la calidad de los bienes y contra defectos o fallas en el proceso de fabricación o de las materias primas empleadas, así como contra vicios ocultos, asimismo, garantizar que sus productos se entreguen libres de defectos y en buenas condiciones de funcionalidad y donde se comprometa a cumplir con las obligaciones de reposición en caso de fallas o mal funcionamiento de los bienes durante su recepción.</p>
      <p>La garantía surtirá efectos a partir de que los bienes se hayan recibido a entera satisfacción del área usuaria, mediante el Acta de Aceptación de los bienes.</p>
      <p>Dicha garantía de calidad tendrá vigencia de ${quote.guaranteeMonths || 6} meses especificando que la vigencia será a partir de la fecha establecida en el acta de entrega y recepción definitiva (una vez haya proporcionado los bienes), en papel membretado de la empresa, con la firma del representante legal, lo anterior para responder por la calidad, defectos y vicios ocultos, así como de las fallas que presenten los equipos, únicamente será válida de los componentes, accesorios o insumos empleados en el mismo.</p>
      
      <p>Normas y Certificaciones: ${nombreEmpresa}, cumplirá las normas conforme al Anexo Técnico.</p>
      <p>Mi representada cumple con los atributos, normas, garantías, documentación indicadas en los Anexos, así como en el Anexo Técnico.</p>
      <p>Mi representada cuenta con la capacidad técnica de entregar en tiempo y forma los bienes requeridos.</p>
      <p>La forma de pago será conforme a lo establecido en el Anexo Administrativo.</p>
      
      <p>Razón social: ${nombreEmpresa}<br>
      Objeto Social: ${provider.businessActivity}<br>
      Domicilio legal: ${provider.legalAddress}<br>
      Correo electrónico: ${provider.email}<br>
      Registro Federal de Contribuyentes: ${provider.rfc}<br>
      Origen de la empresa: ${quote.providerNationality || 'Mexicana'}.<br>
      Años de experiencia: ${quote.experienceYears || 3}<br>
      Nombre del Banco de la Clabe: ${provider.bankName || 'Inbursa'}.<br>
      Clave Bancaria Estándar (clabe): ${provider.bankAccount || '000000000000000000'}<br>
      Beneficiario de la Cuenta Bancaria: ${provider.bankBeneficiary || nombreEmpresa}<br>
      Forma de pago: Transferencia Electrónica.<br>
      Nombre del representante legal: ${provider.legalRepresentative}<br>
      Teléfono: ${provider.phone}</p>

      <p>Con la presente oferta económica manifestamos interés en participar en los bienes requeridos por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.</p>

      <div class="signature-section">
        <div class="bold">ATENTAMENTE</div>
        <br><br><br>
        <div class="signature-line"></div>
        <div class="bold">${provider.legalRepresentative ? provider.legalRepresentative.toUpperCase() : 'ING. OCTAVIO SOTO HERNÁNDEZ'}</div>
        <div class="bold">REPRESENTANTE LEGAL</div>
      </div>

    </body>
    </html>
  `;
}