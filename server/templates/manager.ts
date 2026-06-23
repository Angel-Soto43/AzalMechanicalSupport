import { generateAzalBienesTemplate } from './azal-bienes';
import { generateAzalServiciosTemplate } from './azal.servicios';

import { generateDemaTemplate } from './dema';
import { generateHermalTemplate } from './hermal';

// 🚀 Cambié la importación para que llame exactamente a la función que armamos para HGW
import { generateHgwBienesTemplate } from './hgw-bienes'; 
// import { generateHgwServiciosTemplate } from './hgw-servicios'; // Para el futuro

import { generateHyhTemplate } from './hyh';

export function getTemplateForProvider(provider: any, quote: any, items: any[]): string {
  // Leemos la empresa directamente de la cotización (como la mandas desde el frontend) o del proveedor
  const companyName = (quote.companyOrigin || provider.companyName || "").toUpperCase();
  // Leemos si es "bienes" o "servicios"
  const proposalType = (quote.proposalType || "").toLowerCase();

  if (companyName.includes("DEMA")) {
    return generateDemaTemplate(provider, quote, items);
  } else if (companyName.includes("HERMAL")) {
    return generateHermalTemplate(provider, quote, items);
  } else if (companyName.includes("HGW")) {
    
    // 🚀 LÓGICA DE RUTEO PARA HGW (Bienes vs Servicios)
    if (proposalType === "servicios") {
      // Comodín temporal mientras arman la de servicios
      return generateHgwBienesTemplate(provider, quote, items);
    } else {
      // Cotización de Bienes de HGW
      return generateHgwBienesTemplate(provider, quote, items);
    }

  } else if (companyName.includes("HYH")) {
    return generateHyhTemplate(provider, quote, items);
  } else {
    // Si no es ninguna de las anteriores, asumimos que es AZAL
    if (proposalType === "servicios") {
    return generateAzalServiciosTemplate(provider, quote, items);

    } else {
      // 🚀 Cotización de Bienes de Azal
      return generateAzalBienesTemplate(provider, quote, items);
    }
  }
}