import { amountToSpanishText } from "../quotes"; // Ajusta la ruta según tu estructura
import fs from "fs";
import path from "path";

export function generateHermalBienesTemplate(provider: any, quote: any, items: any[]) {
  console.log("[PDF-HERMAL-Bienes] Iniciando plantilla", {
    provider: provider?.companyName || quote?.companyOrigin || "sin-proveedor",
    quoteId: quote?.id,
    proposalType: quote?.proposalType || "bienes",
    itemCount: Array.isArray(items) ? items.length : 0,
  });

  // 1. Función de parseo seguro para evitar que el PDF explote con JSONs
  const safeParse = (data: any) => {
    if (Array.isArray(data)) return data;
    if (!data) return [];
    try { return JSON.parse(data); } catch { return []; }
  };

  const partidaDescriptionItems = safeParse(quote.partidaDescriptionItems);
  // 2. Extraer y parsear arrays de forma segura
  const qualityGuarantees = safeParse(quote.qualityGuaranteesJson || quote.qualityGuarantees);
  const docParagraphs = safeParse(quote.documentationParagraphsJson || quote.documentationParagraphs);
  const socialObjects = safeParse(quote.selectedSocialObjectsJson || quote.selectedSocialObjects);
  const deliveryLocations = safeParse(quote.deliveryLocationsJson || quote.deliveryLocations);
  const deliveryDates = safeParse(quote.deliveryDatesJson || quote.deliveryDates);

  // 3. Crear el bloque dinámico de Atención (¡Esto te faltaba!)
  const attnFields = [
    quote.attnGrado,
    quote.attnNombre || quote.contactPerson,
    quote.attnDependencia || quote.destinationCompany,
    quote.attnArea,
    quote.attnUbicacion,
    quote.attnDireccion,
    quote.attnCargo
  ].filter(campo => campo && campo.trim() !== '').map(campo => `<div>${campo}</div>`).join('');

  // 4. Cálculos de la tabla
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  // 5. Carga de la firma
  let firmaBase64 = "";
  try {
    const firmaPath = path.join(process.cwd(), 'server', 'assets', 'firma-hermal.png');
    if (fs.existsSync(firmaPath)) {
      firmaBase64 = `data:image/png;base64,${fs.readFileSync(firmaPath).toString('base64')}`;
    }
  } catch (error) { 
    console.warn("Error cargando firma HERMAL:", error); 
  }

  // Se determina la fecha de entrega a mostrar
  const fechaEntrega = quote.deliveryDate || (deliveryDates.length > 0 ? deliveryDates.join(', ') : 'por definir');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          margin: 0; 
          padding: 0 45px; 
          font-family: "Ebrima", Arial, sans-serif; 
          font-size: 10pt; 
          color: #000000; 
          line-height: 1.3; 
        }
        .fixed-header {
          position: fixed;
          top: 15px; 
          left: 45px;
          right: 45px;
          z-index: 10;
        }
        .content-table { width: 100%; border-collapse: collapse; border: none; }
        .content-table > thead { display: table-header-group; }
        .content-table > tbody { display: table-row-group; }
        .content-table > thead > tr > td { border: none; padding: 0; }
        .content-table > tbody > tr > td { border: none; padding: 0; }
        
        .header-space { height: 165px; }
        
        .title { font-family: "Ebrima", Arial, sans-serif; font-size: 11pt; font-weight: bold; }
        .bold { font-weight: bold; }
        .underline { text-decoration: underline; }
        
        .roman-list { list-style-type: upper-roman; padding-left: 25px; margin-top: 10px; margin-bottom: 15px; }
        .roman-list > li { margin-bottom: 10px; text-align: justify; }
        .alpha-list-upper { list-style-type: upper-alpha; padding-left: 20px; margin-top: 5px; }
        .alpha-list-upper > li { margin-bottom: 6px; }
        .alpha-list-lower { list-style-type: lower-alpha; padding-left: 20px; margin-top: 5px; }
        .alpha-list-lower > li { margin-bottom: 4px; }
      </style>
    </head>
    <body>
         
         <div class="fixed-header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
               <div style="width: 55%; text-align: left; line-height: 1.4;">
                  <span class="title">ATENCIÓN:</span>
                  <div style="margin-top: 6px;">
                    ${attnFields}
                  </div>
               </div>
               <div style="width: 45%; text-align: right; display: flex; flex-direction: column; justify-content: flex-start;">
                  <span>${quote.attnLugar || ''}, a ${quote.attnDia || ''} de ${quote.attnMes || ''} de ${quote.attnAnio || ''}.</span>
               </div>
            </div>
         </div>

         <table class="content-table">
            <thead>
               <tr>
                  <td><div class="header-space"></div></td>
               </tr>
            </thead>
            <tbody>
               <tr>
                  <td>

                     <div style="text-align: center; margin-bottom: 20px;">
                    <!-- Aquí mantenemos la clase underline para el título -->
                    <div class="title underline">PROPUESTA ECONÓMICA</div>
                    
                    <!-- Aquí quitamos la clase underline para que la variable NO salga subrayada -->
                    <div class="title" style="margin-top: 5px;">${quote.attnNombreProcedimiento || quote.projectTitle || ''}</div>
                  </div>

 <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: 'Ebrima', Arial, sans-serif; font-size: 10pt;">
  <thead>
    <tr>
      <th style="border: 2px solid #F5D0C9 !important; padding: 8px; background-color: #ffffff !important; font-weight: bold; text-align: center; color: #000;">PTDA.</th>
      <th style="border: 2px solid #F5D0C9 !important; padding: 8px; background-color: #ffffff !important; font-weight: bold; text-align: center; color: #000;">DESCRIPCIÓN</th>
      <th style="border: 2px solid #F5D0C9 !important; padding: 8px; background-color: #ffffff !important; font-weight: bold; text-align: center; color: #000;">CANT.</th>
      <th style="border: 2px solid #F5D0C9 !important; padding: 8px; background-color: #ffffff !important; font-weight: bold; text-align: center; color: #000;">U.M.</th>
      <th style="border: 2px solid #F5D0C9 !important; padding: 8px; background-color: #ffffff !important; font-weight: bold; text-align: center; color: #000;">COSTO<br>UNITARIO</th>
      <th style="border: 2px solid #F5D0C9 !important; padding: 8px; background-color: #ffffff !important; font-weight: bold; text-align: center; color: #000;">IMPORTE</th>
    </tr>
  </thead>
  <tbody>
    ${items.map((item, index) => `
      <tr>
        <td style="border: 2px solid #FFF6D9 !important; padding: 8px; text-align: center; background-color: #FFF6D9 !important; color: #000;">${item.noPartida || index + 1}</td>
        <td style="border: 2px solid #FFF6D9  !important; padding: 8px; text-align: left; background-color: #FFF6D9!important; color: #000;">${item.description}</td>
        <td style="border: 2px solid #FFF6D9 !important; padding: 8px; text-align: center; background-color: #FFF6D9 !important; color: #000;">${item.quantity}</td>
        <td style="border: 2px solid #FFF6D9 !important; padding: 8px; text-align: center; background-color: #FFF6D9  !important; color: #000;">${item.unitMeasure || item.unit}</td>
        <td style="border: 2px solid #FFF6D9 !important; padding: 8px; text-align: center; background-color: #FFF6D9 !important; color: #000;">${formatCurrency(item.unitPriceCents ? item.unitPriceCents / 100 : item.unitPrice)}</td>
        <td style="border: 2px solid #FFF6D9 !important; padding: 8px; text-align: center; background-color: #FFF6D9 !important; color: #000;">${formatCurrency((item.quantity * (item.unitPriceCents ? item.unitPriceCents / 100 : item.unitPrice)))}</td>
      </tr>
    `).join('')}
    
    <tr>
      <td colspan="4" style="border: none !important; background-color: transparent !important;"></td>
      <td style="border: 2px solid #FFF6D9 !important; padding: 8px; text-align: right; font-weight: bold; background-color: #FFF6D9 !important; color: #000;">SUBTOTAL:</td>
      <td style="border: 2px solid #FFF6D9!important; padding: 8px; text-align: center; font-weight: bold; background-color: #FFF6D9 !important; color: #000;">${formatCurrency(subtotal)}</td>
    </tr>
    <tr>
      <td colspan="4" style="border: none !important; background-color: transparent !important;"></td>
      <td style="border: 2px solid #FFF6D9 !important; padding: 8px; text-align: right; font-weight: bold; background-color: #ffffff !important; color: #000;">IVA:</td>
      <td style="border: 2px solid #FFF6D9 !important; padding: 8px; text-align: center; font-weight: bold; background-color: #ffffff !important; color: #000;">${formatCurrency(iva)}</td>
    </tr>
    <tr>
      <td colspan="4" style="border: none !important; background-color: transparent !important;"></td>
      <td style="border: 2px solid #FFF6D9 !important; padding: 8px; text-align: right; font-weight: bold; background-color: #FFF6D9 !important; color: #000;">TOTAL:</td>
      <td style="border: 2px solid #FFF6D9   !important; padding: 8px; text-align: center; font-weight: bold; background-color: #FFF6D9 !important; color: #000;">${formatCurrency(total)}</td>
    </tr>
  </tbody>
