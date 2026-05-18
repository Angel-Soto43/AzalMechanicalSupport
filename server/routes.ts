import { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import archiver from "archiver";
import multer from "multer";
import puppeteer from "puppeteer";
import { storage } from "./storage";
import { amountToSpanishText, convertQuoteItemFromDb, convertQuoteItemsFromDb, fromCents, validateQuoteItems, generateQuoteHTML } from "./quotes";
import { insertLicitacionSchema, files } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import "isomorphic-fetch";
import { getMicrosoftFiles, 
        getMicrosoftQuota, 
        getMicrosoftFolders, 
        createMicrosoftFolder, 
        getMicrosoftFolderContent,
        updateMicrosoftItemDescription,
        uploadFileToGraph,
        renameMicrosoftItem,
        deleteMicrosoftItem,
        createMicrosoftShareLink,
        getMicrosoftFolderChildren,
        getMicrosoftItemDownloadUrl,
        getMicrosoftItemMetadata,
        getMicrosoftItemContentStream,
        updateMicrosoftItemContent } from "./microsoft-graph";
import { requireAuth } from "./auth";
import { getMicrosoftFilesPaginated } from "./microsoft-graph";
import { startOfWeek, startOfMonth, startOfYear, subYears, endOfYear } from "date-fns";

const upload = multer({ storage: multer.memoryStorage() });
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 🚀 CORREGIDO: Se limpian los márgenes manuales para respetar el resguardo CSS nativo de Azal
async function generateQuotePdfBuffer(quote: any, provider: any, lineItems: any[]) {
  const html = generateQuoteHTML({
    ...quote,
    folio: quote.internalFolio,
    destinationCompany: quote.destinationCompany,
    totalText: quote.totalText
  }, provider, lineItems);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle2', timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }, // Obliga a usar el padding real del CSS
      preferCSSPageSize: true
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

function sanitizeFileName(value: string) {
  return value
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-.]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildQuotePdfFileName(quote: any) {
  const folio = quote.internalFolio || `Q${quote.id}`;
  const cliente = quote.destinationCompany || quote.projectTitle || 'PropuestaEconomica';
  const fecha = quote.quoteDate ? new Date(quote.quoteDate).toISOString().split('T')[0] : '';
  const safeCliente = sanitizeFileName(cliente);
  const safeFolio = sanitizeFileName(folio);
  const safeFecha = sanitizeFileName(fecha);
  const filename = `COT-${safeFolio}_${safeCliente}${safeFecha ? `_${safeFecha}` : ''}.pdf`;
  return filename.replace(/__+/g, '_');
}

export async function registerRoutes(app: Express, httpServer: Server): Promise<Server> {

  // Configuración de cabeceras para todas las peticiones /api
  app.use("/api", (req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    next();
  });

  // --- GESTIÓN DE CARPETAS Y ARCHIVOS ---
  app.get("/api/folders", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const lista = await storage.getRootFolders(userId);
      res.status(200).json(lista || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ☁️ RUTA EXCLUSIVA DE ONEDRIVE
  app.post("/api/folders", requireAuth, async (req: any, res) => {
    try {
      const { name, parentId } = req.body;
      const trimmedName = typeof name === "string" ? name.trim() : "";

      if (!trimmedName) return res.status(400).json({ error: "El nombre es obligatorio" });

      const shouldUseMicrosoft = parentId === undefined || parentId === null || parentId === "" || Number.isNaN(Number(parentId));
      if (shouldUseMicrosoft) {
        if (!req.user.accessToken) return res.status(401).json({ error: "Sesión de Microsoft expirada" });

        const folderCloud = await createMicrosoftFolder(
          req.user.accessToken,
          req.user.refreshToken,
          req.user.id,
          trimmedName,
          parentId && parentId !== "" ? parentId : undefined
        );

        await storage.createAuditLog({
          correo: req.user.correo || req.user.email || null,
          action: "Crear carpeta nube",
          details: `Se creó la carpeta "${trimmedName}" en Microsoft OneDrive`
        });

        return res.status(201).json(folderCloud);
      }

      const folder = await storage.createFolder({
        name: trimmedName,
        parentId: parentId ? Number(parentId) : null,
        userId: req.user.id,
      });

      await storage.createAuditLog({
        correo: req.user.correo || req.user.email || null,
        action: "Crear carpeta local",
        details: `Se creó la carpeta "${trimmedName}" en el sistema local`
      });

      res.status(201).json(folder);
    } catch (e: any) {
      console.error("❌ Error en Microsoft Graph:", e.message);
      res.status(500).json({ error: e.message || "Error al crear la carpeta en OneDrive" });
    }
  });

  app.patch("/api/folders/:id", requireAuth, async (req: any, res) => {
    try {
      const folderIdParam = req.params.id;
      const isMicrosoft = Number.isNaN(Number(folderIdParam));
      const name = (req.body.name || "").trim();
      if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });

      if (isMicrosoft) {
        if (!req.user.accessToken) return res.status(401).json({ error: "Sesión de Microsoft expirada" });
        try {
          const updated = await renameMicrosoftItem(
            req.user.accessToken,
            req.user.refreshToken,
            req.user.id,
            folderIdParam,
            name
          );
          return res.status(200).json(updated);
        } catch (cloudErr: any) {
          console.error("❌ Error renombrar carpeta de Microsoft:", cloudErr.message || cloudErr);
          return res.status(500).json({ error: cloudErr.message || "Error al renombrar carpeta de Microsoft" });
        }
      }

      const folderId = Number(folderIdParam);
      if (Number.isNaN(folderId)) return res.status(400).json({ error: "ID de carpeta inválido" });

      const folder = await storage.getFolderById(folderId);
      if (!folder) return res.status(404).json({ error: "Carpeta no encontrada" });
      if (folder.userId !== req.user.id) return res.status(403).json({ error: "No autorizado" });

      const updatedFolder = await storage.updateFolderName(folderId, name);
      res.status(200).json(updatedFolder);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/folders/:id", requireAuth, async (req: any, res) => {
    try {
      const folderIdParam = req.params.id;

      if (!req.user.accessToken) {
        return res.status(401).json({ error: "Sesión de Microsoft expirada" });
      }

      await deleteMicrosoftItem(
        req.user.accessToken,
        req.user.refreshToken,
        req.user.id,
        folderIdParam
      );
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: "Eliminar carpeta",
        details: `Se eliminó una carpeta directamente de OneDrive.`
      });

      return res.status(204).end();
    } catch (e: any) {
      console.error("❌ Error al eliminar carpeta de Microsoft:", e.message || e);
      return res.status(500).json({ error: e.message || "Error al eliminar carpeta" });
    }
  });

  app.get("/api/folders/:id/content", requireAuth, async (req: any, res) => {
    try {
      const folderId = Number(req.params.id);
      const folder = await storage.getFolderById(folderId);
      if (!folder) {
        return res.status(404).json({ error: "Carpeta no encontrada" });
      }

      const pathFolders = await storage.getFolderPath(folderId);
      const subfolders = await storage.getSubfolders(folderId);
      const files = await storage.getFilesByFolder(folderId);

      res.json({ folder, path: pathFolders, folders: subfolders, files });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/folders/:id/download", requireAuth, async (req: any, res) => {
    try {
      const folderIdParam = req.params.id;
      const isMicrosoft = Number.isNaN(Number(folderIdParam));

      if (isMicrosoft) {
        if (!req.user.accessToken) return res.status(401).json({ error: "Sesión de Microsoft expirada" });

        const folderMetadata = await getMicrosoftItemMetadata(
          req.user.accessToken,
          req.user.refreshToken,
          req.user.id,
          folderIdParam
        );
        const filename = `${folderMetadata.name || "carpeta"}.zip`;
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.on("error", (err) => { throw err; });
        archive.pipe(res);

        const addMicrosoftFolderToArchive = async (currentFolderId: string, currentPath: string) => {
          const children = await getMicrosoftFolderChildren(
            req.user.accessToken,
            req.user.refreshToken,
            req.user.id,
            currentFolderId
          );

          for (const child of children) {
            if (child.folder) {
              await addMicrosoftFolderToArchive(child.id, `${currentPath}${child.name}/`);
              continue;
            }

            if (child.file) {
              let downloadUrl = child['@microsoft.graph.downloadUrl'];
              if (!downloadUrl) {
                downloadUrl = await getMicrosoftItemDownloadUrl(
                  req.user.accessToken,
                  req.user.refreshToken,
                  req.user.id,
                  child.id
                );
              }

              const fileResponse = await fetch(downloadUrl);
              if (!fileResponse.ok) {
                const errorText = await fileResponse.text();
                throw new Error(`Error al descargar archivo de Graph: ${errorText}`);
              }
              if (!fileResponse.body) {
                throw new Error("No se recibió stream del archivo de Graph");
              }

              archive.append(Readable.fromWeb(fileResponse.body as any), { name: `${currentPath}${child.name}` });
            }
          }
        };

        await addMicrosoftFolderToArchive(folderIdParam, `${folderMetadata.name}/`);
        await archive.finalize();
        return;
      }

      const folderId = Number(folderIdParam);
      if (Number.isNaN(folderId)) {
        return res.status(400).json({ error: "ID de carpeta inválido" });
      }

      const folder = await storage.getFolderById(folderId);
      if (!folder) {
        return res.status(404).json({ error: "Carpeta no encontrada" });
      }
      if (folder.userId !== req.user.id) {
        return res.status(403).json({ error: "No autorizado" });
      }

      const archive = archiver("zip", { zlib: { level: 9 } });
      const filename = `${folder.name || "carpeta"}.zip`;
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      archive.on("error", (err) => { throw err; });
      archive.pipe(res);

      const addFolderToArchive = async (currentFolderId: number, currentPath: string) => {
        const currentFolder = await storage.getFolderById(currentFolderId);
        if (!currentFolder) return;

        const files = await storage.getFilesByFolder(currentFolderId);
        for (const file of files) {
          const filePath = path.join(uploadsDir, file.filename);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: `${currentPath}${file.originalName}` });
          }
        }

        const subfolders = await storage.getSubfolders(currentFolderId);
        for (const subfolder of subfolders) {
          await addFolderToArchive(subfolder.id, `${currentPath}${subfolder.name}/`);
        }
      };

      await addFolderToArchive(folderId, `${folder.name}/`);
      await archive.finalize();
    } catch (e: any) {
      console.error("❌ Error al generar ZIP:", e.message);
      if (!res.headersSent) {
        res.status(500).json({ error: e.message });
      }
    }
  });

  app.get("/api/folders/:id/share", requireAuth, async (req: any, res) => {
    try {
      const folderIdParam = req.params.id;
      const isMicrosoft = Number.isNaN(Number(folderIdParam));

      if (isMicrosoft) {
        if (!req.user.accessToken) return res.status(401).json({ error: "Sesión de Microsoft expirada" });
        try {
          const shareLink = await createMicrosoftShareLink(
            req.user.accessToken,
            req.user.refreshToken,
            req.user.id,
            folderIdParam
          );
          return res.json({ shareLink });
        } catch (cloudErr: any) {
          console.error("❌ Error crear enlace de Microsoft:", cloudErr.message || cloudErr);
          return res.status(500).json({ error: cloudErr.message || "Error al crear el enlace de Microsoft" });
        }
      }

      const folderId = Number(folderIdParam);
      if (Number.isNaN(folderId)) {
        return res.status(400).json({ error: "ID de carpeta inválido" });
      }

      const folder = await storage.getFolderById(folderId);
      if (!folder) {
        return res.status(404).json({ error: "Carpeta no encontrada" });
      }
      if (folder.userId !== req.user.id) {
        return res.status(403).json({ error: "No autorizado" });
      }

      const origin = req.get("x-forwarded-proto")
        ? `${req.get("x-forwarded-proto")}://${req.get("host")}`
        : `${req.protocol}://${req.get("host")}`;

      res.json({
        shareLink: `${origin}/api/folders/${folderId}/download`,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============== ENDPOINTS PARA PROVEEDORES ==============
  app.get("/api/providers", requireAuth, async (req: any, res) => {
    try {
      const providers = await storage.getProviders();
      res.json(providers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/providers/:id", requireAuth, async (req: any, res) => {
    try {
      const providerId = Number(req.params.id);
      if (Number.isNaN(providerId)) {
        return res.status(400).json({ error: "ID de proveedor inválido" });
      }

      const provider = await storage.getProviderById(providerId);
      if (!provider) {
        return res.status(404).json({ error: "Proveedor no encontrado" });
      }

      res.json(provider);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/providers", requireAuth, async (req: any, res) => {
    try {
      const companyName = (req.body.companyName || "").trim();
      const businessActivity = (req.body.businessActivity || "").trim();
      const legalAddress = (req.body.legalAddress || "").trim();
      const rfc = (req.body.rfc || "").trim();
      const legalRepresentative = (req.body.legalRep || req.body.legalRepresentative || "").trim();
      const phone = (req.body.phone || "").trim();
      const email = (req.body.email || "").trim();
      const website = (req.body.website || "").trim();

      if (!companyName || !legalRepresentative || !phone || !email) {
        return res.status(400).json({ error: "Razón social, representante, teléfono y correo son obligatorios" });
      }

      const provider = await storage.createProvider({
        companyName,
        businessActivity,
        legalAddress,
        rfc,
        legalRepresentative,
        phone,
        email,
        website,
      });

      res.status(201).json(provider);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/providers/:id", requireAuth, async (req: any, res) => {
    try {
      const providerId = Number(req.params.id);
      if (Number.isNaN(providerId)) {
        return res.status(400).json({ error: "ID de proveedor inválido" });
      }

      const updateData: any = {};
      if (req.body.companyName !== undefined) {
        updateData.companyName = req.body.companyName.trim();
      }
      if (req.body.legalRepresentative !== undefined) {
        updateData.legalRepresentative = req.body.legalRepresentative.trim();
      }
      if (req.body.phone !== undefined) {
        updateData.phone = req.body.phone.trim();
      }
      if (req.body.email !== undefined) {
        updateData.email = req.body.email.trim();
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "Debe proporcionar al menos un campo para actualizar" });
      }

      const updated = await storage.updateProvider(providerId, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Proveedor no encontrado" });
      }

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/providers/:id", requireAuth, async (req: any, res) => {
    try {
      const providerId = Number(req.params.id);
      if (Number.isNaN(providerId)) {
        return res.status(400).json({ error: "ID de proveedor inválido" });
      }

      const provider = await storage.getProviderById(providerId);
      if (!provider) {
        return res.status(404).json({ error: "Proveedor no encontrado" });
      }

      await storage.deleteProvider(providerId);
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============== GESTIÓN DE PDFS Y COTIZACIONES (CORREGIDO) ==============
  app.get("/api/quotes", requireAuth, async (req: any, res) => {
    try {
      const quotes = await storage.getQuotes();
      const enriched = await Promise.all(quotes.map(async quote => {
        const items = await storage.getQuoteItems(quote.id);
        const totalCents = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const total = fromCents(totalCents);
        return {
          ...quote,
          folio: quote.internalFolio,
          empresaDestino: quote.destinationCompany,
          total,
          totalText: amountToSpanishText(total),
          requisitionNumber: quote.requisitionNumber,
          projectTitle: quote.projectTitle,
          validityDays: quote.validityDays,
          paymentDays: quote.paymentDays,
          deliveryTime: quote.deliveryTime,
          manufacturingTime: quote.manufacturingTime,
          guaranteeMonths: quote.guaranteeMonths,
          compliancePercentage: quote.compliancePercentage,
          deliveryPlace: quote.deliveryPlace,
          contactPerson: quote.contactPerson,
        };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/quotes/:id", requireAuth, async (req: any, res) => {
    try {
      const quoteId = Number(req.params.id);
      if (Number.isNaN(quoteId)) {
        return res.status(400).json({ error: "ID de cotización inválido" });
      }

      const quote = await storage.getQuoteById(quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      const rawItems = await storage.getQuoteItems(quoteId);
      const lineItems = convertQuoteItemsFromDb(rawItems);
      const totalCents = rawItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const total = fromCents(totalCents);

      res.json({
        quote: {
          ...quote,
          folio: quote.internalFolio,
          empresaDestino: quote.destinationCompany,
          total,
          totalText: amountToSpanishText(total),
          requisitionNumber: quote.requisitionNumber,
          projectTitle: quote.projectTitle,
          validityDays: quote.validityDays,
          paymentDays: quote.paymentDays,
          deliveryTime: quote.deliveryTime,
          manufacturingTime: quote.manufacturingTime,
          guaranteeMonths: quote.guaranteeMonths,
          compliancePercentage: quote.compliancePercentage,
          deliveryPlace: quote.deliveryPlace,
          contactPerson: quote.contactPerson,
        },
        lineItems,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 🚀 CORREGIDO: Se limpian los márgenes manuales para respetar el resguardo CSS nativo de Azal
  app.get("/api/quotes/:id/pdf", requireAuth, async (req: any, res) => {
    try {
      const quoteId = Number(req.params.id);
      if (Number.isNaN(quoteId)) {
        return res.status(400).json({ error: "ID de cotización inválido" });
      }

      const quote = await storage.getQuoteById(quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      if (!quote.providerId) {
        return res.status(404).json({ error: "Proveedor no encontrado" });
      }
      const provider = await storage.getProviderById(Number(quote.providerId));
      if (!provider) {
        return res.status(404).json({ error: "Proveedor no encontrado" });
      }

      const rawItems = await storage.getQuoteItems(quoteId);
      const lineItems = convertQuoteItemsFromDb(rawItems);

      const totalCents = rawItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const total = fromCents(totalCents);
      const totalText = amountToSpanishText(total);

      const html = generateQuoteHTML({
        ...quote,
        folio: quote.internalFolio,
        destinationCompany: quote.destinationCompany,
        totalText: totalText 
      }, provider, lineItems);

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      const page = await browser.newPage();
      
      await page.setContent(html, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }, // Se limpia para activar el margin @page del CSS
        preferCSSPageSize: true
      });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Cotizacion_${quote.internalFolio}.pdf"`);
      
      res.send(Buffer.from(pdfBuffer));

      await storage.createAuditLog({
        correo: req.user.correo || req.user.email || null,
        action: "Generar PDF de cotización",
        details: `Se generó el PDF para la cotización ${quote.internalFolio}`
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/quotes/:id/pdf/save", requireAuth, async (req: any, res) => {
    try {
      const quoteId = Number(req.params.id);
      if (Number.isNaN(quoteId)) {
        return res.status(400).json({ error: "ID de cotización inválido" });
      }

      const { folderId } = req.body;
      if (!folderId || typeof folderId !== 'string') {
        return res.status(400).json({ error: "El folderId es obligatorio" });
      }

      const isMicrosoftId = Number.isNaN(Number(folderId));
      if (!isMicrosoftId) {
        return res.status(400).json({ error: "ID de carpeta de OneDrive inválido" });
      }

      const quote = await storage.getQuoteById(quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      if (!quote.providerId) {
        return res.status(404).json({ error: "Proveedor no encontrado" });
      }

      const provider = await storage.getProviderById(Number(quote.providerId));
      if (!provider) {
        return res.status(404).json({ error: "Proveedor no encontrado" });
      }

      const rawItems = await storage.getQuoteItems(quoteId);
      const lineItems = convertQuoteItemsFromDb(rawItems);
      const totalCents = rawItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const total = fromCents(totalCents);
      const totalText = amountToSpanishText(total);

      const quoteWithText = {
        ...quote,
        folio: quote.internalFolio,
        destinationCompany: quote.destinationCompany,
        totalText,
      };

      const pdfBuffer = await generateQuotePdfBuffer(quoteWithText, provider, lineItems);
      const fileName = buildQuotePdfFileName(quoteWithText);

      const uploadResult = await uploadFileToGraph(
        req.user.accessToken,
        req.user.refreshToken,
        req.user.id,
        pdfBuffer,
        fileName,
        'application/pdf',
        folderId
      );

      await storage.createAuditLog({
        correo: req.user.correo || req.user.email || null,
        action: "Guardar PDF de cotización en carpeta",
        details: `Se guardó el PDF ${fileName} en la carpeta de OneDrive ${folderId}`
      });

      return res.status(200).json({
        success: true,
        fileName,
        savedTo: folderId,
        uploadResult,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/quotes/price-history", requireAuth, async (req: any, res) => {
    try {
      const description = String(req.query.description || req.query.material || "").trim();
      if (!description) {
        return res.status(400).json({ error: "El campo description es requerido" });
      }

      const history = await storage.getQuotePriceHistory(description);
      const normalizedHistory = history.map(item => ({
        ...item,
        unitPrice: fromCents(Number(item.unitPrice) || 0),
        amount: fromCents(Number(item.amount) || 0),
      }));
      res.json(normalizedHistory);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/quotes", requireAuth, async (req: any, res) => {
    try {
      const internalFolio = (req.body.internalFolio || req.body.folio || "").toString().trim();
      const destinationCompany = (req.body.destinationCompany || req.body.empresaDestino || "").toString().trim();
      const requisitionNumber = (req.body.requisitionNumber || req.body.requisicion || "").toString().trim();
      const projectTitle = (req.body.projectTitle || req.body.proyecto || "").toString().trim();
      const quoteDate = (req.body.quoteDate || req.body.fecha || "").toString().trim();
      const commercialTerms = (req.body.commercialTerms || req.body.condiciones || "").toString().trim();
      const validityDaysRaw = Number(req.body.validityDays ?? req.body.diasValidez ?? 120);
      const paymentDaysRaw = Number(req.body.paymentDays ?? req.body.diasPago ?? 0);
      const deliveryTime = (req.body.deliveryTime || req.body.tiempoEntrega || "").toString().trim();
      const manufacturingTime = (req.body.manufacturingTime || req.body.tiempoFabricacion || "").toString().trim();
      const guaranteeMonthsRaw = Number(req.body.guaranteeMonths ?? req.body.garantiaMeses ?? 0);
      const compliancePercentageRaw = Number(req.body.compliancePercentage ?? req.body.porcentajeCumplimiento ?? 0);
      const deliveryPlace = (req.body.deliveryPlace || req.body.lugarEntrega || "").toString().trim();
      const contactPerson = (req.body.contactPerson || req.body.contacto || req.body.personaContacto || "").toString().trim();
      const providerId = Number(req.body.providerId || req.body.proveedorId);
      const lineItems = Array.isArray(req.body.lineItems || req.body.partidas) ? (req.body.lineItems || req.body.partidas) : [];

      const goodsOrigin = (req.body.goodsOrigin || "").toString().trim();
      const providerNationality = (req.body.providerNationality || "").toString().trim();
      const complianceWarranty = Number(req.body.complianceWarranty) || 0;
      const experienceYears = Number(req.body.experienceYears) || 0;
      const specialtyYears = Number(req.body.specialtyYears) || 0;
      const similarContracts = Number(req.body.similarContracts) || 0;
      const bankName = (req.body.bankName || "").toString().trim();
      const bankAccount = (req.body.bankAccount || "").toString().trim();
      const bankBeneficiary = (req.body.bankBeneficiary || "").toString().trim();

      const validityDays = Number.isFinite(validityDaysRaw) && Number.isInteger(validityDaysRaw) && validityDaysRaw > 0 ? validityDaysRaw : 120;
      const paymentDays = Number.isFinite(paymentDaysRaw) && Number.isInteger(paymentDaysRaw) && paymentDaysRaw >= 0 ? paymentDaysRaw : 0;
      const guaranteeMonths = Number.isFinite(guaranteeMonthsRaw) && Number.isInteger(guaranteeMonthsRaw) && guaranteeMonthsRaw >= 0 ? guaranteeMonthsRaw : 0;
      const compliancePercentage = Number.isFinite(compliancePercentageRaw) && compliancePercentageRaw >= 0 ? compliancePercentageRaw : 0;

      if (!internalFolio || !destinationCompany || !requisitionNumber || !projectTitle || !quoteDate || !commercialTerms || !deliveryPlace || !contactPerson || Number.isNaN(providerId)) {
        return res.status(400).json({ error: "Todos los campos principales de la cotización son requeridos." });
      }

      const provider = await storage.getProviderById(providerId);
      if (!provider) {
        return res.status(400).json({ error: "El proveedor especificado no existe" });
      }

      const validation = validateQuoteItems(lineItems);
      if (validation.errors.length > 0) {
        return res.status(400).json({ error: validation.errors.join("; ") });
      }

      const quote = await storage.createQuote({
        internalFolio,
        destinationCompany,
        requisitionNumber,
        projectTitle,
        quoteDate,
        commercialTerms,
        validityDays,
        paymentDays,
        deliveryTime,
        manufacturingTime,
        guaranteeMonths,
        compliancePercentage: compliancePercentage.toFixed(2),
        deliveryPlace,
        contactPerson,
        providerId,
        goodsOrigin,
        providerNationality,
        complianceWarranty,
        experienceYears,
        specialtyYears,
        similarContracts,
        bankName,
        bankAccount,
        bankBeneficiary
      });

      const createdItems = [];
      for (let i = 0; i < validation.normalizedItems.length; i++) {
        const item = validation.normalizedItems[i];
        const rawItem = lineItems[i]; 
        
        const createdItem = await storage.createQuoteItem({
          quoteId: quote.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitMeasure: item.unitMeasure,
          techRequirements: item.techRequirements,
          versionReference: item.versionReference,
          reqDate: (rawItem.reqDate || "").toString().trim(),
          unitPrice: item.unitPriceCents,
          amount: item.amountCents,
        });
        createdItems.push(convertQuoteItemFromDb(createdItem));
      }

      const total = fromCents(validation.totalCents);
      res.status(201).json({
        quote: {
          ...quote,
          folio: quote.internalFolio,
          empresaDestino: quote.destinationCompany,
          total,
          totalText: amountToSpanishText(total),
        },
        lineItems: createdItems,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/files/:id/share", requireAuth, async (req: any, res) => {
    try {
      const fileIdParam = req.params.id;
      const isMicrosoft = Number.isNaN(Number(fileIdParam));

      if (isMicrosoft) {
        if (!req.user.accessToken) return res.status(401).json({ error: "Sesión de Microsoft expirada" });
        const shareLink = await createMicrosoftShareLink(
          req.user.accessToken,
          req.user.refreshToken,
          req.user.id,
          fileIdParam
        );
        return res.json({ shareLink });
      }

      const fileId = Number(fileIdParam);
      if (Number.isNaN(fileId)) {
        return res.status(400).json({ error: "ID de archivo inválido" });
      }

      const file = await storage.getFileById(fileId);
      if (!file) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }

      const folder = await storage.getFolderById(file.folderId);
      if (!folder || (folder.userId !== req.user.id && !req.user.isAdmin)) {
        return res.status(403).json({ error: "No autorizado" });
      }

      const origin = req.get("x-forwarded-proto")
        ? `${req.get("x-forwarded-proto")}://${req.get("host")}`
        : `${req.protocol}://${req.get("host")}`;

      res.json({
        shareLink: `${origin}/api/files/${fileId}/download`,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/files/:id/version", requireAuth, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const fileIdParam = req.params.id;
      const isMicrosoft = Number.isNaN(Number(fileIdParam));

      if (isMicrosoft) {
        if (!req.user.accessToken) return res.status(401).json({ error: "Sesión de Microsoft expirada" });

        const updatedFile = await updateMicrosoftItemContent(
          req.user.accessToken,
          req.user.refreshToken,
          req.user.id,
          fileIdParam,
          req.file.buffer,
          req.file.mimetype
        );

        return res.status(200).json(updatedFile);
      }

      const fileId = Number(fileIdParam);
      if (Number.isNaN(fileId)) {
        return res.status(400).json({ error: "ID de archivo inválido" });
      }

      const file = await storage.getFileById(fileId);
      if (!file) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }
      if (file.uploadedBy !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ error: "No autorizado" });
      }

      const newFilename = `${Date.now()}-${req.file.originalname}`;
      const destinationPath = path.join(uploadsDir, newFilename);
      await fs.promises.writeFile(destinationPath, req.file.buffer);

      const oldPath = path.join(uploadsDir, file.filename);
      if (file.filename !== newFilename && fs.existsSync(oldPath)) {
        await fs.promises.unlink(oldPath).catch(() => null);
      }

      const [updatedFile] = await db
        .update(files)
        .set({
          filename: newFilename,
          mimeType: req.file.mimetype,
          size: req.file.size,
          uploadedAt: new Date(),
          version: (file.version || 1) + 1,
        })
        .where(eq(files.id, fileId))
        .returning();

      res.status(200).json(updatedFile || {});
    } catch (e: any) {
      console.error("❌ Error replacing file:", e.message);
      res.status(500).json({ error: e.message || "Error al reemplazar el archivo" });
    }
  });

  app.delete("/api/files/:id", requireAuth, async (req: any, res) => {
    try {
      const fileIdParam = req.params.id;

      if (!req.user.accessToken) {
        return res.status(401).json({ error: "Sesión de Microsoft expirada" });
      }

      await deleteMicrosoftItem(
        req.user.accessToken,
        req.user.refreshToken,
        req.user.id,
        fileIdParam
      );

      await storage.createAuditLog({
        userId: req.user.id,
        correo: req.user.correo || req.user.email || null,
        action: "Eliminar archivo",
        details: `Se eliminó un archivo directamente de OneDrive.`
      });

      return res.status(204).end();
    } catch (e: any) {
      console.error("❌ Error al eliminar archivo de Microsoft:", e.message || e);
      return res.status(500).json({ error: e.message || "Error al eliminar archivo" });
    }
  });

  app.post("/api/files/upload", requireAuth, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      
      const user = req.user;
      const relativePath = req.body.relativePath || ""; 
      const parentId = req.body.folderId || req.body.parentId; 
      
      const contractId = (req.body.contractId || "").trim();
      const supplier = (req.body.supplier || "").trim();
      
      const originalName = req.file.originalname;
      let finalFileName = originalName;
      
      if (contractId || supplier) {
        const safeContract = contractId || "SinID";
        const safeSupplier = supplier || "SinCliente";
        finalFileName = `[${safeContract}] [${safeSupplier}] ${originalName}`;
      }

      const targetPath = relativePath ? relativePath.replace(originalName, finalFileName) : finalFileName;

      const result = await uploadFileToGraph(
        user.accessToken,
        user.refreshToken,
        user.id,
        req.file.buffer,
        targetPath,
        req.file.mimetype,
        parentId
      );

      await storage.createAuditLog({
          correo: user.correo || null,
          action: "Subida nube",
          details: `Archivo subido: ${finalFileName}`
      });

      res.json(result);
    } catch (e: any) {
      console.error("❌ Error en subida:", e.message);
      res.status(500).json({ error: e.message || "Error al subir el archivo" });
    }
  });

  app.get("/api/files/:id/download", requireAuth, async (req: any, res) => {
    try {
      const fileIdParam = req.params.id;
      if (!req.user.accessToken) return res.status(401).json({ error: "Sesión de Microsoft expirada" });

      const response = await getMicrosoftItemContentStream(
        req.user.accessToken,
        req.user.refreshToken,
        req.user.id,
        fileIdParam
      );

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }

      if (!response.body) {
        return res.status(500).json({ error: "No se recibió contenido de Microsoft" });
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const contentDisposition = response.headers.get("content-disposition");
      res.setHeader("Content-Type", contentType);
      if (contentDisposition) {
        res.setHeader("Content-Disposition", contentDisposition);
      }

      await pipeline(response.body, res);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/files/:id/preview", requireAuth, async (req: any, res) => {
    try {
      const fileIdParam = req.params.id;
      if (!req.user.accessToken) return res.status(401).json({ error: "Sesión expirada" });

      const response = await getMicrosoftItemContentStream(
        req.user.accessToken,
        req.user.refreshToken,
        req.user.id,
        fileIdParam
      );

      if (!response.ok) return res.status(response.status).json({ error: await response.text() });
      if (!response.body) return res.status(500).json({ error: "Sin contenido" });

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="preview"`);

      await pipeline(response.body, res);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/files/:id/edit-office", requireAuth, async (req: any, res) => {
    try {
      const fileIdParam = req.params.id;
      if (!req.user.accessToken) return res.status(401).json({ error: "Sesión expirada" });

      const metadata = await getMicrosoftItemMetadata(
        req.user.accessToken,
        req.user.refreshToken,
        req.user.id,
        fileIdParam
      );

      if (metadata.webUrl) {
        return res.redirect(metadata.webUrl);
      }
      res.status(404).json({ error: "No se encontró el enlace web del archivo" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/files/:id/embed", requireAuth, async (req: any, res) => {
    try {
      const fileIdParam = req.params.id;
      if (!req.user.accessToken) return res.status(401).json({ error: "Sesión expirada" });

      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileIdParam}/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.getUrl) {
        return res.redirect(data.getUrl);
      }

      res.status(404).json({ error: "No se pudo generar la vista previa nativa" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.get("/api/files", async (_req, res) => {
    try {
      const lista = await storage.getAllFiles();
      res.json(lista || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/debug/files", async (_req, res) => {
    try {
      const localFiles = await storage.getAllFiles();
      res.json({
        count: localFiles.length,
        files: localFiles.map(f => ({
          id: f.id,
          originalName: f.originalName,
          uploadedAt: f.uploadedAt,
          isDeleted: f.isDeleted, 
          size: f.size
        }))
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/microsoft-files", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;

      if (!accessToken || !refreshToken) {
        return res.status(401).json({ error: "No access token or refresh token available" });
      }

      const microsoftFiles = await getMicrosoftFiles(accessToken, refreshToken, user.id);
      res.json(microsoftFiles || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/microsoft-folders", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;

      if (!accessToken || !refreshToken) {
        return res.status(401).json({ error: "No access token or refresh token available" });
      }

      const microsoftFolders = await getMicrosoftFolders(accessToken, refreshToken, user.id);
      res.json(microsoftFolders || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/microsoft-folders/:id/content", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const folderId = req.params.id;

      if (!user?.accessToken) {
        return res.status(401).json({ error: "No access token" });
      }

      const data = await getMicrosoftFolderContent(user.accessToken, user.refreshToken, user.id, folderId);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/microsoft-folders", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;
      const folderName = req.body?.name;
      const parentId = req.body?.parentId;

      if (!accessToken || !refreshToken) {
        return res.status(401).json({ error: "No access token or refresh token available" });
      }

      if (!folderName || typeof folderName !== 'string' || !folderName.trim()) {
        return res.status(400).json({ error: "El nombre de la carpeta es obligatorio" });
      }

      const createdFolder = await createMicrosoftFolder(
        accessToken,
        refreshToken,
        user.id,
        folderName.trim(),
        parentId
      );
      res.status(201).json(createdFolder);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error interno al crear carpeta en OneDrive' });
    }
  });

  app.get("/api/files-all", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;

      const cursor = req.query.cursor as string; 
      let localFiles: any[] = [];
      
      if (!cursor) {
        try { localFiles = await storage.getAllFiles(); } catch(e) {}
      }

      let microsoftData = { files: [], nextLink: null };

      if (accessToken && refreshToken) {
        microsoftData = await getMicrosoftFilesPaginated(accessToken, refreshToken, user.id, cursor);
      }

      res.json({
        files: [...localFiles, ...microsoftData.files],
        nextCursor: microsoftData.nextLink
      });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/microsoft-quota", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;
      const userId = user?.id;

      if (!accessToken) {
        return res.status(401).json({ error: "No access token available" });
      }

      const quota = await getMicrosoftQuota(accessToken, refreshToken, userId);
      res.json(quota);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/dashboard", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;
      const userId = user?.id;

      const microsoftFiles = accessToken && refreshToken
        ? await getMicrosoftFiles(accessToken, refreshToken, userId)
        : [];

      const quota = accessToken
        ? await getMicrosoftQuota(accessToken, refreshToken, userId)
        : { used: 0, total: 5 * 1024 * 1024 * 1024 };

      const fileCount = microsoftFiles.length;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const recentFiles = microsoftFiles
        .filter((file: any) => {
           const fileDate = new Date(file.createdDateTime || file.lastModifiedDateTime || 0);
           return fileDate >= sevenDaysAgo;
        })
        .sort((a: any, b: any) => {
           const dateA = new Date(a.lastModifiedDateTime || a.createdDateTime || 0).getTime();
           const dateB = new Date(b.lastModifiedDateTime || b.createdDateTime || 0).getTime();
           return dateB - dateA;
        })
        .slice(0, 10)
        .map((item: any) => {
          const fecha = item.createdDateTime || item.lastModifiedDateTime || new Date().toISOString();
          return {
            id: item.id,
            name: item.name,
            size: item.size || 0,
            uploadedAt: fecha,
            lastModifiedDateTime: fecha,
            type: item.file?.mimeType || 'application/octet-stream',
            mimeType: item.file?.mimeType || 'application/octet-stream',
            webUrl: item.webUrl,
          };
        });

      const storageUsed = quota.used || 0;
      const storageTotal = quota.total || 5 * 1024 * 1024 * 1024;
      const usagePercent = storageTotal > 0 ? Math.round((storageUsed / storageTotal) * 100) : 0;

      res.json({
        fileCount,
        storageUsed,
        storageTotal,
        usagePercent,
        recentFiles,
      });
    } catch (e: any) {
      res.json({
        fileCount: 0,
        storageUsed: 0,
        storageTotal: 5 * 1024 * 1024 * 1024,
        usagePercent: 0,
        recentFiles: [],
      });
    }
  });

  app.get("/api/backup", requireAuth, async (req: any, res) => {
    try {
      const { range, start, end } = req.query;
      const user = req.user;

      if (!user?.accessToken) {
        return res.status(401).json({ error: "Sesión de Microsoft expirada" });
      }

      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      if (range === "week") {
        startDate = startOfWeek(now, { weekStartsOn: 1 });
      } else if (range === "month") {
        startDate = startOfMonth(now);
      } else if (range === "year") {
        startDate = startOfYear(now);
      } else if (range === "lastYear") {
        startDate = startOfYear(subYears(now, 1));
        endDate = endOfYear(subYears(now, 1));
      } else if (range === "custom") {
        if (!start || !end) return res.status(400).json({ error: "Fechas inválidas" });
        startDate = new Date(start as string);
        endDate = new Date(end as string);
        endDate.setHours(23, 59, 59, 999);
      } else {
        return res.status(400).json({ error: "Rango inválido" });
      }

      const allFiles = await getMicrosoftFiles(user.accessToken, user.refreshToken, user.id);

      const filesToBackup = allFiles.filter((file: any) => {
        const fileDate = new Date(file.createdDateTime || file.lastModifiedDateTime || 0);
        return fileDate >= startDate && fileDate <= endDate;
      });

      if (filesToBackup.length === 0) {
        return res.status(404).json({ error: "No se encontraron archivos en este rango de fechas" });
      }

      const archive = archiver("zip", { zlib: { level: 9 } });
      const filename = `Respaldo_${range}.zip`;
      
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      archive.on("error", (err) => { throw err; });
      archive.pipe(res);

      for (const file of filesToBackup) {
        let downloadUrl = file['@microsoft.graph.downloadUrl'];
        if (!downloadUrl) {
          downloadUrl = await getMicrosoftItemDownloadUrl(
            user.accessToken,
            user.refreshToken,
            user.id,
            file.id
          );
        }

        const fileRes = await fetch(downloadUrl);
        if (fileRes.ok && fileRes.body) {
          archive.append(Readable.fromWeb(fileRes.body as any), { name: file.name });
        }
      }

      await archive.finalize();

      await storage.createAuditLog({
        userId: user.id,
        correo: user.correo || user.email || user.username || req.user?.correo || req.user?.email || null,
        action: "Respaldo generado",
        details: `Se generó un respaldo de ${filesToBackup.length} archivos (Rango: ${range}).`
      });

    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Error interno al generar el respaldo" });
      }
    }
  });

  app.get("/api/audit-logs", requireAuth, async (req: any, res) => {
    try {
      const logs = await storage.getRecentAuditLogs(100);
      res.json(logs || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/stats", requireAuth, async (req: any, res) => {
    try {
      const licitaciones = await storage.getLicitaciones();
      const logs = await storage.getRecentAuditLogs(100);
      res.json({
        totalLicitaciones: licitaciones.length,
        totalLogs: logs.length,
        ultimaActividad: logs[0]?.createdAt || new Date(),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- LICITACIONES ---
  app.get("/api/licitaciones", async (_req, res) => {
    const lista = await storage.getLicitaciones();
    res.json(lista || []);
  });

  app.post("/api/licitaciones", async (req, res) => {
    try {
      const data = insertLicitacionSchema.parse(req.body);
      const nueva = await storage.createLicitacion(data);
      res.status(201).json(nueva);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  return httpServer;
}