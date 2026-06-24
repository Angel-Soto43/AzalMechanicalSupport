// 1. Importamos las plantillas de AZAL
import { generateAzalBienesTemplate } from "./azal-bienes";
import { generateAzalServiciosTemplate } from "./azal.servicios"; 

// 🚀 Integración del trabajo de tu líder para DEMA
import { generateDemaTemplate } from "./dema-bienes";
import { generateDemaServiciosTemplate } from "./dema-servicios";

// 2. Importamos tus plantillas de HERMAL, HGW y HYH
import { generateHermalBienesTemplate } from "./hermal-bienes";
import { generateHermalServiciosTemplate } from "./hermal-servicios"; 
import { generateHgwBienesTemplate } from "./hgw-bienes";
import { generateHGWServiciosTemplate } from "./hgw-servicios";
//import { generateHyhBienesTemplate } from "./hyh-bienes";
//import { generateHyhServiciosTemplate } from "./hyh-servicios"; 

export function getTemplateForProvider(provider: any, quote: any, items: any[]) {
  
  // Extraemos la empresa y el tipo. 
  // Usamos la lógica de tu líder para buscar también en provider.companyName por seguridad.
  const companyName = (quote.companyOrigin || provider?.companyName || "AZAL").toUpperCase().trim();
  const type = (quote.proposalType || "bienes").toLowerCase().trim();

  // Usamos .includes() como sugirió tu líder, es más seguro por si el string dice "HERMAL INDUSTRIAL"
  if (companyName.includes("DEMA")) {
    return type === "servicios"
      ? generateDemaServiciosTemplate(quote, items)
      : generateDemaTemplate(provider, quote, items);
      
  } else if (companyName.includes("HGW")) {
    return type === "servicios" 
      ? generateHGWServiciosTemplate(quote, items) 
      : generateHgwBienesTemplate(provider, quote, items);
      
  } else if (companyName.includes("HERMAL")) {
    return type === "servicios"
      ? generateHermalServiciosTemplate(provider, quote, items)
      : generateHermalBienesTemplate(provider, quote, items);
      
  } else if (companyName.includes("HYH")) {
    return type === "servicios"
      //? generateHyhServiciosTemplate(provider, quote, items)
      //: generateHyhBienesTemplate(provider, quote, items);
      
  } else {
    // Si no encuentra ninguna, usamos AZAL por defecto
    return type === "servicios"
      ? generateAzalServiciosTemplate(provider, quote, items)
      : generateAzalBienesTemplate(provider, quote, items);
  }
}