</table>

<div style="text-align: center; font-weight: bold; margin-bottom: 25px; text-transform: uppercase;">
                        ${totalEnTexto} IVA INCLUIDO.
                     </div>
                     
      <div class="title underline" style="margin-top: 20px; margin-bottom: 10px;">TÉRMINOS COMERCIALES:</div>
      
      <ol class="roman-list">
        <li>Moneda en que se cotiza: Moneda Nacional.</li>
        
        <li>Origen de los servicios: ${quote.goodsOrigin || ''}</li>
        
        <li>Vigencia de la cotización: ${quote.validityDays || ''} días.</li>
        
        <li>Fecha de entrega: HERMAL Industrial, S.A. de C.V., realizará la entrega de los bienes requeridos y documentación completa a partir del siguiente día natural de la comunicación del fallo o notificación de la adjudicación y a más tardar el ${fechaEntrega}.</li>
        
                
<li>Lugar de entrega: ...
  <table style="width: 100%; margin: 15px auto; border-collapse: collapse; ...">
    <thead>
      <tr>
        <th style="border: 2px solid #F5D0C9 !important; padding: 8px; background-color: #FFF6D9 !important; font-weight: bold; text-align: center; color: #000;">PARTIDA</th>
        <th style="border: 2px solid #F5D0C9 !important; padding: 8px; background-color: #FFF6D9 !important; font-weight: bold; text-align: center; color: #000;">INSTALACIÓN</th>
      </tr>
    </thead>
    <tbody>
      ${quote.isSingleDeliveryLocation !== false && quote.isSingleDeliveryLocation !== "false" ? `
        ${partidaDescriptionItems.map((item: any) => `
          <tr>
            <td style="border: 2px solid #F5D0C9 !important; padding: 8px; text-align: center; background-color: #FFF6D9 !important; color: #000;">
              ${item.partida || ''}
            </td>
            <td style="border: 2px solid #F5D0C9 !important; padding: 8px; text-align: left; background-color: #FFF6D9 !important; color: #000;">
              ${item.descripcion || quote.deliveryLocation || ''}
            </td>
          </tr>
        `).join('')}
      ` : `
        `}
    </tbody>
  </table>
