// 1. Importamos TODAS tus plantillas
import { generateAzalBienesTemplate } from "./azal-bienes";
import { generateAzalServiciosTemplate } from "./azal.servicios"; 
import { generateDemaTemplate } from "./dema";
import { generateHermalBienesTemplate } from "./hermal-bienes";
import { generateHermalServiciosTemplate } from "./hermal-servicios"; 
import { generateHgwBienesTemplate } from "./hgw-bienes";
import { generateHGWServiciosTemplate } from "./hgw-servicios";
//import { generateHyhBienesTemplate } from "./hyh-bienes";
//import { generateHyhServiciosTemplate } from "./hyh-servicios"; 

export function getTemplateForProvider(provider: any, quote: any, items: any[]) {
  
  // 2. Extraemos la empresa y el tipo (Bienes o Servicios)
  // Si por alguna razón viene vacío, usamos "AZAL" y "bienes" por defecto.
  const company = (quote.companyOrigin || "AZAL").toUpperCase().trim();
  const type = (quote.proposalType || "bienes").toLowerCase().trim();

  // 3. El switch decide qué archivo HTML armar
  switch (company) {
    case "HGW":
      return type === "servicios" 
        ? generateHGWServiciosTemplate(quote, items) 
        : generateHgwBienesTemplate(provider, quote, items);
        
    case "HERMAL":
      return type === "servicios"
        ? generateHermalServiciosTemplate(provider, quote, items)
        : generateHermalBienesTemplate(provider, quote, items);
        
    case "HYH":
      return type === "servicios"
        ? generateHyhServiciosTemplate(provider, quote, items)
        : generateHyhBienesTemplate(provider, quote, items);
        
    case "DEMA":
      return generateDemaTemplate(provider, quote, items);
      
    case "AZAL":
    default:
      return type === "servicios"
        ? generateAzalServiciosTemplate(provider, quote, items)
        : generateAzalBienesTemplate(provider, quote, items);
  }
}