/**
 * Integración con Microsoft Graph API
 */

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Microsoft credentials or refresh token');
  }
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) throw new Error(`Token refresh failed: ${response.status}`);
  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
  };
}

async function fetchWithTokenRefresh(
  url: string,
  accessToken: string,
  refreshToken?: string,
  userId?: number,
  init: RequestInit = {},
) {
  let currentToken = accessToken;
  const request = async (token: string): Promise<Response> => {
    return await fetch(url, {
      ...init,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
  };

  let response = await request(currentToken);
  if (response.status !== 401 || !refreshToken || userId == null) {
    return { response, accessToken: currentToken };
  }

  const newTokens = await refreshAccessToken(refreshToken);
  currentToken = newTokens.accessToken;
  const { storage } = await import("./storage");
  await storage.updateUserTokens(userId, newTokens.accessToken, newTokens.refreshToken);

  response = await request(currentToken);
  return { response, accessToken: currentToken };
}

export async function uploadFileToGraph(
  accessToken: string,
  refreshToken: string,
  userId: number,
  fileBuffer: Buffer,
  targetPath: string,
  mimeType: string,
  parentId?: string 
) {
  try {
    let currentToken = accessToken;
    
    const isRoot = !parentId || parentId === "undefined" || parentId === "NaN" || parentId === "root";
    
    // 🛡️ CORRECCIÓN: Codificamos el parentId para proteger el ID
    const baseEndpoint = isRoot ? `root` : `items/${encodeURIComponent(parentId!)}`;
      
    const url = `https://graph.microsoft.com/v1.0/me/drive/${baseEndpoint}:/${encodeURIComponent(targetPath)}:/content`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': mimeType,
      },
      body: fileBuffer,
    });

    if (response.status === 401 && refreshToken) {
      const refreshed = await refreshAccessToken(refreshToken);
      const { storage } = await import("./storage");
      await storage.updateUserTokens(userId, refreshed.accessToken, refreshed.refreshToken);
      return uploadFileToGraph(refreshed.accessToken, refreshed.refreshToken, userId, fileBuffer, targetPath, mimeType, parentId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      // 👈 Devolvemos el error real
      throw new Error(`Error Graph (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error en uploadFileToGraph:', error);
    throw error;
  }
}

export async function getMicrosoftFiles(accessToken: string, refreshToken: string, userId: number) {
  let currentToken = accessToken;
  let url: string | null = "https://graph.microsoft.com/v1.0/me/drive/root/delta?$select=id,name,file,deleted,size,createdDateTime,lastModifiedDateTime,webUrl&$top=500";
  const totalFiles: any[] = [];
  while (url) {
    const { response, accessToken: t } = await fetchWithTokenRefresh(url, currentToken, refreshToken, userId);
    currentToken = t;
    if (!response.ok) break;
    const data = await response.json();
    totalFiles.push(...(data.value || []).filter((item: any) => item.file && !item.deleted));
    url = data['@odata.nextLink'] || null;
  }
  return totalFiles;
}

export async function getMicrosoftFolders(accessToken: string, refreshToken: string, userId: number) {
  let currentToken = accessToken;
  const { response } = await fetchWithTokenRefresh('https://graph.microsoft.com/v1.0/me/drive/root/children?$top=100', currentToken, refreshToken, userId);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.value || []).filter((item: any) => item.folder).map((item: any) => ({
    id: item.id,
    name: item.name,
    createdAt: item.createdDateTime || new Date().toISOString(),
    source: 'microsoft',
    webUrl: item.webUrl,
  }));
}

export async function createMicrosoftFolder(
  accessToken: string, 
  refreshToken: string, 
  userId: number, 
  folderName: string,
  parentId?: string
) {
  // 📂 Identificamos si va a la raíz o a una subcarpeta
  const isRoot = !parentId || parentId === "undefined" || parentId === "NaN" || parentId === "root";
  
  // 🛡️ Mantenemos la codificación del ID para que el signo "!" no rompa la URL (Esto es vital)
  const url = isRoot
    ? `https://graph.microsoft.com/v1.0/me/drive/root/children`
    : `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(parentId!)}/children`;

  // 📦 Solo enviamos lo estrictamente necesario
  const payload: any = { 
    name: folderName, 
    folder: {}, 
    '@microsoft.graph.conflictBehavior': 'rename' 
  };

  // 👇 ELIMINAMOS la inyección del parentReference que causaba el conflicto (redundancia)

  const { response } = await fetchWithTokenRefresh(url, accessToken, refreshToken, userId, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error Graph (${response.status}): ${errorText}`); 
  }
  
  const data = await response.json();
  return { id: data.id, name: data.name, source: 'microsoft', webUrl: data.webUrl };
}

export async function getMicrosoftQuota(accessToken: string, refreshToken?: string, userId?: number) {
  const { response } = await fetchWithTokenRefresh('https://graph.microsoft.com/v1.0/me/drive', accessToken, refreshToken, userId);
  if (!response.ok) return { used: 0, total: 0 };
  const data = await response.json();
  return { used: data.quota?.used || 0, total: data.quota?.total || 0 };
}

export async function getMicrosoftFilesPaginated(accessToken: string, refreshToken: string, userId: number, nextLink?: string) {
  const url = nextLink || "https://graph.microsoft.com/v1.0/me/drive/root/delta?$select=id,name,size,file,createdDateTime,lastModifiedDateTime,webUrl,createdBy,deleted&$top=100";
  const { response } = await fetchWithTokenRefresh(url, accessToken, refreshToken, userId);
  if (!response.ok) return { files: [], nextLink: null };
  const data = await response.json();
  const transformed = (data.value || []).filter((item: any) => item.file && !item.deleted).map((item: any) => ({
    id: item.id,
    originalName: item.name,
    size: item.size || 0,
    uploadedAt: item.createdDateTime || new Date().toISOString(),
    mimeType: item.file?.mimeType || 'application/octet-stream',
    source: 'microsoft',
  }));
  return { files: transformed, nextLink: data['@odata.nextLink'] || null };
}

export async function getMicrosoftFolderContent(accessToken: string, refreshToken: string, userId: number, folderId: string) {
  const meta = await fetchWithTokenRefresh(`https://graph.microsoft.com/v1.0/me/drive/items/${folderId}`, accessToken, refreshToken, userId);
  
  // 🛡️ Obligamos a Microsoft a devolver 'description' usando $select
  const childrenUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$select=id,name,description,size,file,folder,createdDateTime,lastModifiedDateTime,createdBy,webUrl`;
  const children = await fetchWithTokenRefresh(childrenUrl, meta.accessToken, refreshToken, userId);
  
  const folderData = await meta.response.json();
  const items = (await children.response.json()).value || [];
  
  return {
    folder: { id: folderData.id, name: folderData.name, source: "microsoft" },
    path: [{ id: "root", name: "Carpetas" }, { id: folderData.id, name: folderData.name }],
    
    folders: items.filter((i: any) => i.folder).map((i: any) => ({ 
      id: i.id, 
      name: i.name, 
      source: "microsoft",
      createdAt: i.createdDateTime || new Date().toISOString(),
      creatorName: i.createdBy?.user?.displayName || "Propietario",
      size: i.size || 0
    })),
    
    // 🚀 CORRECCIÓN: Separador inteligente de Metadatos
    files: items.filter((i: any) => i.file).map((i: any) => {
      let contractId = "—";
      let supplier = "—";
      let displayFileName = i.name;
      
      // Busca el patrón exacto: "[ID] [Cliente] NombreDelArchivo.pdf"
      const metaRegex = /^\[(.*?)\]\s\[(.*?)\]\s(.*)$/;
      const match = i.name.match(metaRegex);

      if (match) {
        contractId = match[1] === "SinID" ? "—" : match[1];
        supplier = match[2] === "SinCliente" ? "—" : match[2];
        displayFileName = match[3]; // El nombre limpio para la interfaz
      }

      return {
        id: i.id,
        originalName: displayFileName, // Mostramos el nombre limpio en la tabla
        size: i.size,
        source: "microsoft",
        uploadedAt: i.createdDateTime || new Date().toISOString(),
        mimeType: i.file?.mimeType || 'application/octet-stream',
        uploaderName: i.createdBy?.user?.displayName || "Propietario",
        contractId,
        supplier
      };
    })
  };
}

export async function updateMicrosoftItemDescription(
  accessToken: string,
  refreshToken: string,
  userId: number,
  itemId: string,
  description: string,
  retries = 3 // 👈 Sistema de reintentos automático
) {
  const url = `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`;
  
  for (let i = 0; i < retries; i++) {
    const { response } = await fetchWithTokenRefresh(url, accessToken, refreshToken, userId, {
      method: 'PATCH',
      body: JSON.stringify({ description }),
    });
    
    if (response.ok) {
      return; // Éxito total
    }
    
    // Si falla (ej. OneDrive está escaneando el archivo en busca de virus), esperamos 2s y reintentamos
    await new Promise(res => setTimeout(res, 2000));
  }
  console.error(`❌ Error Graph guardando metadatos después de ${retries} intentos.`);
}