import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import archiver from "archiver";
import multer from "multer";
import puppeteer from "puppeteer";
import { storage } from "./storage";
import { getTemplateForProvider } from "./templates/manager";
import {
  validateQuoteItems,
  amountToSpanishText,
  fromCents,
  convertQuoteItemFromDb,
  convertQuoteItemsFromDb
} from "./quotes";
import { insertLicitacionSchema, files } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import "isomorphic-fetch";
import { getMicrosoftFiles, 
        getMicrosoftQuota, 
        getMicrosoftFolders, 
        createMicrosoftFolder, 
        getMicrosoftFolderContent,
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

//  FUNCIÓN MAESTRA: INYECCIÓN DE IMÁGENES AL BORDE DE LA HOJA
async function generateQuotePdfBuffer(quote: any, provider: any, lineItems: any[]) {
  const safeParse = (val: string | null | undefined): any[] => {
    try { return JSON.parse(val || "[]"); } catch { return []; }
  };

  const enrichedQuote = {
    ...quote,
    folio: quote.internalFolio,
    destinationCompany: quote.destinationCompany,
    totalText: quote.totalText,
    qualityGuarantees: quote.qualityGuarantees || safeParse(quote.qualityGuaranteesJson),
    selectedSocialObjects: quote.selectedSocialObjects || safeParse(quote.selectedSocialObjectsJson),
    deliveryLocations: quote.deliveryLocations || safeParse(quote.deliveryLocationsJson),
    deliveryConditions: quote.deliveryConditions || safeParse(quote.deliveryConditionsJson),
  };

  const html = getTemplateForProvider(provider, enrichedQuote, lineItems);
  const companyName = (provider.companyName || "").toUpperCase();
  const proposalType = (quote.proposalType || "").toLowerCase();
  const isAzal = !companyName.includes("DEMA") && !companyName.includes("HERMAL") && !companyName.includes("HGW") && !companyName.includes("HYH");
  const isHgw  = companyName.includes("HGW");
  const isDema = companyName.includes("DEMA") && proposalType === "servicios";

  // Carga de Assets
  let headerBase64 = '', footerBase64 = '', hgwBgBase64 = '', headerHGWBase64 = '', footerHGWBase64 = '';
  
  if (isAzal) {
    if (fs.existsSync(path.join(process.cwd(), 'server', 'assets', 'encabezado.png'))) 
        headerBase64 = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), 'server', 'assets', 'encabezado.png')).toString('base64')}`;
    if (fs.existsSync(path.join(process.cwd(), 'server', 'assets', 'pie.png'))) 
        footerBase64 = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), 'server', 'assets', 'pie.png')).toString('base64')}`;
  }

  // LÓGICA PARA DEMA SERVICIOS: Encabezado y Pie
  let demaHeaderBase64 = '';
  let demaFooterBase64 = '';
  if (isDema) {
    const demaHeaderPath = path.join(process.cwd(), 'server', 'assets', 'encabezado-DEMA.png');
    if (fs.existsSync(demaHeaderPath)) {
      demaHeaderBase64 = `data:image/png;base64,${fs.readFileSync(demaHeaderPath).toString('base64')}`;
    }
    const demaFooterPath = path.join(process.cwd(), 'server', 'assets', 'Pie_pagina_DEMA.png');
    if (fs.existsSync(demaFooterPath)) {
      demaFooterBase64 = `data:image/png;base64,${fs.readFileSync(demaFooterPath).toString('base64')}`;
    }
  }

  // 🚀 LÓGICA PARA HGW: Encabezado y Pie separados
  let hgwHeaderBase64 = '';
  let hgwFooterBase64 = '';
  if (isHgw) {
    const hgwHeaderPath = path.join(process.cwd(), 'server', 'assets', 'encabezado-hgw.png');
    if (fs.existsSync(hgwHeaderPath)) {
      hgwHeaderBase64 = `data:image/png;base64,${fs.readFileSync(hgwHeaderPath).toString('base64')}`;
    }

    const hgwFooterPath = path.join(process.cwd(), 'server', 'assets', 'pie-hgw.png');
    if (fs.existsSync(hgwFooterPath)) {
      hgwFooterBase64 = `data:image/png;base64,${fs.readFileSync(hgwFooterPath).toString('base64')}`;
    }
  }

  const isHermal = companyName.includes("HERMAL");
  let hermalHeaderBase64 = '';
  let hermalFooterBase64 = '';
  if (isHermal) {
    const hermalHeaderPath = path.join(process.cwd(), 'server', 'assets', 'encabezado-hermal.png');
    if (fs.existsSync(hermalHeaderPath)) hermalHeaderBase64 = `data:image/png;base64,${fs.readFileSync(hermalHeaderPath).toString('base64')}`;

    const hermalFooterPath = path.join(process.cwd(), 'server', 'assets', 'pie-hermal.png');
    if (fs.existsSync(hermalFooterPath)) hermalFooterBase64 = `data:image/png;base64,${fs.readFileSync(hermalFooterPath).toString('base64')}`;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const pdfOptions: any = {
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false
    };

    if (isAzal) {
      pdfOptions.displayHeaderFooter = true;
      pdfOptions.headerTemplate = `
        <style>html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }</style>
        <div style="position: absolute; top: 0; left: 0; width: 100%; z-index: -1;">
          ${headerBase64 ? `<img src="${headerBase64}" style="width: 100%; display: block;" />` : ''}
        </div>
      `;
      pdfOptions.footerTemplate = `
        <style>html, body { margin: 0; padding: 0; }</style>
        <div style="position: absolute; bottom: 0; left: 0; width: 100%; margin: 0; padding: 0; display: flex; justify-content: center; align-items: flex-end; -webkit-print-color-adjust: exact;">
          ${footerBase64 ? `<img src="${footerBase64}" style="width: 100%; height: auto; display: block;" />` : ''}
        </div>
      `;
      pdfOptions.margin = { top: '190px', right: '0px', bottom: '150px', left: '0px'};
    
    } else if (isHgw) {
      pdfOptions.displayHeaderFooter = true;
      
      // 🚀 ENCABEZADO HGW (Borde a Borde sin espacios blancos)
      pdfOptions.headerTemplate = `
        <style>
          html, body { margin: 0 !important; padding: 0 !important; width: 100%; height: 100%; -webkit-print-color-adjust: exact; }
        </style>
        <div style="position: absolute; top: 0; left: 0; width: 100vw; margin: 0; padding: 0; display: flex; align-items: flex-start; justify-content: flex-start;">
          ${hgwHeaderBase64 ? `<img src="${hgwHeaderBase64}" style="width: 100vw; display: block; margin: 0; padding: 0;" />` : ''}
        </div>
      `;
      
      // 🚀 PIE DE PÁGINA HGW (Borde a Borde sin espacios blancos)
      pdfOptions.footerTemplate = `
        <style>
          html, body { margin: 0 !important; padding: 0 !important; width: 100%; height: 100%; font-family: 'Arial Narrow', Arial, sans-serif; -webkit-print-color-adjust: exact; font-size: 9pt; }
        </style>
        <div style="position: absolute; bottom: 0; left: 0; width: 100vw; margin: 0; padding: 0; display: flex; flex-direction: column; justify-content: flex-end;">
          
          ${hgwFooterBase64 ? `<img src="${hgwFooterBase64}" style="width: 100vw; display: block; margin: 0; padding: 0; position: absolute; bottom: 0; left: 0; z-index: -1;" />` : ''}
          
          <div style="position: relative; width: 100%; padding: 0 45px 35px 45px; box-sizing: border-box; display: flex; justify-content: space-between; align-items: flex-end;">
             <div style="line-height: 1.4; color: #000000;">
               hgw@hgwprocessolutions.com<br>
               Av. Jorge Jiménez Cantú No. Ext. 1, No. Int. 124, Valle Escondido, 52937, Atizapán de Zaragoza, Estado de México<br>
               Teléfonos: 56 1080 9920 – 55 4556 6367
             </div>
             <div style="text-align: right; font-weight: bold; color: #000000;">
               Página <span class="pageNumber"></span> de <span class="totalPages"></span>
             </div>
          </div>
        </div>
      `;
      
      // 🚀 MÁRGENES FÍSICOS (Protegen tu texto para que no toque las imágenes)
      pdfOptions.margin = { top: '190px', right: '0px', bottom: '150px', left: '0px' };

    } else if (isDema) {
      pdfOptions.displayHeaderFooter = true;
      pdfOptions.headerTemplate = `
        <style>html, body { margin: 0 !important; padding: 0 !important; width: 100%; -webkit-print-color-adjust: exact; }</style>
        <div style="position: absolute; top: 0; left: 0; width: 100vw; margin: 0; padding: 0;">
          ${demaHeaderBase64 ? `<img src="${demaHeaderBase64}" style="width: 100vw; display: block;" />` : ''}
        </div>
      `;
      pdfOptions.footerTemplate = `
        <style>html, body { margin: 0 !important; padding: 0 !important; width: 100%; -webkit-print-color-adjust: exact; }</style>
        <div style="position: absolute; bottom: 0; left: 0; width: 100vw; margin: 0; padding: 0;">
          ${demaFooterBase64 ? `<img src="${demaFooterBase64}" style="width: 100vw; display: block;" />` : ''}
        </div>
      `;
      pdfOptions.margin = { top: '190px', right: '0px', bottom: '150px', left: '0px' };

      pdfOptions.margin = { top: '190px', right: '0px', bottom: '150px', left: '0px' };  

    } else if (isHermal) {
      pdfOptions.displayHeaderFooter = true;
      
      // 🚀 ENCABEZADO HERMAL (Borde a Borde sin espacios blancos)
      pdfOptions.headerTemplate = `
        <style>
          html, body { margin: 0 !important; padding: 0 !important; width: 100%; height: 100%; -webkit-print-color-adjust: exact; }
        </style>
        <div style="position: absolute; top: 0; left: 0; width: 100vw; margin: 0; padding: 0; display: flex; align-items: flex-start; justify-content: flex-start;">
          ${hermalHeaderBase64 ? `<img src="${hermalHeaderBase64}" style="width: 100vw; display: block; margin: 0; padding: 0;" />` : ''}
        </div>
      `;
      
      // 🚀 PIE DE PÁGINA HERMAL (Borde a Borde con paginador)
      pdfOptions.footerTemplate = `
        <style>
          html, body { margin: 0 !important; padding: 0 !important; width: 100%; height: 100%; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; font-size: 9pt; }
        </style>
        <div style="position: absolute; bottom: 0; left: 0; width: 100vw; margin: 0; padding: 0; display: flex; flex-direction: column; justify-content: flex-end;">
          
          ${hermalFooterBase64 ? `<img src="${hermalFooterBase64}" style="width: 100vw; display: block; margin: 0; padding: 0; position: absolute; bottom: 0; left: 0; z-index: -1;" />` : ''}
          
          <div style="position: relative; width: 100%; padding: 0 45px 35px 45px; box-sizing: border-box; display: flex; justify-content: flex-end; align-items: flex-end;">
             <div style="text-align: right; font-weight: bold; color: #000000;">
               Página <span class="pageNumber"></span> de <span class="totalPages"></span>
             </div>
          </div>
        </div>
      `;
      
      // 🚀 MÁRGENES FÍSICOS PARA HERMAL
      pdfOptions.margin = { top: '230px', right: '0px', bottom: '150px', left: '0px' };  
    
    } else {
      pdfOptions.displayHeaderFooter = false;
      pdfOptions.margin = { top: '0px', bottom: '0px', right: '0px', left: '0px' };
    } 

    // 2. GENERACIÓN FINAL
    const pdfBuffer = await page.pdf(pdfOptions);
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

  const tipo = quote.proposalType ? `${quote.proposalType.toUpperCase()}-` : ''; 
  
  const safeCliente = sanitizeFileName(cliente);
  const safeFolio = sanitizeFileName(folio);
  const safeFecha = sanitizeFileName(fecha);
  
  const filename = `COT-${tipo}${safeFolio}_${safeCliente}${safeFecha ? `_${safeFecha}` : ''}.pdf`;
  return filename.replace(/__+/g, '_');
}

