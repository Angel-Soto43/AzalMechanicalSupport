# Azal Mechanical Supports - Sistema de Gestión Documental (Cloud)

## 📝 Descripción del Proyecto
Este sistema es una solución empresarial de alto rendimiento diseñada para la **gestión, almacenamiento y consulta segura de documentos** críticos, como contratos y registros de operaciones. 

A diferencia de un gestor de archivos convencional, este proyecto implementa una arquitectura basada en la seguridad y la trazabilidad, siguiendo lineamientos de la norma **ISO 27001** para garantizar que cada interacción con los datos sea monitoreada y protegida.

### 🛠️ Capacidades Principales
* **Gestión de Archivos de Gran Volumen**: Capacidad de procesamiento para archivos de hasta 50MB con sanitización automática de nombres para evitar vulnerabilidades en el servidor.
* **Estructura Organizacional Dinámica**: Sistema de navegación mediante carpetas jerárquicas con niveles de profundidad ilimitados.
* **Control de Versiones Inmutable**: Al actualizar un documento, el sistema genera automáticamente un historial de versiones, permitiendo mantener la integridad del flujo de trabajo.
* **Seguridad de Grado Empresarial**: Implementación de cifrado robusto (`scrypt`) para credenciales y mecanismos de defensa activa contra ataques de fuerza bruta.
* **Trazabilidad Total (Audit Logs)**: Registro inalterable de cada acción (quién, qué, cuándo, desde qué IP y dispositivo), lo que proporciona un historial forense completo de la actividad del sistema.

### 🧩 Arquitectura del Sistema
El proyecto está construido bajo un enfoque **Fullstack moderno**:
1. **Frontend**: Interfaz reactiva y tipado estricto con React + TypeScript.
2. **Backend**: Servidor escalable con Node.js + Express.
3. **Persistencia**: Capa de datos optimizada mediante Drizzle ORM y validación de esquemas con Zod.

## 🛠️ Instalación y Configuración

Sigue estos pasos para desplegar el entorno de desarrollo local.

### 1. Requisitos Previos
* **Node.js**: v18.0.0 o superior.
* **Base de Datos**: PostgreSQL (o MySQL/XAMPP configurado).
* **Gestor de Paquetes**: npm (incluido con Node.js).

### 2. Configuración del Proyecto
Clona el repositorio y accede a la carpeta raíz:
```bash
git clone https://github.com/Angel-Soto43/AzalMechanicalSupport.git
cd rest-express
```
### 3. Instalación de Dependencias
Instala todas las librerías necesarias para el Frontend y Backend:
```bash
npm install
```
### 4. Variables de Entorno
Crea un archivo .env en la raíz del proyecto y configura las siguientes variables:
```bash
# Conexión a la Base de Datos
DATABASE_URL=tu_cadena_de_conexion_aqui

# Seguridad de Sesión (Requerido para Passport.js)
SESSION_SECRET=una_clave_larga_y_aleatoria
````
### 5. Ejecución en Desarrollo
Inicia el servidor de backend y el cliente de Vite simultáneamente:
```bash
npm run dev
```
El sistema estará disponible en http://localhost:5000

### 📂 Estructura del Proyecto
/client: Código fuente del frontend desarrollado en React + TypeScript.

/server: Lógica del backend, controladores de API y sistema de autenticación.

/shared: Esquemas de base de datos (Drizzle) y validaciones de datos con Zod.

/uploads: Directorio para el almacenamiento físico de los archivos subidos.

### 🛡️ Seguridad y Auditoría
Para garantizar el cumplimiento normativo, el sistema registra automáticamente en la tabla audit_logs:

Intentos de inicio de sesión (exitosos y fallidos).

Carga, descarga, reemplazo y eliminación de archivos.

Creación y modificación de usuarios o carpetas.

Metadatos técnicos: Dirección IP, User-Agent y Timestamp exacto.