</li>
        
        <li>HERMAL Industrial, S.A. de C.V., cumplirá con las especificaciones técnicas y atributos indicados en el Anexo "D", así como las normas, garantías, documentación y pruebas de funcionamiento indicadas en el Anexo Técnico y Anexo Administrativo.</li>
        
        <li>Garantía de calidad:
           <ol class="alpha-list-upper">
             ${qualityGuarantees.map((g: string) => `<li>${g}</li>`).join('')}
           </ol>
        </li>
        
        <li>Documentación:
           <ol class="alpha-list-upper">
             ${docParagraphs.map((doc: string) => `<li>${doc}</li>`).join('')}
           </ol>
        </li>
        
        <li>Mi representada cumple con las especificaciones técnicas y atributos indicados en el Anexo "D", así como las normas, garantías, documentación y pruebas de funcionamiento indicadas en el Anexo Técnico y Anexo Administrativo.</li>
        
        <li>Mi representada cuenta con la capacidad técnica para el suministro de los bienes requeridos.</li>
        
        <li>Razón social: HERMAL Industrial, S.A. de C.V.
           <ol class="alpha-list-lower">
             <li>Objeto Social: ${socialObjects.join(', ')}</li>
             <li>Domicilio legal: Boulevard Manuel Ávila Camacho #2610, Torre B, P 10, oficina 10-A, Col. Valle de los Pinos, Tlalnepantla, Estado de México, Código Postal 54040.</li>
             <li>Correo electrónico: hermal@industrial.com.mx</li>
             <li>Registro Federal de Contribuyentes: HIN2305193K1.</li>
             <li>Origen de la empresa: Mexicana.</li>
             <li>Años de experiencia: 2</li>
             <li>Años de especialidad en el mercado: 2</li>
             <li>Número de contratos afines a los bienes o servicios a adquirir o contratar: 1</li>
             <li>Nombre del Banco de la Clave: Banorte.</li>
             <li>Clave Bancaria Estándar (clave): 072180013415670012.</li>
             <li>Beneficiario de la Cuenta Bancaria: HERMAL Industrial, S.A. de C.V.</li>
             <li>Forma de pago: Mi representada tiene considerado que el precio convenido es fijo y el pago se realizará con cargo al presupuesto autorizado, en Moneda Nacional, en caso de dólar (USD), será conforme al tipo de cambio establecido en el Diario Oficial de la Federación y en caso de otro tipo de moneda Extranjera, será conforme al tipo de cambio en el Banco de México, a la fecha correspondiente mediante transferencia electrónica, que deberá ser instruida por esta Dirección General a través de la TESOFE: dicho pago no podrá exceder de 17 días hábiles contados a partir de la entrega de la Factura o C.F.D.I. (Comprobante Fiscal Digital por Internet) respectivo, sin errores y previa entrega de los bienes a entera satisfacción, lo cual se acreditará con la Constancia de Recepción y Acta de Aceptación correspondiente.</li>
             <li>Nombre del representante legal: Leticia Hernández Mauro.</li>
             <li>Teléfono: 55 3461 7888</li>
           </ol>
        </li>
      </ol>

      <p style="margin-top: 20px; text-align: justify;">
        Con la presente oferta económica manifestamos interés en participar en la adquisición de los bienes por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.
      </p>

      <div style="text-align: center; margin-top: 50px; page-break-inside: avoid;">
        <div class="title" style="margin-bottom: 10px;">Atentamente.</div>
        
        <div style="min-height: 80px; display: flex; justify-content: center; align-items: flex-end; margin-bottom: 5px;">
           ${firmaBase64 ? `<img src="${firmaBase64}" style="max-height: 90px; width: auto;" />` : ''}
        </div>
        
        <div style="border-top: 1px solid #000; width: 350px; margin: 0 auto; padding-top: 5px; line-height: 1.2;">
           <span class="title">Leticia Hernández Mauro.</span><br>
           Representante legal
        </div>
      </div>
      
                  </td>
               </tr>
            </tbody>
         </table>
    </body>
    </html>
  `;
}