export async function registerRoutes(app: Express, httpServer: Server): Promise<Server> {

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
      const isMicrosoft = Number.isNaN(Number(folderIdParam));

      if (isMicrosoft) {
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
          details: `Se eliminó una carpeta directamente de OneDrive.`,
        });

        return res.status(204).end();
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

      await storage.deleteFolder(folderId);
      await storage.createAuditLog({
        userId: req.user.id,
        action: "Eliminar carpeta",
        details: `Se eliminó la carpeta local "${folder.name}" y su contenido.`,
      });

      return res.status(204).end();
    } catch (e: any) {
      console.error("❌ Error al eliminar carpeta:", e.message || e);
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
              const fileResponse = await getMicrosoftItemContentStream(
                req.user.accessToken,
                req.user.refreshToken,
                req.user.id,
                child.id
              );
              if (!fileResponse.ok) {
                const errorText = await fileResponse.text();
                throw new Error(`Error al descargar ${child.name} (${fileResponse.status}): ${errorText}`);
              }
              if (!fileResponse.body) {
                throw new Error(`Sin contenido para ${child.name}`);
              }
              const buffer = Buffer.from(await fileResponse.arrayBuffer());
              archive.append(buffer, { name: `${currentPath}${child.name}` });
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

      const bankName = (req.body.bankName || "").trim();
      const bankAccount = (req.body.bankAccount || "").trim();
      const bankBeneficiary = (req.body.bankBeneficiary || "").trim();

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
        bankName,
        bankAccount,
        bankBeneficiary,
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

  // ============== GESTIÓN DE PDFS Y COTIZACIONES ==============
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
          companyOrigin: quote.companyOrigin,
          proposalType: quote.proposalType,
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
      console.error("Error en GET /api/quotes:", e);
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

      const safeParse = (val: string | null | undefined): any[] => {
        try { return JSON.parse(val || "[]"); } catch { return []; }
      };

      res.json({
        quote: {
          ...quote,
          folio: quote.internalFolio,
          empresaDestino: quote.destinationCompany,
          total,
          totalText: amountToSpanishText(total),
          qualityGuarantees: safeParse(quote.qualityGuaranteesJson),
          selectedSocialObjects: safeParse(quote.selectedSocialObjectsJson),
          deliveryLocations: safeParse(quote.deliveryLocationsJson),
          deliveryDates: safeParse(quote.deliveryDatesJson),
          deliveryConditions: safeParse(quote.deliveryConditionsJson),
          hasRegionalMilitary: quote.hasRegionalMilitary ?? false,
          warrantyPercentageApplies: quote.warrantyPercentageApplies ?? false,
          warrantyPercentage: Number(quote.warrantyPercentage) || 0,
          deliveryNotes: quote.deliveryNotes ?? "",
          requiredDocuments: safeParse(quote.requiredDocumentsJson),
          normsTable: safeParse(quote.normsTableJson),
          serviceNormsTable: safeParse(quote.serviceNormsTableJson),
        },
        lineItems,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

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
      
      let parsedGuarantees = [];
      let parsedObjetos = [];
      
      try {
        if (quote.qualityGuaranteesJson) {
          parsedGuarantees = JSON.parse(quote.qualityGuaranteesJson);
        }
        if (quote.socialObjectsJson) {
          parsedObjetos = JSON.parse(quote.socialObjectsJson);
        }
      } catch (parseError) {
        console.error("Error parseando arreglos JSON desde la BD:", parseError);
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

      const totalCents = rawItems.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      const totalText = amountToSpanishText(fromCents(totalCents));

      const quoteWithText = {
        ...quote,
        folio: quote.internalFolio,
        destinationCompany: quote.destinationCompany,
        totalText: totalText,
        parsedGuarantees: parsedGuarantees, 
        parsedObjetos: parsedObjetos 
      };

      const pdfBuffer = await generateQuotePdfBuffer(quoteWithText, provider, lineItems);
      const filename = buildQuotePdfFileName(quoteWithText);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
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
      
      const contactPerson = (req.body.contactPerson || req.body.contacto || req.body.personaContacto || req.body.attnNombre || req.body.nombre || "").toString().trim();
      
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

      const empresaId = req.body.empresaId ? Number(req.body.empresaId) : providerId;
      const templateName = (req.body.templateName || "azal_official").toString().trim();
      const companyOrigin = (req.body.companyOrigin || "AZAL").toString().trim();
      const proposalType = (req.body.proposalType || "bienes").toString().trim();

      const attnDia = (req.body.attnDia || "").toString().trim();
      const attnMes = (req.body.attnMes || "").toString().trim();
      const attnAnio = (req.body.attnAnio || "").toString().trim();
      const attnLugar = (req.body.attnLugar || "").toString().trim();
      const attnGrado = (req.body.attnGrado || "").toString().trim();
      const attnNombre = (req.body.attnNombre || "").toString().trim();
      const attnDependencia = (req.body.attnDependencia || "").toString().trim();
      const attnArea = (req.body.attnArea || "").toString().trim();
      const attnUbicacion = (req.body.attnUbicacion || "").toString().trim();
      const attnDireccion = (req.body.attnDireccion || "").toString().trim();
      const attnCargo = (req.body.attnCargo || "").toString().trim();
      const attnContacto = (req.body.attnContacto || "").toString().trim();
      const paymentTerms = (req.body.paymentTerms || "").toString().trim();
      const hasManufacturingTime = req.body.hasManufacturingTime === true || req.body.hasManufacturingTime === "true";
      const deliverySingleVal = req.body.deliverySingle !== false && req.body.deliverySingle !== "false";
      
      const deliveryLocationsJson = JSON.stringify(Array.isArray(req.body.deliveryLocations) ? req.body.deliveryLocations : []);
      const qualityGuaranteesJson = JSON.stringify(Array.isArray(req.body.qualityGuarantees) ? req.body.qualityGuarantees : []);
      const selectedSocialObjectsJson = JSON.stringify(Array.isArray(req.body.selectedSocialObjects) ? req.body.selectedSocialObjects : []);
      
      const deliveryDatesJson = JSON.stringify(Array.isArray(req.body.deliveryDates) ? req.body.deliveryDates : []);
      const deliveryConditionsJson = JSON.stringify(Array.isArray(req.body.deliveryConditions) ? req.body.deliveryConditions : []);
      const requiredDocumentsJson = JSON.stringify(Array.isArray(req.body.requiredDocuments) ? req.body.requiredDocuments : []);
      const normsTableJson = JSON.stringify(Array.isArray(req.body.normsTable) ? req.body.normsTable : []);
      const serviceNormsTableJson = JSON.stringify(Array.isArray(req.body.serviceNormsTable) ? req.body.serviceNormsTable : []);

      const hasRegionalMilitary = req.body.hasRegionalMilitary === true || req.body.hasRegionalMilitary === "true";
      const warrantyPercentageApplies = req.body.warrantyPercentageApplies === true || req.body.warrantyPercentageApplies === "true";
      const warrantyPercentage = Number(req.body.warrantyPercentage) || 0;
      const deliveryNotes = (req.body.deliveryNotes || "").toString().trim();

      const validityDays = Number.isFinite(validityDaysRaw) && Number.isInteger(validityDaysRaw) && validityDaysRaw > 0 ? validityDaysRaw : 120;
      const paymentDays = Number.isFinite(paymentDaysRaw) && Number.isInteger(paymentDaysRaw) && paymentDaysRaw >= 0 ? paymentDaysRaw : 0;
      const guaranteeMonths = Number.isFinite(guaranteeMonthsRaw) && Number.isInteger(guaranteeMonthsRaw) && guaranteeMonthsRaw >= 0 ? guaranteeMonthsRaw : 0;
      const compliancePercentage = Number.isFinite(compliancePercentageRaw) && compliancePercentageRaw >= 0 ? compliancePercentageRaw : 0;

      if (!internalFolio || Number.isNaN(providerId)) {
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
        bankBeneficiary,
        empresaId,
        templateName,
        companyOrigin,
        proposalType,
        attnDia,
        attnMes,
        attnAnio,
        attnLugar,
        attnGrado,
        attnArea,
        attnUbicacion,
        attnDireccion,
        attnCargo,
        attnContacto,
        paymentTerms,
        hasManufacturingTime,
        deliverySingle: deliverySingleVal,
        deliveryLocationsJson,
        qualityGuaranteesJson,
        selectedSocialObjectsJson,
        deliveryDatesJson,
        deliveryConditionsJson,
        requiredDocumentsJson,
        normsTableJson,
        serviceNormsTableJson,
        hasRegionalMilitary,
        warrantyPercentageApplies,
        warrantyPercentage: warrantyPercentage.toFixed(2),
        deliveryNotes,
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
          supplier: item.supplier,
          purchaseCost: item.purchaseCost ? String(item.purchaseCost) : "0",
          profitMargin: item.profitMargin ? String(item.profitMargin) : "0",
          profitFactor: item.profitFactor ? String(item.profitFactor) : "1",
          noPartida: (rawItem.noPartida || "").toString().trim(),
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

  app.delete("/api/quotes/:id", requireAuth, async (req: any, res) => {
    try {
      const quoteId = Number(req.params.id);
      if (Number.isNaN(quoteId)) {
        return res.status(400).json({ error: "ID de cotización inválido" });
      }

      const quote = await storage.getQuoteById(quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      await storage.deleteQuote(quoteId);

      await storage.createAuditLog({
        correo: req.user.correo || req.user.email || null,
        action: "Eliminar cotización",
        details: `Se eliminó la cotización ${quote.internalFolio}`
      });

      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/quotes/:id", requireAuth, async (req: any, res) => {
    try {
      const quoteId = Number(req.params.id);
      if (Number.isNaN(quoteId)) {
        return res.status(400).json({ error: "ID de cotización inválido" });
      }

      const existing = await storage.getQuoteById(quoteId);
      if (!existing) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      const destinationCompany = (req.body.destinationCompany || existing.destinationCompany).toString().trim();
      const requisitionNumber = (req.body.requisitionNumber || existing.requisitionNumber).toString().trim();
      const projectTitle = (req.body.projectTitle || existing.projectTitle).toString().trim();
      const quoteDate = (req.body.quoteDate || existing.quoteDate).toString().trim();
      const commercialTerms = (req.body.commercialTerms || existing.commercialTerms).toString().trim();
      const validityDaysRaw = Number(req.body.validityDays ?? existing.validityDays);
      const paymentDaysRaw = Number(req.body.paymentDays ?? existing.paymentDays);
      const deliveryTime = (req.body.deliveryTime ?? existing.deliveryTime ?? "").toString().trim();
      const manufacturingTime = (req.body.manufacturingTime ?? existing.manufacturingTime ?? "").toString().trim();
      const guaranteeMonthsRaw = Number(req.body.guaranteeMonths ?? existing.guaranteeMonths ?? 0);
      const compliancePercentageRaw = Number(req.body.compliancePercentage ?? existing.compliancePercentage ?? 0);
      const deliveryPlace = (req.body.deliveryPlace || existing.deliveryPlace || "").toString().trim();
      
      // 🚀 AQUÍ ESTÁ LA MAGIA 2: Hacemos lo mismo para el PATCH
      const contactPerson = (req.body.contactPerson || req.body.attnNombre || req.body.nombre || existing.contactPerson || "").toString().trim();
      
      const providerId = Number(req.body.providerId ?? existing.providerId);
      const goodsOrigin = (req.body.goodsOrigin ?? existing.goodsOrigin ?? "").toString().trim();
      const providerNationality = (req.body.providerNationality ?? existing.providerNationality ?? "").toString().trim();
      const complianceWarranty = Number(req.body.complianceWarranty ?? existing.complianceWarranty) || 0;
      const experienceYears = Number(req.body.experienceYears ?? existing.experienceYears) || 0;
      const specialtyYears = Number(req.body.specialtyYears ?? existing.specialtyYears) || 0;
      const similarContracts = Number(req.body.similarContracts ?? existing.similarContracts) || 0;
      const bankName = (req.body.bankName ?? existing.bankName ?? "").toString().trim();
      const bankAccount = (req.body.bankAccount ?? existing.bankAccount ?? "").toString().trim();
      const bankBeneficiary = (req.body.bankBeneficiary ?? existing.bankBeneficiary ?? "").toString().trim();
      const empresaId = Number(req.body.empresaId ?? existing.empresaId ?? existing.providerId);
      const templateName = (req.body.templateName || existing.templateName || "azal_official").toString().trim();
      const companyOrigin = (req.body.companyOrigin || existing.companyOrigin || "AZAL").toString().trim();
      const proposalType = (req.body.proposalType || existing.proposalType || "bienes").toString().trim();

      const attnDia = (req.body.attnDia ?? existing.attnDia ?? "").toString().trim();
      const attnMes = (req.body.attnMes ?? existing.attnMes ?? "").toString().trim();
      const attnAnio = (req.body.attnAnio ?? existing.attnAnio ?? "").toString().trim();
      const attnLugar = (req.body.attnLugar ?? existing.attnLugar ?? "").toString().trim();
      const attnGrado = (req.body.attnGrado ?? existing.attnGrado ?? "").toString().trim();
      const attnArea = (req.body.attnArea ?? existing.attnArea ?? "").toString().trim();
      const attnUbicacion = (req.body.attnUbicacion ?? existing.attnUbicacion ?? "").toString().trim();
      const attnDireccion = (req.body.attnDireccion ?? existing.attnDireccion ?? "").toString().trim();
      const attnCargo = (req.body.attnCargo ?? existing.attnCargo ?? "").toString().trim();
      const attnContacto = (req.body.attnContacto ?? existing.attnContacto ?? "").toString().trim();
      const paymentTerms = (req.body.paymentTerms ?? existing.paymentTerms ?? "").toString().trim();
      const hasManufacturingTime = req.body.hasManufacturingTime !== undefined
        ? (req.body.hasManufacturingTime === true || req.body.hasManufacturingTime === "true")
        : (existing.hasManufacturingTime ?? false);
      const deliverySingleVal = req.body.deliverySingle !== undefined
        ? (req.body.deliverySingle !== false && req.body.deliverySingle !== "false")
        : (existing.deliverySingle ?? true);
      const deliveryLocationsJson = Array.isArray(req.body.deliveryLocations)
        ? JSON.stringify(req.body.deliveryLocations)
        : (existing.deliveryLocationsJson ?? "[]");
      const qualityGuaranteesJson = Array.isArray(req.body.qualityGuarantees)
        ? JSON.stringify(req.body.qualityGuarantees)
        : (existing.qualityGuaranteesJson ?? "[]");
      const selectedSocialObjectsJson = Array.isArray(req.body.selectedSocialObjects)
        ? JSON.stringify(req.body.selectedSocialObjects)
        : (existing.selectedSocialObjectsJson ?? "[]");
      const deliveryDatesJson = Array.isArray(req.body.deliveryDates)
        ? JSON.stringify(req.body.deliveryDates)
        : (existing.deliveryDatesJson ?? "[]");
      const deliveryConditionsJson = Array.isArray(req.body.deliveryConditions)
        ? JSON.stringify(req.body.deliveryConditions)
        : (existing.deliveryConditionsJson ?? "[]");
      const requiredDocumentsJson = Array.isArray(req.body.requiredDocuments)
        ? JSON.stringify(req.body.requiredDocuments)
        : (existing.requiredDocumentsJson ?? "[]");
      const normsTableJson = Array.isArray(req.body.normsTable)
        ? JSON.stringify(req.body.normsTable)
        : (existing.normsTableJson ?? "[]");
      const serviceNormsTableJson = Array.isArray(req.body.serviceNormsTable)
        ? JSON.stringify(req.body.serviceNormsTable)
        : (existing.serviceNormsTableJson ?? "[]");

      const hasRegionalMilitary = req.body.hasRegionalMilitary !== undefined
        ? (req.body.hasRegionalMilitary === true || req.body.hasRegionalMilitary === "true")
        : (existing.hasRegionalMilitary ?? false);
      const warrantyPercentageApplies = req.body.warrantyPercentageApplies !== undefined
        ? (req.body.warrantyPercentageApplies === true || req.body.warrantyPercentageApplies === "true")
        : (existing.warrantyPercentageApplies ?? false);
      const warrantyPercentage = req.body.warrantyPercentage !== undefined
        ? Number(req.body.warrantyPercentage) || 0
        : Number(existing.warrantyPercentage) || 0;
      const deliveryNotes = req.body.deliveryNotes !== undefined
        ? (req.body.deliveryNotes || "").toString().trim()
        : (existing.deliveryNotes ?? "");

        

      const lineItemsRaw = Array.isArray(req.body.lineItems) ? req.body.lineItems : [];

      if (Number.isNaN(providerId)) {
        return res.status(400).json({ error: "Todos los campos principales de la cotización son requeridos." });
      }

      const validityDays = Number.isFinite(validityDaysRaw) && validityDaysRaw > 0 ? Math.round(validityDaysRaw) : 120;
      const paymentDays = Number.isFinite(paymentDaysRaw) && paymentDaysRaw >= 0 ? Math.round(paymentDaysRaw) : 0;
      const guaranteeMonths = Number.isFinite(guaranteeMonthsRaw) && guaranteeMonthsRaw >= 0 ? Math.round(guaranteeMonthsRaw) : 0;
      const compliancePercentage = Number.isFinite(compliancePercentageRaw) && compliancePercentageRaw >= 0 ? compliancePercentageRaw : 0;

      await storage.updateQuote(quoteId, {
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
        bankBeneficiary,
        empresaId,
        templateName,
        companyOrigin,
        proposalType,
        attnDia,
        attnMes,
        attnAnio,
        attnLugar,
        attnGrado,
        attnArea,
        attnUbicacion,
        attnDireccion,
        attnCargo,
        attnContacto,
        paymentTerms,
        hasManufacturingTime,
        deliverySingle: deliverySingleVal,
        deliveryLocationsJson,
        qualityGuaranteesJson,
        selectedSocialObjectsJson,
        deliveryDatesJson,
        deliveryConditionsJson,
        requiredDocumentsJson,
        normsTableJson,
        serviceNormsTableJson,
        hasRegionalMilitary,
        warrantyPercentageApplies,
        warrantyPercentage: warrantyPercentage.toFixed(2),
        deliveryNotes,
      });

      let resultItems: any[] = [];
      let totalCents = 0;

      if (lineItemsRaw.length > 0) {
        const validation = validateQuoteItems(lineItemsRaw);
        if (validation.errors.length > 0) {
          return res.status(400).json({ error: validation.errors.join("; ") });
        }
        totalCents = validation.totalCents;

        await storage.deleteQuoteItems(quoteId);

        for (let i = 0; i < validation.normalizedItems.length; i++) {
          const item = validation.normalizedItems[i];
          const rawItem = lineItemsRaw[i];
          const created = await storage.createQuoteItem({
            quoteId,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitMeasure: item.unitMeasure,
            techRequirements: item.techRequirements,
            versionReference: item.versionReference,
            reqDate: (rawItem.reqDate || "").toString().trim(),
            unitPrice: item.unitPriceCents,
            amount: item.amountCents,
            supplier: item.supplier,
            purchaseCost: item.purchaseCost ? String(item.purchaseCost) : "0",
            profitMargin: item.profitMargin ? String(item.profitMargin) : "0",
            profitFactor: item.profitFactor ? String(item.profitFactor) : "1",
            noPartida: (rawItem.noPartida || "").toString().trim(),
          });
          resultItems.push(convertQuoteItemFromDb(created));
        }
      } else {
        const rawItems = await storage.getQuoteItems(quoteId);
        resultItems = convertQuoteItemsFromDb(rawItems);
        totalCents = rawItems.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      }

      const total = fromCents(totalCents);
      const updatedQuote = await storage.getQuoteById(quoteId);

      await storage.createAuditLog({
        correo: req.user.correo || req.user.email || null,
        action: "Actualizar cotización",
        details: `Se actualizó la cotización ${existing.internalFolio}`,
      });

      return res.status(200).json({
        quote: {
          ...updatedQuote,
          folio: updatedQuote?.internalFolio,
          empresaDestino: updatedQuote?.destinationCompany,
          total,
          totalText: amountToSpanishText(total),
        },
        lineItems: resultItems,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/templates/:empresa", requireAuth, async (req, res) => {
    try {
      const empresaKey = req.params.empresa.toUpperCase().trim();
      const config = TEMPLATE_CONFIGS[empresaKey];

      if (!config) {
        return res.status(404).json({ 
          error: `La empresa '${empresaKey}' no se encuentra registrada en el clúster dinámico de plantillas.` 
        });
      }

      return res.json({
        empresa: empresaKey,
        template_name: config.templateName,
        config: {
          header: true,
          footer: true,
          colors: {
            primary: config.primaryColor
          },
          friendlyName: config.friendlyName
        }
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

  app.patch("/api/files/:id", requireAuth, async (req: any, res) => {
    try {
      const fileIdParam = req.params.id;
      const name = (req.body.name || "").trim();
      if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });

      const isMicrosoft = Number.isNaN(Number(fileIdParam));
      if (isMicrosoft) {
        if (!req.user.accessToken) return res.status(401).json({ error: "Sesión de Microsoft expirada" });
        try {
          const updated = await renameMicrosoftItem(
            req.user.accessToken,
            req.user.refreshToken,
            req.user.id,
            fileIdParam,
            name
          );
          return res.status(200).json(updated);
        } catch (cloudErr: any) {
          console.error("❌ Error renombrar archivo de Microsoft:", cloudErr.message || cloudErr);
          return res.status(500).json({ error: cloudErr.message || "Error al renombrar archivo de Microsoft" });
        }
      }

      const fileId = Number(fileIdParam);
      if (Number.isNaN(fileId)) return res.status(400).json({ error: "ID de archivo inválido" });

      const file = await storage.getFileById(fileId);
      if (!file) return res.status(404).json({ error: "Archivo no encontrado" });
      if (file.uploadedBy !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: "No autorizado" });

      const [updatedFile] = await db
        .update(files)
        .set({ originalName: name })
        .where(eq(files.id, fileId))
        .returning();

      await storage.createAuditLog({
        userId: req.user.id,
        correo: req.user.correo || req.user.email || null,
        action: "Renombrar archivo",
        details: `Se renombró el archivo local "${file.originalName}" a "${name}".`,
      });

      return res.status(200).json(updatedFile || {});
    } catch (e: any) {
      console.error("❌ Error al renombrar archivo:", e.message || e);
      res.status(500).json({ error: e.message || "Error al renombrar archivo" });
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
        const fileRes = await getMicrosoftItemContentStream(
          user.accessToken,
          user.refreshToken,
          user.id,
          file.id
        );
        if (fileRes.ok && fileRes.body) {
          const buffer = Buffer.from(await fileRes.arrayBuffer());
          archive.append(buffer, { name: file.name });
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

 
  // Ruta para guardar el PDF en una carpeta específica (Soporta OneDrive y Local)

  app.post("/api/quotes/:id/pdf/save", requireAuth, async (req: any, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { folderId } = req.body;

      if (!folderId) {
        return res.status(400).json({ error: "Debe seleccionar una carpeta" });
      }

      // Obtener datos necesarios para el PDF
      const quote = await storage.getQuoteById(quoteId);
      if (!quote || !quote.providerId) {
        return res.status(404).json({ error: "Cotización o proveedor no encontrado" });
      }

      const provider = await storage.getProviderById(Number(quote.providerId));
      const rawItems = await storage.getQuoteItems(quoteId);
      const lineItems = convertQuoteItemsFromDb(rawItems);

      // 🚀 CALCULAMOS EL TOTAL Y EL TEXTO EN LETRAS PARA QUE LA PLANTILLA NO TRUENE
      const totalCents = rawItems.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      const totalText = amountToSpanishText(fromCents(totalCents));

      const quoteWithText = {
        ...quote,
        totalText: totalText
      };

      // Generar el buffer del PDF y un buen nombre de archivo con la data enriquecida
      const pdfBuffer = await generateQuotePdfBuffer(quoteWithText, provider, lineItems);
      const filename = buildQuotePdfFileName(quoteWithText);

      // Saber si la carpeta es de Microsoft (tiene letras) o local (solo números)
      const isMicrosoft = Number.isNaN(Number(folderId));

      if (isMicrosoft) {
        // ☁️ SUBIR A ONEDRIVE
        if (!req.user.accessToken) {
          return res.status(401).json({ error: "Sesión de Microsoft expirada" });
        }
        
        await uploadFileToGraph(
          req.user.accessToken,
          req.user.refreshToken,
          req.user.id,
          pdfBuffer,
          filename,
          "application/pdf",
          folderId
        );

        return res.status(200).json({ success: true, fileName: filename });
      } else {
        // 💻 GUARDAR EN BASE DE DATOS LOCAL
        const newFile = await storage.createFile({
          filename: filename,
          originalName: filename,
          mimeType: "application/pdf",
          size: pdfBuffer.length,
          folderId: parseInt(folderId),
          uploadedBy: req.user.id
        });

        return res.status(200).json({ success: true, fileName: newFile.filename });
      }
    } catch (error: any) {
      console.error("Error al guardar en carpeta:", error);
      return res.status(500).json({ error: "Error al guardar PDF: " + error.message });
    }
  });

  return httpServer;
}
