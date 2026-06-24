# Variables de HERMALBienesForm

Archivo fuente: [client/src/components/quotations/forms/HERMALBienesForm.tsx](../client/src/components/quotations/forms/HERMALBienesForm.tsx)

## Variables internas y auxiliares

| Nombre | Descripción |
|---|---|
| SOCIAL_OBJECTS | Arreglo con los objetos sociales disponibles para seleccionar en el formulario. |
| FormValues | Tipo TypeScript que define los campos usados por el componente y que se envían desde el formulario. |
| HERMALBienesFormProps | Props del componente: `companyName`, `values` y `onChange`. |
| unitMeasureAbbreviations | Mapa de abreviaturas de unidades de medida como KG, PZA, M, LT y UND. |
| normalizeUnitMeasure | Función que convierte una unidad a su abreviatura cuando aplica, o devuelve el valor original si no existe coincidencia. |
| initialized | Referencia React para evitar reinicializar el formulario más de una vez. |
| form | Instancia de `useForm` con el estado del formulario y sus métodos de control. |
| deliveryLocations | Controlador de array para los lugares de entrega cuando no existe un único lugar. |
| qualityGuarantees | Controlador de array para las garantías de calidad ingresadas. |
| lineItems | Controlador de array para las partidas o materiales de la tabla. |
| deliverySingle | Valor observado que indica si el lugar de entrega es único. |
| hasManufacturingTime | Valor observado que activa o desactiva el campo de tiempo de fabricación. |
| selectedSocialObjects | Lista de objetos sociales seleccionados por el usuario. |
| watchedLineItems | Lista actual de partidas observada para mostrar cálculos y renderizar filas. |
| toggleSocialObject | Función para agregar o quitar un objeto social del arreglo seleccionado. |
| updateLineItem | Función para modificar una partida y recalcular valores derivados como previo, unitPrice e importe. |
| inputClass | Clase CSS reutilizable para los inputs del formulario. |

## Campos del formulario

| Nombre | Descripción |
|---|---|
| attnLugar | Lugar de emisión o ubicación del documento. |
| attnDia | Día de la fecha del documento. |
| attnMes | Mes de la fecha del documento. |
| attnAnio | Año de la fecha del documento. |
| attnGrado | Grado o título del destinatario. |
| contactPerson | Nombre de la persona de contacto. |
| destinationCompany | Dependencia o empresa destinataria. |
| attnArea | Área o subdivisión de la dependencia. |
| attnUbicacion | Ubicación física de la dependencia. |
| attnDireccion | Dirección de la dependencia. |
| attnContacto | Contacto adicional para la atención. |
| attnCargo | Cargo de la persona a quien va dirigida la cotización. |
| projectTitle | Título o nombre del procedimiento o proyecto. |
| validityDays | Vigencia de la cotización en días. |
| paymentTerms | Condiciones de pago. |
| goodsOrigin | Origen de los bienes. |
| deliveryTime | Tiempo estimado de entrega. |
| hasManufacturingTime | Indica si se incluye un tiempo de fabricación. |
| manufacturingTime | Tiempo de fabricación cuando aplica. |
| deliverySingle | Indica si existe un único lugar de entrega. |
| deliveryLocation | Lugar de entrega cuando es único. |
| deliveryLocations | Lista de lugares de entrega cuando no es único. |
| qualityGuarantees | Lista de garantías de calidad del producto o servicio. |
| selectedSocialObjects | Objetos sociales seleccionados para la cotización. |
| lineItems | Lista de partidas o materiales incluidos en la cotización. |

## Campos de cada partida o lineItem

| Nombre | Descripción |
|---|---|
| noPartida | Número de partida. |
| description | Descripción técnica o nombre del material. |
| techRequirements | Requisitos técnicos asociados a la partida. |
| versionReference | Versión o referencia técnica. |
| reqDate | Fecha asociada al requisito o solicitud. |
| supplier | Proveedor del material o servicio. |
| purchaseCost | Costo de compra del producto. |
| profitFactor | Factor de utilidad aplicado al costo. |
| previo | Valor previo calculado a partir del costo y el factor. |
| importe | Importe total calculado por cantidad por precio. |
| quantity | Cantidad solicitada. |
| unitMeasure | Unidad de medida de la partida. |
| unitPrice | Precio unitario de venta. |
