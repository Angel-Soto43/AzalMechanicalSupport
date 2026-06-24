import { amountToSpanishText } from "../quotes";

export function generateDemaTemplate(provider: any, quote: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  // Dato azul: Proveedor
  const nombreEmpresa = provider.companyName || 'DEMA Ingeniería y Soluciones Industriales S.A. de C.V.';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 0 45px; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000000; line-height: 1.5; background: #ffffff; }
        .text-center { text-align: center; }
        .text-justify { text-align: justify; margin-bottom: 10px; }
        .bold { font-weight: bold; }
        .underline { text-decoration: underline; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; }
        th { font-weight: bold; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        
        .table-no-border th, .table-no-border td { border: 1px solid #000; }
        .table-no-border th { background-color: #ffffff; color: #000; }

        .signature-section { margin-top: 50px; text-align: center; page-break-inside: avoid; }
        .signature-line { width: 250px; height: 1px; background: #000000; margin: 0 auto 5px auto; }
        
        p { margin: 0 0 10px 0; text-align: justify; }
      </style>
    </head>
    <body>

      <div class="text-center bold" style="margin-bottom: 5px;">OFERTA ECONÓMICA</div>
      <div class="text-center bold" style="margin-bottom: 20px;">“${quote.projectTitle || 'MANTENIMIENTO Y OPERACIÓN DEL SISTEMA DIGITAL DE SANIDAD'}”.</div>

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

      <div style="margin-bottom: 20px;" class="bold">
        (${totalEnTexto})
      </div>

      <p class="bold">TÉRMINOS COMERCIALES:</p>
      <p>Moneda en que se cotiza: Moneda Nacional.</p>
      <p>Origen de los servicios: ${quote.goodsOrigin || 'Estados Unidos Mexicanos'}.</p>
      <p>Vigencia de la cotización: ${quote.validityDays || 90} días.</p>
      <p>Fecha de entrega.<br>
      La entrega de los servicios se llevará a cabo a partir del 1/er. día hábil siguiente a la comunicación del fallo y ${quote.deliveryTime || 'como fecha 2027'}.<br>
      El acto de entrega-recepción definitiva se llevará a cabo dentro de las 72 horas después de que el área requirente lo haya solicitado a la Inspección y Contraloría General del Ejército y Fuerza Aérea.</p>
      
      <p>Lugar de entrega: ${nombreEmpresa}, hará entrega de los servicios contratados en las instalaciones que a continuación se indican:</p>

      <table class="table-no-border">
        <thead>
          <tr>
            <th>PARTIDAS</th>
            <th>INSTALACIONES</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Todas</td>
            <td class="text-left">${quote.deliveryPlace || 'Hospital Militar de Zona...'}</td>
          </tr>
        </tbody>
      </table>

      <p>${nombreEmpresa}, entregará los servicios conforme al Anexo Administrativo y Anexo Técnico.</p>
      <p>Normas y Certificaciones: ${nombreEmpresa}, cumplirá las normas conforme al Anexo Técnico.</p>
      <p>${nombreEmpresa}, acepta las condiciones de pago establecidas en el Anexo Administrativo.</p>
      <p>${nombreEmpresa}, entregará los servicios conforme al Anexo Administrativo y Anexo Técnico:</p>
      <p>${nombreEmpresa}, deberá establecer comunicación vía telefónica en un plazo de 48 horas. Antes de la entrega de los servicios a los números telefónicos de contacto de cada una de las áreas usuarias que recibirá los servicios contratados, a fin de coordinar y agilizar la entrega de los servicios.</p>
      <p>Se realizará en entrega parciales (partidas completas) o en una sola entrega la totalidad de los servicios, la cual no deberá rebasar la fecha de entrega establecida, el área usuaria, al recibir los servicios deberá elaborar y firmar la “constancia de recepción” de servicios, mediante la cual especifique que estos fueron recibidos conforme al documento contractual, misma que será remitida al área requirente y al administrador adjunto del contrato en un término no mayor a 48 horas.</p>
      <p>Condiciones específicas para la entrega de la prestación de servicios, así como los criterios generales que deberán atenderse para acreditar la recepción a satisfacción de esta secretaría de los servicios, conforme Políticas, Bases y Lineamientos en Materia de Adquisiciones, Arrendamientos y Servicios de la Secretaría de la Defensa Nacional, enero 2026.</p>
      
      <p>Entrega de los servicios:<br>
      El titular del almacén, deposito o área responsable de recibir los servicios, deberá elaborar y firmar la “Constancia de recepción” de servicios, mediante la cual especifique que estos fueron recibidos conforme al documento contractual formalizado.<br>
      El Área requirente una vez que reciba dicha constancia, solicitará la participación de la Inspección en el caso de que proceda.<br>
      Tratándose de entregas múltiples de servicios, la participación de la Inspección podrá ser al concluir la totalidad de las entregas, siempre y cuando las entregas sean en apego a las condiciones y temporalidad establecidas en el contrato.<br>
      La Inspección en coordinación con el Área requirente programará la fecha en que se realizará el acto de inspección, el cual no podrá exceder de 72 horas después de recibir la solicitud del Área requirente.<br>
      En la fecha programada se llevará a cabo el acto de inspección en el cual participarán representantes del área responsable de la recepción, del Área requirente, de la I.C.G.E. y F.A., del Área técnica y de ${nombreEmpresa}, así como, el Administrador adjunto del Contrato y el o los asesores técnicos especializados que asigne la Dirección General de Materiales de Guerra, a fin de que se emita el Dictamen técnico correspondiente, el cual indique si los servicios se reciben conforme a lo contratado; el Dictamen técnico será firmado por el personal involucrado en los aspectos técnicos de lo recibido (Área requirente, Área técnica, responsable de la recepción, Área usuaria en caso de que sea diferente a la requirente, Administrador adjunto del Contrato y asesores técnicos o con conocimiento en la materia.) y se realizará en cada una de las instalaciones de los organismos que recibieron los servicios contratados<br>
      En el supuesto que se cumpla con lo estipulado en el instrumento contractual, el Área requirente elaborará el Acta de aceptación de los servicios, misma que será firmada por los participantes en el acto, mediante la cual informará sobre dicha recepción a entera satisfacción al Área contratante.<br>
      El Acta de aceptación será firmada por los participantes asentando la responsabilidad de cada uno como sigue:<br>
      Representante del área responsable de la recepción: recibe los servicios en la cantidad y condiciones especificadas en el contrato.<br>
      Representante del Área requirente: verifica que los servicios son recibidos en cantidad y condiciones especificadas en el contrato.<br>
      Representante del Área técnica (Asesor técnico): valida que las especificaciones técnicas de los servicios que se reciben corresponden a las establecidas en el contrato.<br>
      Inspección: verifica que los servicios se reciben conforme al nivel de inspección establecida en los contratos y que la actuación de los servidores públicos sea apegada a la normatividad.<br>
      Administrador adjunto del contrato: valida el cumplimiento de las obligaciones contractuales.<br>
      ${nombreEmpresa}, manifiesta su conformidad respecto al acto de inspección.<br>
      En caso de que ${nombreEmpresa}, no asista al acto se dará por hecho que acepta tácitamente la determinación que se establezca en el “Acta de aceptación”, sin reserva de derecho.<br>
      El original del Acta de aceptación se remitirá al Área contratante y se distribuirán copias al Área de pagos y cada uno de los organismos participantes.<br>
      Una vez aceptados los servicios, el titular del área responsable de la recepción, validará el C.F.D.I. con su firma para acreditar la aceptación y la remitirá en un plazo máximo de 24 horas al Área requirente, la cual a su vez la legalizará con su firma y la remitirá al proveedor o al Área de pagos en un plazo máximo de 24 horas para el trámite de pago correspondiente.<br>
      En caso de que ${nombreEmpresa}, no realice la entrega de los servicios conforme a lo pactado en el instrumento contractual, el titular del área responsable de recibir servicios deberá informar por escrito dicha situación en un plazo máximo de 24 horas al Área requirente, la cual elaborará el “Acta de incumplimiento para inicio de rescisión administrativa”, en un término no mayor a 48 horas.<br>
      En caso de que ${nombreEmpresa}, realice la entrega de los servicios con atraso, previo a la determinación de la rescisión administrativa, además de los documentos antes citados, el titular del área responsable de recibir los servicios deberá informar por escrito dicha situación en un plazo máximo de 24 horas al Área requirente, la cual elaborará el “Acta de incumplimiento para penalización” determinando el monto de las penas de acuerdo a lo establecido en el contrato y la remitirá al Área contratante, en un plazo máximo de 48 horas posteriores a la recepción del citado informe.</p>

      <p>Participación de la Inspección, en la aceptación de los servicios.<br>
      La Inspección, conforme a sus atribuciones y facultades legales fungirá como interventora en la recepción de la prestación de servicios que la Secretaría adquiera o contrate, con la finalidad de verificar que fueron recibidos conforme a lo pactado en los instrumentos contractuales.<br>
      La Inspección realizará la función antes señalada cuando el importe corresponda a lo establecido en los contratos de acuerdo con el Presupuesto de Egresos de la Federación del ejercicio fiscal correspondiente.<br>
      Una vez concluida la aceptación, el Área requirente solicitará la intervención de la Inspección.<br>
      Cuando se trate de servicios entregados fuera del Valle de México, la Inspección podrá nombrar un representante para que funja como interventor en la recepción.<br>
      Independiente de lo anterior la Inspección conforme a sus facultades podrá supervisar y/o fiscalizar cualquier acto del proceso de adquisiciones.</p>

      <p>${nombreEmpresa}, entregará una Garantía de Calidad conforme al Anexo Administrativo:<br>
      ${nombreEmpresa}, deberá entregar una garantía de calidad por escrito que ampare los trabajos realizados y/o las partes y componentes reemplazados con vigencia de ${quote.guaranteeMonths || 6} meses a partir de la entrega y recepción definitiva por partida completa del último servicio y a entera satisfacción de esta Secretaría. Lo anterior para responder por la calidad, defectos y vicios ocultos, así como de las fallas que presenten los equipos.<br>
      La garantía surtirá efectos a partir de que el equipo se haya recibido a entera satisfacción del área usuaria, mediante la constancia de recepción de los servicios.<br>
      ${nombreEmpresa}, deberá emplear refacciones nuevas y originales para evitar problemas de calidad, defectos y vicios ocultos y corresponder al equipo que se le dará el servicio.<br>
      La notificación a ${nombreEmpresa}, de la falla, avería o mal funcionamiento de los equipos, atribuible al servicio de mantenimiento que proporcionó, se realizará a través de una carta dirigida al representante legal y enviada por correo electrónico a la dirección electrónica que ${nombreEmpresa}, dispondrá, teniendo un plazo de 15 días naturales para la aplicación de la garantía.</p>

      <p>Mi representada cuenta con la capacidad técnica de entregar en tiempo y forma los servicios requeridos.</p>
      <p>Registros sanitarios o permisos especiales: No aplica.</p>
      <p>Mi representada se encuentra inscrita en la plataforma de ComprasMX.</p>
      
      <p>Razón social: ${nombreEmpresa}<br>
      Objeto Social: ${provider.businessActivity}<br>
      Domicilio legal: ${provider.legalAddress}<br>
      Correo electrónico: ${provider.email}<br>
      Registro Federal de Contribuyentes: ${provider.rfc}<br>
      Origen de la empresa: ${quote.providerNationality || 'Mexicana'}.<br>
      Nombre del Banco de la Clabe: ${provider.bankName || 'BANORTE'}.<br>
      Clave Bancaria Estándar (clabe): ${provider.bankAccount || '000000000000000000'}<br>
      Beneficiario de la Cuenta Bancaria: ${provider.bankBeneficiary || nombreEmpresa}<br>
      Forma de pago: Transferencia Electrónica.<br>
      Nombre del representante legal: ${provider.legalRepresentative}<br>
      Teléfono: ${provider.phone}</p>

      <p>Con la presente oferta económica manifestamos interés en participar en los servicios requeridos por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.</p>

      <div class="signature-section">
        <div class="bold">ATENTAMENTE</div>
        <br><br><br>
        <div class="signature-line"></div>
        <div class="bold">${provider.legalRepresentative ? provider.legalRepresentative.toUpperCase() : 'REPRESENTANTE LEGAL'}</div>
        <div class="bold">REPRESENTANTE LEGAL</div>
      </div>

    </body>
    </html>
  `;
}