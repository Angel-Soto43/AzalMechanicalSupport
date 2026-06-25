import { amountToSpanishText } from "../quotes";
import fs from "fs";
import path from "path";
import { getClausulaText } from "@/lib/clausulas";

export function generateHGWServiciosTemplate(quote: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  let firmaBase64 = "";

  try {
    const firmaPath = path.join(process.cwd(), 'server', 'assets', 'firma-hgw.png');
    if (fs.existsSync(firmaPath)) firmaBase64 = `data:image/png;base64,${fs.readFileSync(firmaPath).toString('base64')}`;
  } catch (error) { 
    console.warn("Error cargando assets:", error); 
  }

  // Función auxiliar para letras (A, B, C...)
  const getLetter = (index: number) => String.fromCharCode(65 + index);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        /* 🚀 CSS LIMPIO: Sin padding forzado, Puppeteer ya hace el trabajo en routes.ts */
        body { 
          margin: 0; 
          padding: 0 45px 0 45px; 
          font-family: "Arial Narrow", Arial, sans-serif; 
          font-size: 11pt; 
          line-height: 1.3; 
          color: #000000;
        }
        .bold { font-weight: bold; }
        .underline { text-decoration: underline; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        
        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
        th { font-size: 9pt; background-color: #f2f2f2; border: 1px solid #000; padding: 5px; }
        td { font-size: 10pt; border: 1px solid #000; padding: 5px; text-align: center; }
        
        .list-roman { list-style-type: upper-roman; padding-left: 30px; margin-top: 10px; margin-bottom: 15px; }
        .list-roman > li { margin-bottom: 10px; text-align: justify; }
        .list-alpha { list-style-type: upper-alpha; padding-left: 30px; margin-top: 5px; }
        .list-alpha > li { margin-bottom: 6px; }
        .list-lower { list-style-type: lower-alpha; padding-left: 30px; margin-top: 5px; }
        .list-lower > li { margin-bottom: 4px; }
      </style>
    </head>
    <body>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div style="width: 55%; text-align: left;">
          <div class="bold">ATENCIÓN:</div>
          <div>${quote.attnGrado || ''} ${quote.attnNombre || ''}</div>
          <div>${quote.attnDependencia || ''}</div>
          <div>${quote.attnArea || ''}</div>
          <div>${quote.attnUbicacion || ''}</div>
          <div>${quote.attnDireccion || ''}</div>
          <div>${quote.attnCargo || ''}</div>
        </div>
        <div style="width: 45%; text-align: right; display: flex; flex-direction: column; justify-content: flex-end;">
          <span>${quote.attnLugar || ''} a ${quote.attnDia || ''} de ${quote.attnMes || ''} de ${quote.attnAnio || ''}.</span>
        </div>
      </div>

      <div class="text-center" style="margin-bottom: 20px;">
        <div class="bold underline">PROPUESTA ECONÓMICA</div>
        <div class="bold underline" style="margin-top: 5px;">${quote.attnNombreProcedimiento || ''}</div>
      </div>

      <table>
        <thead>
          <tr><th>No.</th><th>DESCRIPCIÓN</th><th>CANT.</th><th>U.M.</th><th>COSTO UNITARIO</th><th>IMPORTE</th></tr>
        </thead>
        <tbody>
          ${items.map((item, i) => `
            <tr>
              <td>${item.noPartida || i + 1}</td>
              <td class="text-left">${item.description}</td>
              <td>${item.quantity}</td>
              <td>${item.unit}</td>
              <td>${formatCurrency(item.unitPrice)}</td>
              <td>${formatCurrency(item.quantity * item.unitPrice)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="bold text-center" style="margin-bottom: 25px; text-transform: uppercase;">
        ${totalEnTexto} M.N. IVA INCLUIDO.
      </div>

      <div class="bold underline" style="margin-top: 20px;">TÉRMINOS COMERCIALES:</div>
      
      <ol class="list-roman">
        <li>Moneda en que se cotiza: Moneda Nacional.</li>
        <li>Origen de los servicios: ${quote.goodsOrigin || ''}</li>
        <li>Vigencia de la cotización: ${quote.validityDays || ''} días.</li>
        </li>
       <li>Fecha de entrega (Fundamento Legal): Con fundamento en el Artículo 66 fracción XII de la L.A.A.S.S.P...
  <ol class="list-alpha">
    ${(() => {
      try {
        // 1. Usa la variable correcta: quote.deliveryDates
        // 2. Si es string, pásalo a objeto; si ya es objeto, úsalo directo
        const dates = typeof quote.deliveryDates === 'string' 
          ? JSON.parse(quote.deliveryDates) 
          : (quote.deliveryDates || []);
          
        return dates.map((loc: string) => `<li>${loc}</li>`).join('');
      } catch (e) {
        return '<li>Error al cargar fechas</li>';
      }
    })()}
  </ol>
</li>



        <!-- Debes estar dentro de la lista principal (ol class="list-roman") -->
<li value="5">
  Lugar de entrega: HGW Process and Solutions S.A. de C.V. hará entrega de los servicios contratados en las instalaciones que a continuación se indican:
  
  <ol class="list-alpha" style="margin-top: 5px; margin-left: 20px;">
    ${(quote.selectedDeliveryClauses || []).sort().map((id: string) => `
      <li style="margin-bottom: 10px; font-weight: normal;">
        ${getClausulaText(id)}
        
        ${id === 'C' ? `
          <table style="margin-top: 10px; width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9pt;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #000; padding: 4px;">No.</th>
                <th style="border: 1px solid #000; padding: 4px;">R.M.</th>
                <th style="border: 1px solid #000; padding: 4px;">Ubicación del porteo</th>
                <th style="border: 1px solid #000; padding: 4px;">Dirección Física</th>
              </tr>
            </thead>
            <tbody>
              ${(quote.deliveryLocations || []).map((loc: any) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 4px;">${loc.noPartida || ''}</td>
                  <td style="border: 1px solid #000; padding: 4px;">${loc.regionMilitar || ''}</td>
                  <td style="border: 1px solid #000; padding: 4px;">${loc.address || ''}</td>
                  <td style="border: 1px solid #000; padding: 4px;">${loc.contact || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </li>
    `).join('')}
  </ol>
</li>

        <li>HGW Process and Solutions S.A. de C.V., cumplirá con las especificaciones técnicas, documentación y atributos de los bienes requeridos, indicadas en las FichasTécnicas.</li>
        <li>Normas y Certificaciones: HGW Process and Solutions S.A. de C.V., cumplirá las normas  conforme a la ficha de especificaciones técnicas.</li>
        <li>Garantía de calidad:
           <ol class="list-alpha">
             ${(quote.qualityGuarantees || []).map((g: string) => `<li>${g}</li>`).join('')}
           </ol>
        </li>
        <li>Mi representada cumple con los atributos, normas, garantías, documentación indicadas en los Anexos, así como en la Tarjeta de Requerimientos Técnicos y Fichas Técnicas.</li>
        <li>Mi representada cuenta con la capacidad técnica de entregar en tiempo y forma los bienes requeridos.</li>
        <li>Registros sanitarios o permisos especiales: No aplica</li>
        <li>Razón social: HGW PROCESS AND SOLUTIONS, S.A. DE C.V.
           <ol class="list-lower">
             <li>Objeto Social: ${(quote.selectedSocialObjects || []).join(', ')}</li>
             <li>Domicilio legal: Av. Jorge Jiménez Cantú No. 1 int. 124, Valle Escondido, Atizapán de Zaragoza, Estado de México, Código Postal 52937</li>
            <li>
                Correo electrónico: 
                <a href="mailto:hgw@hgwprocessolutions.com" 
                  style="color: #0056b3; text-decoration: underline; font-weight: bold;">
                  hgw@hgwprocessolutions.com
                </a>
            </li>
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

      <p style="margin-top: 20px; text-align: justify;">
        Con la presente oferta económica manifestamos interés en participar en el servicio de mantenimiento requerido por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.
      </p>

      <div style="text-align: center; margin-top: 50px; page-break-inside: avoid;">
        <div class="bold" style="margin-bottom: 10px;">ATENTAMENTE</div>
        <div style="min-height: 80px; display: flex; justify-content: center; align-items: flex-end; margin-bottom: 5px;">
           ${firmaBase64 ? `<img src="${firmaBase64}" style="max-height: 90px; width: auto;" />` : ''}
        </div>
        <div style="border-top: 1px solid #000; width: 350px; margin: 0 auto; padding-top: 5px; line-height: 1.1;">
           <span class="bold">ING. OCTAVIO SOTO HERNÁNDEZ</span><br>
           REPRESENTANTE LEGALx
        </div>
      </div>
      
    </body>
    </html>
  `;
}