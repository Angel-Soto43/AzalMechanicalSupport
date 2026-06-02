import { generateAzalTemplate } from './azal';
import { generateDemaTemplate } from './dema';

export function getTemplateForProvider(provider: any, quote: any, items: any[]): string {
  const companyName = (provider.companyName || "").toUpperCase();

  // 🚀 RUTEO DINÁMICO: Solo decide qué diseño usar, los datos ya vienen en "provider"
  if (companyName.includes("DEMA")) {
    return generateDemaTemplate(provider, quote, items); // Cambiaremos esto por generateDemaTemplate
  } else if (companyName.includes("HERMAL")) {
    return generateAzalTemplate(provider, quote, items); 
  } else if (companyName.includes("HGW")) {
    return generateAzalTemplate(provider, quote, items); 
  } else if (companyName.includes("HYH")) {
    return generateAzalTemplate(provider, quote, items); 
  }

  // Por defecto retorna el diseño de AZAL
  return generateAzalTemplate(provider, quote, items);
}