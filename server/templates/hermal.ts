import { amountToSpanishText } from "../quotes";

export function generateHermalTemplate(provider: any, quote: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  // Dato azul: Razón social del proveedor
  const nombreEmpresa = provider.companyName || 'HERMAL Industrial, S.A. de C.V.';

  // Dar formato a la fecha para el encabezado (ej. 19 de febrero del 2026)
  const dateParts = (quote.quoteDate || "").split('-');
  let fechaFormateada = "19 de febrero del 2026";
  if (dateParts.length === 3) {
    const quoteDateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
    fechaFormateada = quoteDateObj.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  }

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
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; }
        /* Se usa un verde oscuro inspirado en la imagen de referencia para la tabla */
        th { background-color: #047857 !important; color: white; font-weight: bold; text-transform: uppercase; }
        .text-left { text-align: left; }
        
        .signature-section { margin-top: 50px; text-align: center; page-break-inside: avoid; }
        .signature-line { width: 250px; height: 1px; background: #000000; margin: 0 auto 5px auto; }
        
        p { margin: 0 0 10px 0; text-align: justify; }
      </style>
    </head>
    <body>

      <div style="margin-bottom: 15px;">
        ${quote.city || 'Tlalnepantla de Baz'}, a ${fechaFormateada}.
      </div>
      
      <div style="margin-bottom: 25px;">
        <span class="bold">ATENCIÓN:</span><br>
        ${quote.destinationCompany ? quote.destinationCompany.replace(/\\n/g, '<br>') : 'C. TTE. COR. INF. VICENTE HERRERA VALDEZ.<br>JEFE DE INVESTIGACIÓN DE MERCADO<br>DE LA DIR. GRAL. DE IND. MIL.<br>CAMPO MIL. No. 25-E “VENUSTIANO CARRANZA DE LA GARZA”,<br>CARRETERA FEDERAL 140-D KILOMETRO 1.5 PREDIO “GRAL. DIV. D.E.M.<br>SALVADOR CIENFUEGOS ZEPEDA”, C.P. 75020. ORIENTAL, PUEBLA.'}
      </div>

      <div class="bold" style="margin-bottom: 5px;">PROPUESTA ECONÓMICA.</div>
      <div class="bold" style="margin-bottom: 20px;">${quote.projectTitle || 'FA17-R009/2026 “PINTURAS Y ESMALTES”'}</div>

      <table>
        <thead>
          <tr>
            <th>NO. PARTIDA</th>
            <th>CONCEPTO.</th>
            <th>CANT.</th>
            <th>UNIDAD DE MEDIDA.</th>
            <th>COSTO UNIT.</th>
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
            <td class="bold text-right">I.V.A.</td>
            <td class="bold text-right">${formatCurrency(iva)}</td>
          </tr>
          <tr>
            <td colspan="4" style="border: none;"></td>
            <td class="bold text-right">TOTAL</td>
            <td class="bold text-right">${formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-bottom: 20px; text-transform: uppercase;" class="bold">
        ${totalEnTexto} M.N.
      </div>

      <div class="bold" style="margin-bottom: 10px;">Términos comerciales:</div>
      <p>Vigencia cotización: ${quote.validityDays || 120} días naturales.</p>
      <p>Moneda en que se cotiza: Moneda Nacional.</p>
      <p>Origen de los bienes: ${quote.goodsOrigin || 'Estados Unidos Mexicanos'}.</p>
      <p>Tiempo de entrega estimado: ${nombreEmpresa}, podrá realizar la entrega a partir del siguiente día hábil de la comunicación del fallo o notificación de la adjudicación y a más tardar ${quote.deliveryTime || '3 meses'} posteriores a dicho acto.</p>
      <p>Lugar de Entrega: ${nombreEmpresa}, hará la entrega de los bienes adjudicados, en la ${quote.deliveryPlace || 'Subdirección de Almacenes de la Dirección General de Industria Militar, ubicada en el Campo Militar No. 25-E “Venustiano Carranza de la Garza”, con domicilio en Carretera Federal No. 140-D, km 1.5, Predio “Gral. Div. D.E.M. Salvador Cienfuegos Zepeda”, Municipio de Oriental, Estado de Puebla, C.P. 75020'}.</p>
      <p>Contacto: ${quote.contactInfo || 'Cor. Ing. Ind. Cesar Guadarrama Ibañez, jefe de la Fca. de serigrafia, o quien haga sus veces al momento de la recepción, con número teléfono: 27-66-88-32-29 ext. 1072, en días hábiles, en un horario de 0830 a 1800 horas'}.</p>
      <p>${nombreEmpresa}, cumple con los atributos, normas, garantías, documentación y pruebas de funcionamiento indicadas en el Anexo “C”, así como en la Anexo Administrativo y Anexo Técnico</p>
      <p>Porcentaje del Anticipo: ${quote.advancePayment || 'No aplica'}.</p>
      <p>Mi representada cuenta con la capacidad técnica para el suministro de los bienes requeridos.</p>
      
      <p>Garantía de calidad: ${nombreEmpresa}, deberá presentar una garantía de calidad, bajo los siguientes términos.</p>
      <p>Carta escrita membretada por garantía de calidad contra defectos de fabricación y/o vicios ocultos por ${quote.guaranteeMonths || 12} (${quote.guaranteeMonthsText || 'doce'}) meses, a partir de la expedición del acta de aceptación a entera satisfacción de la “Secretaría de la Defensa Nacional”; en el concepto que será cancelada una vez que haya fenecido el plazo estipulado a partir de la fecha de la entrega a entera satisfacción antes mencionada.</p>
      
      <p>Forma de Pago: El precio convenido es fijo y el pago realizará, con cargo al presupuesto autorizado, en Moneda Nacional, mediante transferencia electrónica, que deberá ser instruida por esta Dirección General a través de la TESOFE, dicho pago no podrá exceder de 17 (diecisiete) días hábiles contados a partir de la entrega de la factura o C.F.D.I. (Comprobante Fiscal Digital por Internet) sin errores y previa entrega de los bienes a entera satisfacción, lo cual se acreditará con la Constancia de Recepción y Acta de Aceptación correspondiente.</p>
      
      <p>Razón social: ${nombreEmpresa}<br>
      Objeto Social: ${provider.businessActivity}<br>
      Domicilio legal: ${provider.legalAddress}<br>
      Correo electrónico: ${provider.email}<br>
      Registro Federal de Contribuyentes: ${provider.rfc}.<br>
      Origen de la empresa: ${quote.providerNationality || 'mexicana'}.<br>
      Años de experiencia: ${quote.experienceYears || 2}.<br>
      Número de contratos afines a los bienes o servicios a adquirir o contratar: ${quote.similarContracts || '1 (Uno)'}.<br>
      Nombre del Banco de la Clabe: ${provider.bankName || 'Banorte'}.<br>
      Clave Bancaria Estándar (clabe): ${provider.bankAccount || '072180013415670012'}.<br>
      Beneficiario de la Cuenta Bancaria: ${provider.bankBeneficiary || nombreEmpresa}<br>
      Forma de pago: Transferencia Electrónica.<br>
      Nombre del representante legal: ${provider.legalRepresentative}<br>
      Teléfono: ${provider.phone}.</p>

      <p>Con la presente oferta económica manifestamos interés en participar en el suministro del bien requerido por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.</p>

      <div class="signature-section">
        <div class="bold">Atentamente</div>
        <br><br><br>
        <div class="signature-line"></div>
        <div class="bold">${provider.legalRepresentative || 'Leticia Hernández Mauro.'}</div>
        <div>Representante legal</div>
      </div>

    </body>
    </html>
  `;
}