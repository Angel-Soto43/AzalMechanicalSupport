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

export async function getMicrosoftFiles(accessToken: string, refreshToken: string, userId: number) {
  try {
    console.log('🔍 Obteniendo archivos de Microsoft Graph...');
    console.log('   Token length:', accessToken?.length || 0);

    let currentToken = accessToken;

    // Función para hacer la llamada a la API
    const fetchFiles = async (token: string) => {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/items?$top=100', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response;
    };

    let response = await fetchFiles(currentToken);

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
        response = await fetchFiles(currentToken);
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
    
    // Transformar archivos de Microsoft format a nuestro formato (solo archivos, no carpetas)
    const transformed = (data.value || [])
      .filter((item: any) => item.file) // Solo archivos
      .map((item: any) => ({
        id: item.id,
        originalName: item.name,
        size: item.size || 0,
        uploadedAt: item.createdDateTime || item.lastModifiedDateTime || new Date().toISOString(),
        mimeType: item.file?.mimeType || 'application/octet-stream',
        webUrl: item.webUrl,
        source: 'microsoft', // Identificar que viene de Microsoft
      }));

    console.log('✅ Transformed to:', transformed.length, 'files');
    return transformed;
  } catch (error) {
    console.error('❌ Error fetching Microsoft files:', error);
    return [];
  }
}

export async function getMicrosoftQuota(accessToken: string) {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
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
