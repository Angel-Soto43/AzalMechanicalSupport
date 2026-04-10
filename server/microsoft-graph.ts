/**
 * Integración con Microsoft Graph API para obtener archivos del usuario
 * Documentación: https://learn.microsoft.com/en-us/graph/api/overview
 */

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Microsoft credentials or refresh token');
  }

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Sometimes refresh token is not returned
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
  const defaultHeaders = {
    Authorization: `Bearer ${currentToken}`,
    'Content-Type': 'application/json',
  };

  const request = async (): Promise<Response> => {
    return await fetch(url, {
      ...init,
      headers: {
        ...defaultHeaders,
        ...(init.headers || {}),
      },
    });
  };

  let response = await request();
  if (response.status !== 401 || !refreshToken || userId == null) {
    return { response, accessToken: currentToken };
  }

  const newTokens = await refreshAccessToken(refreshToken);
  currentToken = newTokens.accessToken;
  const { storage } = await import("./storage");
  await storage.updateUserTokens(userId, newTokens.accessToken, newTokens.refreshToken);

  response = await fetch(url, {
    ...init,
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${currentToken}`,
      ...(init.headers || {}),
    },
  });

  return { response, accessToken: currentToken };
}

export async function getMicrosoftFiles(accessToken: string, refreshToken: string, userId: number) {
  try {
    console.log('🔍 Obteniendo lista rápida de archivos (Máx 200)...');
    let currentToken = accessToken;

    // 🚀 Búsqueda de 1 sola petición, limitada a 200 archivos para no ahogar el navegador
    const url = "https://graph.microsoft.com/v1.0/me/drive/root/search(q='')?filter=file ne null&$top=200";

    const { response, accessToken: tokenUsed } = await fetchWithTokenRefresh(url, currentToken, refreshToken, userId);

    if (!response.ok) {
      console.error('❌ Error de Microsoft:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.value || [];

    const transformed = content.map((item: any) => ({
      id: item.id,
      originalName: item.name,
      size: item.size || 0,
      uploadedAt: item.createdDateTime || item.lastModifiedDateTime || new Date().toISOString(),
      mimeType: item.file?.mimeType || 'application/octet-stream',
      webUrl: item.webUrl,
      source: 'microsoft',
      // 📧 Extraemos el correo aquí mismo
      correo: item.createdBy?.user?.email || item.createdBy?.user?.userPrincipalName || item.createdBy?.user?.displayName || "usuario@azal.com",
    }));

    console.log(`✅ ${transformed.length} Archivos encontrados y listos para la tabla.`);
    return transformed;

  } catch (error) {
    console.error('❌ Error crítico fetching Microsoft files:', error);
    return [];
  }
}

export async function getMicrosoftRecentFiles(accessToken: string, refreshToken: string, userId: number) {
  try {
    let currentToken = accessToken;
    const { response, accessToken: tokenUsed } = await fetchWithTokenRefresh(
      'https://graph.microsoft.com/v1.0/me/drive/recent',
      currentToken,
      refreshToken,
      userId,
    );
    currentToken = tokenUsed;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Microsoft Graph recent files error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recent = (data.value || [])
      .filter((item: any) => item.file && item.lastModifiedDateTime)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        size: item.size || 0,
        uploadedAt: item.lastModifiedDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        type: item.file?.mimeType || 'application/octet-stream',
        mimeType: item.file?.mimeType || 'application/octet-stream',
        webUrl: item.webUrl,
      }))
      .filter((item: any) => new Date(item.lastModifiedDateTime) >= sevenDaysAgo)
      .sort((a: any, b: any) => new Date(b.lastModifiedDateTime).getTime() - new Date(a.lastModifiedDateTime).getTime())
      .slice(0, 10);

    console.log('✅ Archivos recientes de Microsoft obtenidos:', recent.length);
    return recent;
  } catch (error) {
    console.error('❌ Error fetching Microsoft recent files:', error);
    return [];
  }
}

export async function getMicrosoftFolders(accessToken: string, refreshToken: string, userId: number) {
  try {
    console.log('🔍 Obteniendo carpetas de Microsoft Graph...');
    console.log('   Token length:', accessToken?.length || 0);

    let currentToken = accessToken;

    // Función para hacer la llamada a la API
    const fetchFolders = async (token: string) => {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children?$top=100', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response;
    };

    let response = await fetchFolders(currentToken);

    // Si el token expiró, intentar refrescar
    if (response.status === 401 && refreshToken) {
      console.log('🔄 Token expirado, intentando refrescar...');
      try {
        const newTokens = await refreshAccessToken(refreshToken);
        currentToken = newTokens.accessToken;

        // Actualizar tokens en DB
        const { storage } = await import('./storage');
        await storage.updateUserTokens(userId, newTokens.accessToken, newTokens.refreshToken);

        console.log('✅ Token refrescado y guardado');
        
        // Reintentar la llamada
        response = await fetchFolders(currentToken);
      } catch (refreshError) {
        console.error('❌ Error refrescando token:', refreshError);
        return [];
      }
    }

    console.log('📌 Microsoft Graph response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Microsoft Graph error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log('✅ Microsoft Graph returned:', data.value?.length || 0, 'items');
    
    // Transformar carpetas de Microsoft format a nuestro formato (solo carpetas)
    const transformed = (data.value || [])
      .filter((item: any) => item.folder) // Solo carpetas
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        createdAt: item.createdDateTime || item.lastModifiedDateTime || new Date().toISOString(),
        updatedAt: item.lastModifiedDateTime || item.createdDateTime || new Date().toISOString(),
        source: 'microsoft', // Identificar que viene de Microsoft
        webUrl: item.webUrl,
        parentId: null, // Asumir que son root folders
      }));

    console.log('✅ Transformed to:', transformed.length, 'folders');
    return transformed;
  } catch (error) {
    console.error('❌ Error fetching Microsoft folders:', error);
    return [];
  }
}

export async function createMicrosoftFolder(
  accessToken: string,
  refreshToken: string,
  userId: number,
  folderName: string,
) {
  try {
    console.log('🔍 Creando carpeta en Microsoft OneDrive...', folderName);
    let currentToken = accessToken;

    const fetchCreate = async (token: string) => {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        }),
      });
      return response;
    };

    let response = await fetchCreate(currentToken);

    if (response.status === 401 && refreshToken) {
      console.log('🔄 Token expirado, intentando refrescar...');
      try {
        const newTokens = await refreshAccessToken(refreshToken);
        currentToken = newTokens.accessToken;

        const { storage } = await import('./storage');
        await storage.updateUserTokens(userId, newTokens.accessToken, newTokens.refreshToken);

        console.log('✅ Token refrescado y guardado');
        response = await fetchCreate(currentToken);
      } catch (refreshError) {
        console.error('❌ Error refrescando token:', refreshError);
        throw refreshError;
      }
    }

    console.log('📌 Microsoft Graph create folder status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Microsoft Graph create folder error:', response.status, errorText);
      throw new Error(`No se pudo crear la carpeta en OneDrive: ${errorText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      createdAt: data.createdDateTime || new Date().toISOString(),
      updatedAt: data.lastModifiedDateTime || data.createdDateTime || new Date().toISOString(),
      source: 'microsoft',
      webUrl: data.webUrl,
      parentId: data.parentReference?.id || null,
    };
  } catch (error) {
    console.error('❌ Error creando carpeta Microsoft:', error);
    throw error;
  }
}

