export function generateHgwBienesTemplate(provider: any, quote: any, items: any[]) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        /* Tipografía oficial de HGW: Arial Narrow */
        body { 
          margin: 0; 
          padding: 40px 45px 0 45px; /* Margen interno para que el texto no toque las orillas */
          font-family: "Arial Narrow", Arial, sans-serif; 
          font-size: 11pt; 
          color: #000000; 
          line-height: 1.5; 
          /* Importante: NO poner background aquí, ya lo inyecta Puppeteer */
        }
        
        .bold { font-weight: bold; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
      </style>
    </head>
    <body>

      <div style="position: relative; z-index: 1;">
         
         <div class="bold text-center" style="font-size: 14pt; margin-top: 50px;">
            HGW PROCES SOLUTIONS<br>
            ¡Bienvenido a tu nueva plantilla!
         </div>
         
         <p style="margin-top: 30px;">
           Si la cotización tiene muchas partidas y salta a la segunda hoja, 
           verás cómo abajo dice "Página 1 de 2" y "Página 2 de 2" automáticamente.
         </p>

      </div>

    </body>
    </html>
  `;
}