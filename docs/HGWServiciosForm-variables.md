# Variables en HGWServiciosForm.tsx

Archivo fuente: [client/src/components/quotations/forms/HGWServiciosForm.tsx](client/src/components/quotations/forms/HGWServiciosForm.tsx#L1)

A continuación se lista el nombre de cada variable o símbolo relevante y su descripción.

| Nombre | Descripción |
|---|---|
| SOCIAL_OBJECTS | Array de strings con los posibles "objetos sociales" para seleccionar en el formulario. |
| unitMeasureAbbreviations | Mapa (Record<string,string>) que relaciona nombres de unidades a sus abreviaturas (ej. "kilogramo" → "KG"). |
| normalizeUnitMeasure | Función que normaliza una unidad (string) devolviendo su abreviatura según `unitMeasureAbbreviations`, o el valor original si no hay coincidencia. |
| FormValues (type) | Tipo TypeScript que extiende `AMSFormData` con campos adicionales usados por el formulario (deliveryDates, deliveryConditions, hasDeliveryConditions, etc.). |
| HGWServiciosFormProps (interface) | Interface de props del componente: `companyName?`, `values: FormValues`, `onChange(values)`. |
| defaultLineItem (import) | Objeto importado con valores por defecto para una partida/lineItem (usado al agregar una nueva fila). |
| initialized | `useRef(false)` — flag que indica si el componente ya hizo la inicialización (evita re-inicializar). |
| form | Resultado de `useForm<FormValues>` (react-hook-form): contiene `control`, `watch`, `getValues`, `setValue`, `reset`, etc. |
| deliveryLocations | `useFieldArray` ligado a `form.control` para el array `deliveryLocations` (gestiona filas de tabla de lugares). |
| lineItems | `useFieldArray` ligado a `form.control` para el array `lineItems` (gestiona las partidas/filas de la tabla de materiales). |
| hasManufacturingTime | Valor observado por `form.watch("hasManufacturingTime")` (boolean) — controla si mostrar campo de tiempo de fabricación. |
| hasRegionalMilitary | Valor observado por `form.watch("hasRegionalMilitary")` (boolean) — controla columnas/inputs relacionados con Región Militar. |
| hasDeliveryConditions | Valor observado por `form.watch("hasDeliveryConditions")` (boolean) — controla si se muestran las condiciones de entrega (A, B, C...). |
| selectedSocialObjects | Valor observado por `form.watch("selectedSocialObjects")` — array con objetos sociales seleccionados. |
| watchedLineItems | Valor observado por `form.watch("lineItems")` — array actual de partidas; usado para render y cálculos. |
| rawConditions (local en useEffect) | Variable local con `values.deliveryConditions` tal como llega (puede ser `string[]` o ya normalizado). |
| normalizedConditions (local en useEffect) | Resultado de normalizar `rawConditions` a formato `{ text, subItems }[]`. |
| locs (local en useEffect) | Variable local con `values.deliveryLocations` (se usa para añadir una fila si está vacío). |
| sub (local en useEffect) | Suscripción retornada por `form.watch((v) => onChange(...))` usada para propagar cambios hacia `onChange` (y se limpia en el return). |
| toggleSocialObject | Función que añade o quita un `obj` del array `selectedSocialObjects` usando `form.getValues`/`setValue`. |
| updateLineItem | Función para actualizar un campo de un `lineItem` por índice; recalcula campos derivados: `previo`, `unitPrice`, `importe` según `purchaseCost`, `profitFactor`, `quantity`. |
| watchedDeliveryNotes | Valor observado `form.watch("deliveryNotes")` convertido a string (notas de entrega multilinea). |
| observations | Array derivado de `watchedDeliveryNotes.split("\n")` (cada línea es una observación). |
| setObservations | Función que recibe `string[]` y actualiza `deliveryNotes` uniendo con `\n`. |
| inputClass | String con las clases CSS reutilizables para los inputs del formulario. |
| Total Venta (expresión) | Cálculo inline: `(watchedLineItems ?? []).reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0)` → muestra total de venta en la UI. |

---

Si quieres, puedo:  
- añadir las referencias de línea para cada variable,  
- exportar esta tabla a otro formato (CSV/JSON), o  
- insertar la documentación dentro del componente como comentario.