export async function getMicrosoftQuota(accessToken: string, refreshToken?: string, userId?: number) {
  try {
    let currentToken = accessToken;
    const request = async (token: string) => {
      return await fetch('https://graph.microsoft.com/v1.0/me/drive', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    };

    let response = await request(currentToken);
    if (response.status === 401 && refreshToken && userId != null) {
      const newTokens = await refreshAccessToken(refreshToken);
      currentToken = newTokens.accessToken;
      const { storage } = await import("./storage");
      await storage.updateUserTokens(userId, newTokens.accessToken, newTokens.refreshToken);
      response = await request(currentToken);
    }

    if (!response.ok) {
      console.error('❌ Microsoft Graph quota error:', response.status, response.statusText);
      return { used: 0, total: 0 };
    }

    const data = await response.json();
    return {
      used: data.quota?.used || 0,
      total: data.quota?.total || 0,
    };
  } catch (error) {
    console.error('Error fetching Microsoft quota:', error);
    return { used: 0, total: 0 };
  }
}

export async function uploadFileToGraph(
  accessToken: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  fileSize: number,
) {
  const safeName = encodeURIComponent(fileName);
  const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${safeName}:/content`;

  if (fileSize <= 4 * 1024 * 1024) {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': mimeType,
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Microsoft Graph upload failed: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  const sessionResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${safeName}:/createUploadSession`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }),
  });

  if (!sessionResponse.ok) {
    const errorText = await sessionResponse.text();
    throw new Error(`Upload session failed: ${sessionResponse.status} ${errorText}`);
  }

  const sessionData = await sessionResponse.json();
  const { uploadUrl: sessionUrl } = sessionData;
  if (!sessionUrl) {
    throw new Error('No uploadUrl returned from Microsoft Graph upload session');
  }

  const response = await fetch(sessionUrl, {
    method: 'PUT',
    headers: {
      'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
      'Content-Length': String(fileSize),
      'Content-Type': mimeType,
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph upload session failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// 🚀 NUEVA FUNCIÓN: Solo para la tabla con Paginación (20 en 20)
// 🚀 NUEVA VERSIÓN: Usando DELTA para cuentas Personales y Empresariales
export async function getMicrosoftFilesPaginated(accessToken: string, refreshToken: string, userId: number, nextLink?: string) {
  try {
    let currentToken = accessToken;
    
    // 🔗 Usamos "delta" en lugar de "search". Delta devuelve TODO el disco plano.
    // Pedimos un lote más grande porque vendrán carpetas mezcladas que vamos a filtrar
    const url = nextLink || "https://graph.microsoft.com/v1.0/me/drive/root/delta?$select=id,name,size,file,createdDateTime,lastModifiedDateTime,webUrl,createdBy,deleted&$top=100";

    const { response, accessToken: tokenUsed } = await fetchWithTokenRefresh(url, currentToken, refreshToken, userId);

    if (!response.ok) {
      console.error('❌ Error de Microsoft Delta:', response.status, await response.text());
      return { files: [], nextLink: null };
    }

    const data = await response.json();

    // 🧹 Filtramos para quedarnos SOLO con los que son archivos (ignoramos carpetas y eliminados)
    const content = (data.value || []).filter((item: any) => item.file && !item.deleted);

    const transformed = content.map((item: any) => ({
      id: item.id,
      originalName: item.name,
      size: item.size || 0,
      uploadedAt: item.createdDateTime || item.lastModifiedDateTime || new Date().toISOString(),
      mimeType: item.file?.mimeType || 'application/octet-stream',
      webUrl: item.webUrl,
      source: 'microsoft',
      // 📧 Extraemos el correo del creador
      correo: item.createdBy?.user?.email || item.createdBy?.user?.userPrincipalName || item.createdBy?.user?.displayName || "usuario@azal.com",
    }));

    // 🔗 Microsoft puede devolver @odata.nextLink (más páginas)
    const nextUrl = data['@odata.nextLink'] || null;

    return {
      files: transformed,
      nextLink: nextUrl 
    };

  } catch (error) {
    console.error('❌ Error fetching paginated files (Delta):', error);
    return { files: [], nextLink: null };
  }
}
