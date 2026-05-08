import { storage } from "./storage";

async function createTestQuote() {
  // Crear proveedor de prueba
  const provider = await storage.createProvider({
    companyName: "Proveedor de Prueba S.A.",
    legalRepresentative: "Juan Pérez",
    phone: "555-1234",
    email: "juan@proveedor.com"
  });

  // Crear cotización
  const quote = await storage.createQuote({
    internalFolio: "COT-001",
    destinationCompany: "Empresa Cliente XYZ",
    quoteDate: "2024-05-07",
    commercialTerms: "Pago a 30 días. IVA incluido.",
    providerId: provider.id
  });

  // Crear items
  await storage.createQuoteItem({
    quoteId: quote.id,
    description: "Servicio de mantenimiento mecánico",
    quantity: 1,
    unit: "pieza",
    unitPrice: 50000, // 500.00 en cents
    amount: 50000
  });

  await storage.createQuoteItem({
    quoteId: quote.id,
    description: "Repuestos varios",
    quantity: 2,
    unit: "unidad",
    unitPrice: 25000, // 250.00
    amount: 50000
  });

  console.log("Cotización de prueba creada con ID:", quote.id);
}

createTestQuote()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });