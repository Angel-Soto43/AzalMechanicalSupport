import { generateAzalBienesTemplate } from './azal-bienes';
// import { generateAzalServiciosTemplate } from './azal-servicios'; // La activaremos cuando hagamos la de servicios
import { generateDemaTemplate } from './dema';
import { generateHermalTemplate } from './hermal';
import { generateHgwTemplate } from './hgw';
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
    return generateHgwTemplate(provider, quote, items);
  } else if (companyName.includes("HYH")) {
    return generateHyhTemplate(provider, quote, items);
  } else {
    // Si no es ninguna de las anteriores, asumimos que es AZAL
    if (proposalType === "servicios") {
      // 🚀 Por ahora mandamos la de bienes como comodín, pero aquí irá la de servicios pronto
      // return generateAzalServiciosTemplate(provider, quote, items);
      return generateAzalBienesTemplate(provider, quote, items);
    } else {
      // 🚀 Cotización de Bienes de Azal
      return generateAzalBienesTemplate(provider, quote, items);
    }
  }
}