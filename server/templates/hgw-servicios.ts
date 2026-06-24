import { amountToSpanishText } from "../quotes";
import fs from "fs";
import path from "path";
import { getClausulaText } from "@/lib/clausulas";
import headerHGW from "../../assets/encabezadoHGW.png";
import footerHGW from "../../assets/pieHGW.png";


export function generateHGWServiciosTemplate(quote: any, items: any[]) {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const totalEnTexto = amountToSpanishText(total);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  let firmaBase64 = "";
  let headerBase64 = "";
  let footerBase64 = "";

  try {
    const firmaPath = path.join(process.cwd(), 'server', 'assets', 'firma-hgw.png');
    const headerPath = path.join(process.cwd(), 'server', 'assets', 'encabezadoHGW.png');
    const footerPath = path.join(process.cwd(), 'server', 'assets', 'pieHGW.png');

    if (fs.existsSync(firmaPath)) firmaBase64 = `data:image/png;base64,${fs.readFileSync(firmaPath).toString('base64')}`;
    if (fs.existsSync(headerPath)) headerBase64 = `data:image/png;base64,${fs.readFileSync(headerPath).toString('base64')}`;
    if (fs.existsSync(footerPath)) footerBase64 = `data:image/png;base64,${fs.readFileSync(footerPath).toString('base64')}`;
  } catch (error) { console.warn("Error cargando assets:", error); }

  // Función auxiliar para letras (A, B, C...)
  const getLetter = (index: number) => String.fromCharCode(65 + index);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { padding-top: 140px; font-family: "Arial Narrow", Arial, sans-serif; font-size: 11pt; line-height: 1.2; }
        .bold { font-weight: bold; }
        .underline { text-decoration: underline; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
        th { font-size: 9pt; background-color: #f2f2f2; border: 1px solid #000; padding: 5px; }
        td { font-size: 10pt; border: 1px solid #000; padding: 5px; text-align: center; }
        .text-left { text-align: left; }
        .list-roman { list-style-type: upper-roman; padding-left: 30px; }
        .list-alpha { list-style-type: upper-alpha; padding-left: 30px; }
        .list-lower { list-style-type: lower-alpha; padding-left: 30px; }
      </style>
    </head>
    <body>
      <div style="display: flex; justify-content: space-between;">
        <div style="width: 55%; text-align: left;">
          <div class="bold">ATENCIÓN:</div>
          <div>${quote.attnGrado || ''} ${quote.attnNombre || ''}</div>
          <div>${quote.attnDependencia || ''}</div>
          <div>${quote.attnArea || ''}</div>
          <div>${quote.attnUbicacion || ''}</div>
          <div>${quote.attnDireccion || ''}</div>
          <div>${quote.attnCargo || ''}</div>
        </div>
        <div style="width: 45%; text-align: right; padding-top: 30px;">
          ${quote.attnLugar || ''} a ${quote.attnDia || ''} de ${quote.attnMes || ''} de ${quote.attnAnio || ''}.
        </div>
      </div>

      <div class="text-center" style="margin-top: 30px;">
        <div class="bold underline">PROPUESTA ECONÓMICA</div>
        <div class="bold underline">${quote.attnNombreProcedimiento || ''}</div>
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
      <div class="bold text-center">${totalEnTexto}</div>

      <div class="bold underline" style="margin-top: 20px;">TÉRMINOS COMERCIALES:</div>
      <ol class="list-roman">
        <li>Moneda en que se cotiza: Moneda Nacional.</li>
        <li>Origen de los servicios: ${quote.goodsOrigin || ''}</li>
        <li>Vigencia de la cotización: ${quote.validityDays || ''}</li>
        <li>Fecha de entrega:
           <ol class="list-alpha">
             ${(quote.deliveryDates || []).map((d: string) => `<li>${d}</li>`).join('')}
           </ol>
        </li>
        <li>Fecha de entrega (Fundamento Legal): Con fundamento en el Artículo 66 fracción XII de la L.A.A.S.S.P...
           <ol class="list-alpha">
             ${(quote.deliveryLocation || []).map((loc: string) => `<li>${loc}</li>`).join('')}
           </ol>
        </li>


        {*LUGAR DE ENTREGA*}
          <ol class="list-roman" start="5">
    <li>Lugar de entrega: HGW Process and Solutions S.A. de C.V. hará entrega de los servicios contratados en las instalaciones que a continuación se indican:
      
      <ol class="list-alpha">
        ${(quote.selectedDeliveryClauses || []).sort().map((id: string) => `
          <li style="margin-bottom: 10px;">
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
  </ol>

        </li>
        <li>HGW Process and Solutions S.A. de C.V., cumplirá con las especificaciones técnicas...</li>
        <li>Normas y Certificaciones: HGW Process and Solutions S.A. de C.V., cumplirá las normas...</li>
        <li>Garantía de calidad:
           <ol class="list-alpha">
             ${(quote.qualityGuarantees || []).map((g: string) => `<li>${g}</li>`).join('')}
           </ol>
        </li>
        <li>Mi representada cumple con los atributos...</li>
        <li>Mi representada cuenta con la capacidad técnica...</li>
        <li>Registros sanitarios o permisos especiales: No aplica</li>
        <li>Razón social: HGW PROCESS AND SOLUTIONS, S.A. DE C.V.
           <ol class="list-lower">
             <li>Objeto Social: ${(quote.selectedSocialObjects || []).join(', ')}</li>
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

      <p style="margin-top: 20px;">Con la presente oferta económica manifestamos interés en participar en el servicio de mantenimiento requerido por esa dependencia; y se presenta sin compromiso ni obligaciones para ambas partes.</p>

      <div style="text-align: center; margin-top: 50px;">
        <div class="bold">ATENTAMENTE</div>
        <div style="margin: 10px 0;">${firmaBase64 ? `<img src="${firmaBase64}" style="max-height: 80px;" />` : '<br><br>'}</div>
        <div style="border-top: 1px solid #000; width: 250px; margin: 0 auto;"></div>
        <div class="bold">ING. OCTAVIO SOTO HERNÁNDEZ</div>
        <div class="bold">REPRESENTANTE LEGAL</div>
      </div>
    </body>
    </html>
  `;
}