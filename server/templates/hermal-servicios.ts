import { amountToSpanishText } from "../quotes";
import fs from "fs";
import path from "path";

export function generateHermalServiciosTemplate(provider: any, quote: any, items: any[]) {
  
  // 1. Carga de firma HERMAL
  let firmaHermalBase64 = "";
  try {
    const firmaPath = path.join(process.cwd(), 'server', 'assets', 'firma-hermal.png');
    if (fs.existsSync(firmaPath)) {
      firmaHermalBase64 = `data:image/png;base64,${fs.readFileSync(firmaPath).toString('base64')}`;
    }
  } catch (error) {
    console.warn("Error cargando firma de Hermal:", error);
  }

  // 2. Parseo seguro de variables JSON
  const safeParse = (data: any) => {
    if (Array.isArray(data)) return data;
    try { return JSON.parse(data || "[]"); } catch { return []; }
  };

  const deliveryDates = safeParse(quote.deliveryDatesJson || quote.deliveryDates);
  const docConditions = safeParse(quote.deliveryConditionsJson || quote.deliveryConditions)
    .filter((cond: any) => {
      if (typeof cond === "string") return cond.trim() !== "";
      return (cond?.text || "").toString().trim() !== "";
    });
  const qualityGuarantees = safeParse(quote.qualityGuaranteesJson || quote.qualityGuarantees);
  const socialObjects = safeParse(quote.selectedSocialObjectsJson || quote.selectedSocialObjects);
  const deliveryLocations = safeParse(quote.deliveryLocationsJson || quote.deliveryLocations);

  // 3. Cálculos de la Propuesta
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  // 4. Lógica de Tabla de Entregas (Única o Múltiple)
  const entregaTexto = quote.deliveryLocation || quote.deliveryPlace || quote.deliveryPlace || "";
  const entregaContacto = quote.attnContacto || quote.contactPerson || quote.contacto || "";

  let tablaLugaresHtml = "";
  if (quote.deliverySingle !== false && quote.deliverySingle !== "false") {
    tablaLugaresHtml = `
      <p>${entregaTexto}</p>
      ${entregaContacto ? `<p>Contacto: ${entregaContacto}</p>` : ``}
    `;
  } else {
    tablaLugaresHtml = deliveryLocations.map((loc: any) => `
      <tr>
        <td style="border: 1px solid black; padding: 4px; text-align: center;">${loc.noPartida}</td>
        <td style="border: 1px solid black; padding: 4px; text-align: left;">${loc.address}</td>
      </tr>
    `).join('');
  }

  // 5. Lógica del bloque dinámico de Atención
  const attnFields = [
    quote.attnGrado,
    quote.attnNombre || quote.contactPerson || quote.attnContacto,
    quote.attnDependencia || quote.destinationCompany,
    quote.attnArea,
    quote.attnUbicacion,
    quote.attnDireccion,
    quote.attnCargo
  ].filter(campo => campo && campo.trim() !== '').map(campo => `<div>${campo}</div>`).join('');

  // ================== RENDERIZADO HTML ==================
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        /* REGLAS OBLIGATORIAS DE DISEÑO */
        body { 
          margin: 0; 
          padding: 140px 45px 80px 45px; 
          font-family: "Ebrima", Arial, sans-serif; /* Tipografía Ebrima Base */
          font-size: 10pt; /* Texto Ebrima 10 */
          color: #000000; 
          line-height: 1.3; 
        }

        .fixed-header {
          position: fixed;
          top: 0;
          left: 45px;
          right: 45px;
          padding: 10px 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: #ffffff;
          z-index: 10;
          box-sizing: border-box;
        }

        .fixed-header .header-left { width: 55%; min-width: 45%; }
        .fixed-header .header-right { width: 45%; min-width: 35%; text-align: right; display: flex; flex-direction: column; justify-content: flex-start; gap: 4px; }
        .fixed-header .header-right span { display: block; }
        
        /* Títulos Ebrima 11, Negritas */
        .title { font-family: "Ebrima", Arial, sans-serif; font-size: 11pt; font-weight: bold; }
        .bold { font-weight: bold; }
        .underline { text-decoration: underline; }
        
        /* Listas y viñetas */
        .roman-list { list-style-type: upper-roman; padding-left: 25px; margin-top: 10px; margin-bottom: 15px; }
        .roman-list > li { margin-bottom: 10px; text-align: justify; }
        
        .alpha-list-upper { list-style-type: upper-alpha; padding-left: 20px; margin-top: 5px; }
        .alpha-list-upper > li { margin-bottom: 6px; }
        
        .alpha-list-lower { list-style-type: lower-alpha; padding-left: 20px; margin-top: 5px; }
        .alpha-list-lower > li { margin-bottom: 4px; }
        
        /* Tablas Ebrima 10 */
        table { width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 20px; font-family: "Ebrima", Arial, sans-serif; font-size: 10pt; }
        th { border: 1px solid black; padding: 6px; text-align: center; font-family: "Ebrima", Arial, sans-serif; font-size: 10pt; font-weight: bold; background-color: #f2f2f2;}
        td { border: 1px solid black; padding: 6px; font-size: 10pt; }
      </style>
    </head>
    <body>
         
         <div class="fixed-header">
            <div class="header-left">
               <span class="title">ATENCIÓN:</span>
               <div style="margin-top: 6px; line-height: 1.4;">
                 ${attnFields}
               </div>
            </div>
            
            <div class="header-right">
               <span>${quote.attnLugar || ''} a ${quote.attnDia || ''} de ${quote.attnMes || ''} de ${quote.attnAnio || ''}.</span>
            </div>
         </div>

         <div style="text-align: center; margin-bottom: 20px;">
            <div class="title underline">PROPUESTA ECONÓMICA</div>
            <div class="title underline" style="margin-top: 5px;">${quote.attnNombreProcedimiento || quote.projectTitle || ''}</div>
         </div>

         <!-- TABLA DE PARTIDAS -->
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
                  <td style="text-align: center;">${item.noPartida || index + 1}</td>
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

         <div style="text-align: center; font-weight: bold; margin-bottom: 25px; text-transform: uppercase;">
            ${totalEnTexto} M.N. IVA INCLUIDO.
         </div>

         <!-- TÉRMINOS COMERCIALES -->
         <div class="title underline">TÉRMINOS COMERCIALES:</div>
         
         <ol class="roman-list">
            <li>Moneda en que se cotiza: Moneda Nacional.</li>
            <li>Origen de los servicios: ${quote.goodsOrigin || ''}.</li>
            <li>Vigencia de la cotización: ${quote.validityDays || ''} días.</li>
            
            <li>Fecha de entrega: HERMAL Industrial, S.A. de C.V., realizará la entrega de los bienes requeridos y documentación completa a partir del siguiente día natural de la comunicación del fallo o notificación de la adjudicación y a más tardar el ${quote.deliveryTime || (deliveryDates.length > 0 ? `${deliveryDates.map((fecha: string) => ` ${fecha}`).join(', ')}` : 'por definir')}.</li>
            
            <li>Lugar de entrega: HERMAL Industrial, S.A. de C.V. realizará la entrega de los bienes en las siguientes instalaciones:
               ${quote.deliverySingle !== false && quote.deliverySingle !== "false" ? tablaLugaresHtml : `
               <table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-top: 10px;">
                 <thead>
                   <tr>
                     <th style="padding: 4px; text-align: center;">PARTIDA</th>
                     <th style="padding: 4px; text-align: center;">INSTALACIÓN</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${tablaLugaresHtml}
                 </tbody>
               </table>
               `}
            </li>

            <li>HERMAL Industrial, S.A. de C.V., cumplirá con las especificaciones técnicas y atributos indicados en el Anexo "D", así como las normas, garantías, documentación y pruebas de funcionamiento indicadas en el Anexo Técnico y Anexo Administrativo.</li>
            
            <li>Garantía de calidad:
               ${qualityGuarantees.length > 0 ? `
                 <ol class="alpha-list-upper">
                   ${qualityGuarantees.map((garantia: string) => `<li>${garantia}</li>`).join('')}
                 </ol>
               ` : ''}
            </li>

            <li>Documentación:
               ${docConditions.length > 0 ? `
                 <ol class="alpha-list-upper">
                   ${docConditions.map((cond: any) => {
                     const text = typeof cond === 'string' ? cond : cond?.text || '';
                     const subItems = Array.isArray(cond?.subItems) ? cond.subItems : [];
                     return `
                       <li>
                         ${text}
                         ${subItems.length > 0 ? `
                           <ol class="alpha-list-lower">
                             ${subItems.map((sub: string) => `<li>${sub}</li>`).join('')}
                           </ol>
                         ` : ''}
                       </li>
                     `;
                   }).join('')}
                 </ol>
               ` : ''}
            </li>

            <li>Mi representada cumple con las especificaciones técnicas y atributos indicados en el Anexo "D", así como las normas, garantías, documentación y pruebas de funcionamiento indicadas en el Anexo Técnico y Anexo Administrativo.</li>
            <li>Mi representada cuenta con la capacidad técnica para el <span class="bold">suministro de los bienes</span> requeridos.</li>
            
            <li>Razón social: HERMAL Industrial, S.A. de C.V.
               <ol class="alpha-list-lower">
                  <li>Objeto Social: ${socialObjects.join(', ')}</li>
                  <li>Domicilio legal: Boulevard Manuel Ávila Camacho #2610, Torre B, P 10, oficina 10-A, Col. Valle de los Pinos, Tlalnepantla, Estado de México, Código Postal 54040.</li>
                  <li>Correo electrónico: <span style="color: #5A69D4; text-decoration: underline;">hermal@industrial.com.mx</span></li>
                  <li>Registro Federal de Contribuyentes: HIN2305193K1.</li>
                  <li>Origen de la empresa: Mexicana.</li>
                  <li>Años de experiencia: 2</li>
                  <li>Años de especialidad en el mercado: 2</li>
                  <li>Número de contratos afines a los bienes o servicios a adquirir o contratar: 1</li>
                  <li>Nombre del Banco de la Clave: Banorte.</li>
                  <li>Clave Bancaria Estándar (clave): 072180013415670012.</li>
                  <li>Forma de pago: ${quote.paymentTerms || ''}</li>
                  <li>Beneficiario de la Cuenta Bancaria: HERMAL Industrial, S.A. de C.V.</li>
                  <li>Nombre del representante legal: Leticia Hernández Mauro.</li>
                  <li>Teléfono: 55 3461 7888</li>
               </ol>
            </li>
         </ol>

         <div style="text-align: justify; margin-top: 20px;">
            Con la presente oferta económica manifestamos interés en participar en la adquisición de los bienes por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.
         </div>

         <!-- BLOQUE DE FIRMA -->
         <div style="text-align: center; margin-top: 50px; page-break-inside: avoid;">
            <div class="title" style="margin-bottom: 10px;">Atentamente.</div>
            
            <div style="min-height: 80px; display: flex; justify-content: center; align-items: flex-end; margin-bottom: 5px;">
               ${firmaHermalBase64 ? `<img src="${firmaHermalBase64}" style="max-height: 90px; width: auto;" />` : ''}
            </div>
            
            <div style="border-top: 1px solid black; width: 350px; margin: 0 auto; padding-top: 5px; line-height: 1.1;">
               <span class="title">Leticia Hernández Mauro.</span><br>
               Representante legal
            </div>
         </div>
    </body>
    </html>
  `;
}