import { amountToSpanishText } from "../quotes";

export function generateHgwTemplate(provider: any, quote: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 45px; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000000; line-height: 1.5; }
        .bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; }
        th { background-color: #047857 !important; color: white; font-weight: bold; text-transform: uppercase; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .signature-section { margin-top: 50px; text-align: center; }
        .signature-line { width: 250px; height: 1px; background: #000000; margin: 0 auto 5px auto; }
      </style>
    </head>
    <body>
      <div class="bold" style="margin-bottom: 5px;">PROPUESTA ECONÓMICA.</div>
      <div class="bold" style="margin-bottom: 20px;">“${quote.projectTitle || 'PROGRAMA ANUAL DE ADQUISICIONES, ARRENDAMIENTOS Y SERVICOS (P.A.A.A.S.) 2027.'}”</div>

      <table>
        <thead>
          <tr><th>PTDA.</th><th>DESCRIPCIÓN</th><th>CANT.</th><th>U.M.</th><th>COSTO UNITARIO</th><th>IMPORTE</th></tr>
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
          <tr><td colspan="4" style="border: none;"></td><td class="bold text-right">SUBTOTAL:</td><td class="bold text-right">${formatCurrency(subtotal)}</td></tr>
          <tr><td colspan="4" style="border: none;"></td><td class="bold text-right">IVA:</td><td class="bold text-right">${formatCurrency(iva)}</td></tr>
          <tr><td colspan="4" style="border: none;"></td><td class="bold text-right">TOTAL:</td><td class="bold text-right">${formatCurrency(total)}</td></tr>
        </tbody>
      </table>

      <div style="margin-bottom: 20px; text-transform: uppercase;" class="bold">${totalEnTexto} M.N. IVA INCLUIDO.</div>

      <div class="bold" style="margin-bottom: 10px;">TÉRMINOS COMERCIALES :</div>

      <p>I. Moneda en que se cotiza: Moneda Nacional.</p>
      <p>II. Origen de los bienes: Estados Unidos Mexicanos.</p>
      <p>III. Vigencia de la cotización: 90 días.</p>
      <p>IV. Fecha de entrega: HGW Process and Solutions S.A. de C.V., podrá realizar la entrega de los bienes con sus accesorios y documentación completa a partir del día hábil siguiente de la formalización del instrumento contractual y a más tardar 6 (seis) meses posteriores al fallo posteriores a referido evento.</p>
      <p>V. Lugar de entrega: HGW Process and Solutions S.A. de C.V., hará entrega de los bienes contratados en las instalaciones Instalaciones del 4/o. E.M.M.E.S.I., (Campo Militar No. 1-A, Gral. Div. Álvaro Obregón, Cd. Méx.), ubicados en carretera Avenida del Conscripto 9981 Pta. 3.</p>
      <p>VI. HGW Process and Solutions S.A. de C.V., cumplirá con las especificaciones técnicas, documentación y atributos de los bienes requeridos, indicadas en el Anexo Técnico.</p>
      <p>VII. Condiciones de entrega:</p>
      <p style="margin-left: 40px;">A. Una vez formalizado el contrato, HGW Process and Solutions S.A. de C.V., deberá establecer comunicación vía telefónica con el área usuaria, a fin de gestionar la entrega y recepción de las partidas correspondientes.</p>
      <p style="margin-left: 40px;">B. HGW Process and Solutions S.A. de C.V., podrá realizar entregas parciales (por partida completa) o en una sola exhibición la totalidad de los bienes, la cual no deberá rebasar la fecha de entrega establecida.</p>
      <p style="margin-left: 40px;">C. El personal que designe HGW Process and Solutions S.A. de C.V., para realizar el suministro de los bienes deberá identificarse plenamente y sujetarse a las disposiciones de acceso y control de las instalaciones militares que se señalen.</p>

      <p>VIII. Garantía de calidad:</p>
      <p style="margin-left: 40px;">A.	HGW Process and Solutions S.A. de C.V., entregara una garantía de calidad por escrito, firmada por el representante legal o persona facultado para ello, en papel membretado, de conformidad con las Políticas, Bases y Lineamientos en Materia de Adquisiciones, Arrendamientos y Servicios de la Secretaría de la Defensa Nacional, vigentes, numeral VI.3.3 inciso D, subinciso a; que garantice la calidad de los bienes  y contra defectos o fallas en el proceso de fabricación o de las materias primas empleadas, así como contra vicios ocultos, asimismo, garantizar que sus productos se entreguen libres de defectos y en buenas condiciones de funcionalidad y donde se comprometa a cumplir con las obligaciones de reposición en caso de fallas o mal funcionamiento de los bienes  durante su recepción.</p>
      <p style="margin-left: 40px;">B. La garantía surtirá efectos a partir de que los bienes se hayan recibido a entera satisfacción del área usuaria, mediante el Acta de Aceptación de los bienes.</p>
      <p style="margin-left: 40px;">C.  Dicha garantía de calidad tendrá vigencia de 6 (seis) meses especificando que la vigencia será a partir de la fecha establecida en el acta de entrega y recepción definitiva, en papel membretado de la empresa, con la firma del representante legal.</p>

      <p>IX. Normas y Certificaciones: HGW Process and Solutions S.A. de C.V., cumplirá las normas conforme al Anexo Técnico.</p>
      <p>X. Mi representada cumple con los atributos, normas, garantías, documentación indicadas en los Anexos, así como en el Anexo Técnico.</p>
      <p>XI. Mi representada cuenta con la capacidad técnica de entregar en tiempo y forma los bienes requeridos.</p>
      <p>XII. La forma de pago será conforme a lo establecido en el Anexo Administrativo.
      <p>XIII. Razón social: HGW PROCESS AND SOLUTIONS, S.A. DE C.V.</p>
      <p style="margin-left: 40px;">a) Objeto Social: Proporcionar el servicio de diseño, instalación, mantenimiento, soporte técnico, suministro, venta, compra e importación de equipo para distribución y transmisión de energía eléctrica, equipo industrial.</p>
      <p style="margin-left: 40px;">b) Domicilio legal: Av. Jorge Jiménez Cantú No. 1 int. 124, Valle Escondido, Atizapán de Zaragoza, Estado de México, Código Postal 52937.</p>
      <p style="margin-left: 40px;">c) Correo electrónico: hgw@hgwprocessolutions.com</p>
      <p style="margin-left: 40px;">d) Registro Federal de Contribuyentes: HPS200624FG1</p>
      <p style="margin-left: 40px;">e) Origen de la empresa: Mexicana.</p>
      <p style="margin-left: 40px;">f) Años de experiencia: 3</p>
      <p style="margin-left: 40px;">g) Nombre del Banco: Inbursa.</p>
      <p style="margin-left: 40px;">h) Clave Bancaria Estándar (clabe): 036180500583815041</p>
      <p style="margin-left: 40px;">i) Beneficiario: HGW PROCESS AND SOLUTIONS, S.A. DE C.V.</p>
      <p style="margin-left: 40px;">j) Forma de pago: Transferencia Electrónica.</p>
      <p style="margin-left: 40px;">k) Nombre del representante legal: Ing. Octavio Soto Hernández.</p>
      <p style="margin-left: 40px;">l) Teléfono: 55 45566367</p>

      <div class="signature-section">
        <div class="bold">ATENTAMENTE</div><br><br><br>
        <div class="signature-line"></div>
        <div class="bold">${provider.legalRepresentative ? provider.legalRepresentative.toUpperCase() : 'ING. OCTAVIO SOTO HERNÁNDEZ'}</div>
        <div class="bold">REPRESENTANTE LEGAL</div>
      </div>
    </body>
    </html>
  `;
}