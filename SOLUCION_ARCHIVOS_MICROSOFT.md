# Solución: Visualizar archivos de Microsoft en el Dashboard

## Problema
Los archivos creados en tu cuenta de Microsoft no aparecían en el dashboard, aunque ya tenías los permisos configurados.

## Causa
La aplicación obtenía el `accessToken` de Microsoft pero **no lo usaba** para obtener los archivos desde Microsoft Graph API.

## Cambios Realizados

### 1. ✅ Nuevo módulo: `server/microsoft-graph.ts`
Integracion con Microsoft Graph API para obtener:
- Archivos del usuario (`/me/drive/root/children`)
- Información de almacenamiento (`/me/drive`)

### 2. ✅ Nuevos endpoints en `server/routes.ts`

#### `GET /api/microsoft-files` (Solo archivos de Microsoft)
```
curl -X GET http://localhost:5000/api/microsoft-files \
  -H "Authorization: Bearer <accessToken>"
```

#### `GET /api/files-all` (Archivos locales + Microsoft) ⭐ **PRINCIPAL**
Retorna todos los archivos combinados:
- Archivos subidos localmente
- Archivos desde Microsoft OneDrive/SharePoint

#### `GET /api/microsoft-quota` (Almacenamiento)
Retorna información del almacenamiento de Microsoft:
```json
{
  "used": 1024000,
  "total": 5368709120
}
```

### 3. ✅ Actualizadas páginas para usar `/api/files-all`
- `client/src/pages/dashboard-page.tsx`
- `client/src/pages/my-files-page.tsx` 
- `client/src/pages/folder-page.tsx`

## Cómo funciona ahora

1. **Usuario se autentica con Microsoft** → Se obtiene el `accessToken`
2. **Dashboard realiza consulta** a `/api/files-all`
3. **Servidor obtiene:**
   - Archivos locales de la BD
   - Archivos de Microsoft Graph API usando el `accessToken`
4. **Se combinan ambas listas** y se retornan al cliente
5. **Dashboard muestra todos los archivos**

## Para que funcione:

### Requisitos en Passport (ya configurados en `server/auth.ts`)
- ✅ `Files.Read` - Permisos para leer archivos
- ✅ `Files.ReadWrite` - Permisos para escribir archivos
- ✅ `offline_access` - Para obtener refreshToken

### Verificar que el accessToken se guarda
En `server/auth.ts` línea 76:
```typescript
profile.accessToken = accessToken; // Ya está configurado ✅
```

## Próximos pasos (Opcional)

### Para descargar archivos de Microsoft
```typescript
// Agregar en microsoft-graph.ts
export async function downloadMicrosoftFile(accessToken: string, fileId: string) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  return response.blob();
}
```

### Para sincronización periódica
Si quieres caché de archivos, puedes guardar en BD cada cierto tiempo.

## Prueba

1. **Inicia sesión** con tu cuenta de Microsoft
2. **Crea un documento Word** en OneDrive
3. **Abre el dashboard**
4. Deberías ver ambos:
   - Archivos locales
   - Archivos de Microsoft (incluyendo el Word que creaste)

## Troubleshooting

- Si no ves archivos: Verifica en consola del navegador si hay errores
- Si el accessToken es null: Revisa que Passport esté guardando `profile.accessToken`
- Si error 401: Significa que expiro el token (necesitarías implementar refreshToken)

---
**Fecha:** 7 de Abril 2026
**Versión:** V7 TERMINADA
