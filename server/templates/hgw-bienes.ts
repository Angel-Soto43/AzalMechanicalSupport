import { amountToSpanishText } from "../quotes";
import fs from "fs";
import path from "path";

export function generateHgwBienesTemplate(provider: any, quote: any, items: any[]) {
  
  let firmaHgwBase64 = "";
  try {
    const firmaPath = path.join(process.cwd(), 'server', 'assets', 'firma-hgw.png');
    if (fs.existsSync(firmaPath)) {
      firmaHgwBase64 = `data:image/png;base64,${fs.readFileSync(firmaPath).toString('base64')}`;
    }
  } catch (error) {
    console.warn("No se pudo cargar la firma de HGW:", error);
  }

  const safeParse = (data: any) => {
    if (Array.isArray(data)) return data;
    try { return JSON.parse(data || "[]"); } catch { return []; }
  };

  const deliveryDates = safeParse(quote.deliveryDatesJson || quote.deliveryDates);
  const deliveryConditions = safeParse(quote.deliveryConditionsJson || quote.deliveryConditions);
  const qualityGuarantees = safeParse(quote.qualityGuaranteesJson || quote.qualityGuarantees);
  const socialObjects = safeParse(quote.selectedSocialObjectsJson || quote.selectedSocialObjects);
  const deliveryLocations = safeParse(quote.deliveryLocationsJson || quote.deliveryLocations);

  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  let tablaLugaresHtml = "";
  if (quote.deliverySingle !== false && quote.deliverySingle !== "false") {
    tablaLugaresHtml = `
      <tr>
        <td style="border: 1px solid black; padding: 4px; text-align: center;">1 al ${items.length}</td>
        <td style="border: 1px solid black; padding: 4px; text-align: center;">${quote.deliveryLocation || quote.deliveryPlace || ""}</td>
      </tr>
    `;
  } else {
    tablaLugaresHtml = deliveryLocations.map((loc: any) => `
      <tr>
        <td style="border: 1px solid black; padding: 4px; text-align: center;">${loc.noPartida}</td>
        <td style="border: 1px solid black; padding: 4px; text-align: center;">${loc.address}</td>
      </tr>
    `).join('');
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          margin: 0; 
          /* 🚀 QUITAMOS EL 140px DE ARRIBA, AHORA PUPPETEER HACE EL TRABAJO */
          padding: 0 45px 0 45px; 
          font-family: "Arial Narrow", Arial, sans-serif; 
          font-size: 11pt; 
          color: #000000; 
          line-height: 1.3; 
        }
        .bold { font-weight: bold; }
        .title { font-size: 11pt; font-weight: bold; }
        .underline { text-decoration: underline; }
        
        .roman-list { list-style-type: upper-roman; padding-left: 25px; margin-top: 10px; margin-bottom: 15px; }
        .roman-list > li { margin-bottom: 10px; text-align: justify; }
        .alpha-list-upper { list-style-type: upper-alpha; padding-left: 20px; margin-top: 5px; }
        .alpha-list-upper > li { margin-bottom: 6px; }
        .alpha-list-lower { list-style-type: lower-alpha; padding-left: 20px; margin-top: 5px; }
        .alpha-list-lower > li { margin-bottom: 4px; }
        
        table { width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 20px; }
        th { border: 1px solid black; padding: 6px; text-align: center; font-size: 9pt; font-weight: bold; }
        td { border: 1px solid black; padding: 6px; font-size: 10pt; }
      </style>
    </head>
    <body>
      <div style="position: relative; z-index: 10;">
         
         <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div style="width: 55%; text-align: left;">
               <span class="title">ATENCIÓN:</span><br>
               ${quote.attnGrado ? `${quote.attnGrado}<br>` : ''}
               ${quote.attnNombre ? `${quote.attnNombre}<br>` : ''}
               ${quote.attnDependencia ? `${quote.attnDependencia}<br>` : ''}
               ${quote.attnArea ? `${quote.attnArea}<br>` : ''}
               ${quote.attnUbicacion ? `${quote.attnUbicacion}<br>` : ''}
               ${quote.attnDireccion ? `${quote.attnDireccion}<br>` : ''}
               ${quote.attnCargo ? `${quote.attnCargo}` : ''}
            </div>
            <div style="width: 45%; text-align: right; display: flex; flex-direction: column; justify-content: flex-end;">
               <span>${quote.attnLugar || ''} a ${quote.attnDia || ''} de ${quote.attnMes || ''} de ${quote.attnAnio || ''}.</span>
            </div>
         </div>

         <div style="text-align: center; margin-bottom: 20px;">
            <div class="title underline">PROPUESTA ECONÓMICA</div>
            <div class="underline" style="margin-top: 5px;">${quote.attnNombreProcedimiento || quote.projectTitle}</div>
         </div>

         <table>
            <thead>
              <tr>
                <th style="width: 8%;">PTDA.</th>
                <th style="width: 42%;">DESCRIPCIÓN</th>
                <th style="width: 10%;">CANT.</th>
                <th style="width: 10%;">U.M.</th>
                <th style="width: 15%;">COSTO<br>UNITARIO</th>
                <th style="width: 15%;">IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td style="text-align: left;">${item.description}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: center;">${item.unitMeasure || item.unit}</td>
                  <td style="text-align: center;">${formatCurrency(item.unitPriceCents ? item.unitPriceCents / 100 : item.unitPrice)}</td>
                  <td style="text-align: center;">${formatCurrency((item.quantity * (item.unitPriceCents ? item.unitPriceCents / 100 : item.unitPrice)))}</td>
                </tr>
              `).join('')}
              
              <tr>
                <td colspan="4" style="border: none;"></td>
                <td style="text-align: right; font-weight: bold;">SUBTOTAL:</td>
                <td style="text-align: center; font-weight: bold;">${formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td colspan="4" style="border: none;"></td>
                <td style="text-align: right; font-weight: bold;">IVA:</td>
                <td style="text-align: center; font-weight: bold;">${formatCurrency(iva)}</td>
              </tr>
              <tr>
                <td colspan="4" style="border: none;"></td>
                <td style="text-align: right; font-weight: bold;">TOTAL:</td>
                <td style="text-align: center; font-weight: bold;">${formatCurrency(total)}</td>
              </tr>
            </tbody>
         </table>

         <div style="text-align: center; font-weight: bold; margin-bottom: 25px; font-size: 10pt; text-transform: uppercase;">
            ${totalEnTexto} M.N. IVA INCLUIDO.
         </div>

         <div class="title underline">TÉRMINOS COMERCIALES:</div>
         
         <ol class="roman-list">
            <li>Moneda en que se cotiza: Moneda Nacional.</li>
            <li>Origen de los servicios: ${quote.goodsOrigin}.</li>
            <li>Vigencia de la cotización: ${quote.validityDays} días.</li>
            
            <li>Fecha de entrega.
               ${deliveryDates.length > 0 ? `
                 <ol class="alpha-list-upper">
                   ${deliveryDates.map((fecha: string) => `<li>${fecha}</li>`).join('')}
                 </ol>
               ` : ''}
            </li>
            
            <li>Lugar de entrega: HGW Process and Solutions S.A. de C.V., hará entrega de los bienes contratados en las instalaciones que a continuación se indican:
               <table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-top: 10px;">
                 <thead>
                   <tr>
                     <th style="padding: 4px; text-align: center;">PARTIDA</th>
                     <th style="padding: 4px; text-align: center;">INSTALACIONES</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${tablaLugaresHtml}
                 </tbody>
               </table>
            </li>

            <li>HGW Process and Solutions S.A. de C.V., cumplirá con las especificaciones técnicas, documentación y atributos de los servicios requeridos, indicadas en el Anexo Técnico.</li>
            
            <li>Condiciones de entrega:
               ${deliveryConditions.length > 0 ? `
                 <ol class="alpha-list-upper">
                   ${deliveryConditions.map((cond: any) => `
                     <li>
                       ${cond.text}
                       ${cond.subItems && cond.subItems.length > 0 ? `
                         <ol class="alpha-list-lower">
                           ${cond.subItems.map((sub: string) => `<li>${sub}</li>`).join('')}
                         </ol>
                       ` : ''}
                     </li>
                   `).join('')}
                 </ol>
               ` : ''}
            </li>

            <li>Garantía de calidad:
               ${qualityGuarantees.length > 0 ? `
                 <ol class="alpha-list-upper">
                   ${qualityGuarantees.map((garantia: string) => `<li>${garantia}</li>`).join('')}
                 </ol>
               ` : ''}
            </li>

            <li>Normas y Certificaciones: HGW Process and Solutions S.A. de C.V., cumplirá las normas conforme al Anexo Técnico.</li>
            <li>Mi representada cumple con los atributos, normas, garantías, documentación indicadas en los Anexos, así como en el Anexo Técnico.</li>
            <li>Mi representada cuenta con la capacidad técnica de entregar en tiempo y forma los servicios requeridos.</li>
            <li>El pago se realizará por transferencia electrónica y a los ${quote.paymentTerms} hábiles posteriores a la entrega de la factura, previa entrega de los bienes o prestación de los servicios a satisfacción.</li>
            <li>El porcentaje de garantía de cumplimiento será el 10% del monto total del contrato, antes del impuesto al valor agregado.</li>
            <li>Penas convencionales, siendo en este caso una penalización equivalente al 1% por cada día de atraso y hasta el 10% se aplicará sobre el valor de los bienes entregados en forma tardía, sin incluir el I.V.A., quedando estipulado que al momento en que se aplique alguna pena, se encuentra pendiente de cubrirse al proveedor alguna cantidad, se descontará de ésta el monto al que ascienda la pena.</li>
            <li>HGW PROCESS AND SOLUTIONS, S.A. DE C.V. se encuentra inscrita en la plataforma de Compras MX.</li>
            
            <li>Razón social: HGW PROCESS AND SOLUTIONS, S.A. DE C.V.
               <ol class="alpha-list-lower">
                  <li>Objeto Social: ${socialObjects.join(', ')}</li>
                  <li>Domicilio legal: Av. Jorge Jiménez Cantú No. 1 int. 124, Valle Escondido, Atizapán de Zaragoza, Estado de México, Código Postal 52937</li>
                  <li>Correo electrónico: hgw@hgwprocessolutions.com</li>
                  <li>Registro Federal de Contribuyentes: HPS200624FG1.</li>
                  <li>Origen de la empresa: Mexicana.</li>
                  <li>Años de experiencia: 3</li>
                  <li>Nombre del Banco de la Clabe: Inbursa.</li>
                  <li>Clave Bancaria Estándar (clabe): 036180500583815041</li>
                  <li>Beneficiario de la Cuenta Bancaria: HGW PROCESS AND SOLUTIONS, S.A. DE C.V.</li>
                  <li>Forma de pago: Transferencia Electrónica.</li>
                  <li>Nombre del representante legal: Ing. Octavio Soto Hernández.</li>
                  <li>Teléfono: 55 45566367.</li>
               </ol>
            </li>
         </ol>

         <p style="text-align: justify; margin-top: 20px;">
            Con la presente oferta económica manifestamos interés en participar en los bienes requeridos por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.
         </p>

         <div style="text-align: center; margin-top: 50px; page-break-inside: avoid;">
            <div class="title" style="margin-bottom: 10px;">ATENTAMENTE</div>
            
            <div style="min-height: 80px; display: flex; justify-content: center; align-items: flex-end; margin-bottom: 5px;">
               ${firmaHgwBase64 ? `<img src="${firmaHgwBase64}" style="max-height: 90px; width: auto;" />` : ''}
            </div>
            
            <div style="border-top: 1px solid black; width: 350px; margin: 0 auto; padding-top: 5px; line-height: 1.1;">
               <span class="title">ING. OCTAVIO SOTO HERNÁNDEZ</span><br>
               REPRESENTANTE LEGAL
            </div>
         </div>

      </div>
    </body>
    </html>
  `;
}