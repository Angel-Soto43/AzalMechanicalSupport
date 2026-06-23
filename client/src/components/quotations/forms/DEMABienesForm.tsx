import { useEffect, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { FormSection } from "./FormSection.tsx";
import type { AMSFormData, LineItem } from "./form-types";
import { defaultLineItem } from "./form-types";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const SOCIAL_OBJECTS = [
  "Prestar servicios de ingeniería, diseño, desarrollo e implementación, asistencia técnica, mano de obra especializada, mantenimiento, compra, venta, distribución e importación de maquinaria convencional, automatizada y C.N.C., así como insumos o refacciones relacionadas con la transformación y manufactura metal mecánica.",
  "Proporcionar servicios de ingeniería, diseño, desarrollo e implementación, asistencia técnica, mano de obra especializada, mantenimiento, venta y distribución de equipo industrial, accesorios y maquinaria producidos bajo diseño y especificaciones especiales relacionadas con la industria en general.",
  "Prestar servicios de instalación, ensamble, montaje, suministro, mantenimiento y comercialización de toda clase de productos y elementos propios de la industria metalmecánica aplicada a procesos industriales y de manufactura.",
  "Comprar, procesar, vender, distribuir, importar y exportar todo tipo de productos químicos utilizados como materia prima o insumos de los procesos de producción de la industria manufacturera, automotriz y de la construcción, así como aquellos utilizados en tratamientos superficiales, térmicos y termoquímicos.",
  "Prestar servicios de ingeniería, diseño, desarrollo e implementación, asistencia técnica, mano de obra especializada, mantenimiento, compra, venta, distribución, ensamble, instalación e importación de equipo industrial, accesorios y refacciones utilizados en la industria manufacturera, metalmecánica, automotriz, de la construcción, química y farmacéutica; así como de sus insumos o refacciones.",
  "Comprar, procesar, vender, distribuir, importar y exportar todo tipo de materiales metálicos como fierro, aceros aleados, aceros estructurales, aluminios, bronces, cobres, zamak, plomo, zinc, níquel, descritos de manera enunciativa pero no limitativa, utilizados en la industria manufacturera, metalmecánica, automotriz, y de la construcción.",
  "Prestar servicios de ingeniería, diseño, desarrollo e implementación, asistencia técnica, mano de obra especializada, mantenimiento y servicio, compra, venta, distribución, ensamble, instalación e importación de equipos de almacenamiento y distribución de energía eléctrica como plantas eléctricas de emergencia, subestaciones eléctricas, Unidades de Alimentación Ininterrumpida (UPS), transformadores, tableros de control y transferencia, así como todos los insumos, refacciones y demás equipo industrial para todo tipo de instalaciones que requieran de energía eléctrica para su operación.",
  "Prestar servicios de ingeniería, diseño, desarrollo e implementación, asistencia técnica, mano de obra especializada, mantenimiento y servicio, compra, venta, distribución, ensamble, instalación e importación de equipo industrial, insumos y refacciones utilizadas para la operación de plantas de tratamiento de aguas residuales, pozos profundos, potabilizadoras y purificadoras de agua, aires acondicionados industriales, manejadoras de aire, calderas, sistemas de calentamiento de agua, hidroneumáticos, cuartos fríos, sistemas de refrigeración, conservación y congelamiento.",
  "Prestar servicios de ingeniería, diseño, desarrollo e implementación, asistencia técnica, mano de obra especializada, mantenimiento y servicio, compra, venta, distribución, ensamble, instalación e importación de equipos de laboratorio industrial, de investigación científica, médico, servicios forenses y periciales, criminalística y criminología, así como insumos y refacciones utilizados en equipos como cromatógrafos, espectrofotómetros, microscopios electrónicos de barrido, máquinas de pruebas mecánicas, mezcladoras, y demás equipos de estas ramas descritos de manera enunciativa pero no limitativa.",
  "Comprar, ensamblar, vender, distribuir, importar y exportar todo tipo de equipo de protección personal industrial y especializado: visual, facial, auditivo, respiratorio, de manos y corporal, y demás accesorios utilizados para la seguridad de operarios que laboran en la industria manufacturera, metalmecánica, automotriz, y de la construcción, así como todo lo relacionado con equipos de emergencia como equipos contra incendios, de bombero, anti motín, primeros auxilios, de evacuación, de búsqueda y rescate.",
  "Comprar, ensamblar, fabricar, vender, distribuir, procesar, instalar, importar y exportar todo tipo de herramientas de corte como cortadores, brocas, insertos, porta insertos, porta herramientas, coronas, rimas y de fabricación especial, producidas en acero rápido, carburo sólido, cobalto, etc., empleados en equipos industriales, accesorios, maquinaria convencional y de C.N.C.",
  "Comprar, ensamblar, fabricar, vender, distribuir, procesar, instalar, importar y exportar todo tipo de herramentales de fabricación especial para producción de altos volúmenes como moldes de inyección de plástico, moldes de inyección de metal, troqueles de corte, de conformado, de extrusión, progresivos, herramientas de fabricación especial y bajo diseño, calibres pasa – no pasa, calibres especiales, verificadores, y demás utillaje especial empleados en procesos de manufactura así como equipos industriales, accesorios e instrumentos de medición.",
  "Comprar, ensamblar, fabricar, vender, distribuir, procesar, instalar, importar y exportar todo tipo de herramientas mecánicas, manuales, inalámbricas y eléctricas; utilizadas en la industria manufacturera, metalmecánica, automotriz, y de la construcción.",
  "Comprar, ensamblar, fabricar, vender, distribuir, procesar, arrendar, instalar, importar y exportar todo tipo de aparatos eléctricos y electrónicos, de cómputo, videovigilancia, de impresión como sistemas de control de temperatura, monitores, pantallas, CPU, impresoras, lámparas, paneles fotovoltaicos, equipo de informática y telecomunicaciones en general.",
  "Comprar, ensamblar, fabricar, vender, distribuir, procesar, instalar, importar y exportar equipo de diagnóstico, equipo de quirófano, equipo de rehabilitación física, equipo de fisioterapia, equipo para ambulancia, instrumental quirúrgico, productos de acero inoxidable, material de curación, material didáctico, mobiliario médico, consumibles hospitalarios y todo lo relacionado con equipamiento, refacciones e insumos necesarios para la operación de clínicas, hospitales, laboratorios y consultorios.",
  "Comprar, ensamblar, fabricar, vender, distribuir, procesar, instalar, importar y exportar equipo de diagnóstico, equipo de laboratorio, equipo médico veterinario, equipo dental, equipo médico, equipo de emergencia y rescate y todo lo relacionado con equipamiento, refacciones e insumos necesarios para la operación de clínicas, hospitales, laboratorios y consultorios.",
  "Comprar, ensamblar, fabricar, vender, distribuir, procesar, instalar, reparar, importar y exportar todo tipo de resortes de tensión, de compresión, de torsión, de troquel o entrelazables; requeridos en los procesos de fabricación en la industria automotriz, manufacturera, metalmecánica, de la construcción e industria en general.",
  "Proporcionar servicios de planificación del traslado de maquinaria y equipos industriales, plan de reubicación, desmontaje y montaje de la maquinaria industrial, ingeniería, diseño, desarrollo e implementación, asistencia técnica, coordinación de equipos de carga especializada, mano de obra especializada en traslado de maquinaria y equipos industriales, desconexión, desensamble, empaque, embalaje, transporte, anclaje, instalación y puesta en operación de maquinaria convencional, automática y de CNC así como equipo industrial, especializado, y sus accesorios.",
  "La compra y/o venta de accesorios y refacciones, la compra, venta, importación, exportación, comisión consignación, representación corretaje, agencia, franquicia, licencia, concesión, fabricación, maquila, diseño, exposición, elaboración, envasado, empacado, servicio, mantenimiento, reparación, financiamiento, arrendamiento, subarrendamiento, arrendamiento puro, distribución y comercio en general, de toda clase de artículos, vehículos nuevos y usados, bienes muebles e inmuebles y productos ya sean de uso industrial, comercial y doméstico, así como de maquinaria, equipo herramientas necesarias para su fabricación, sus partes, materias primas, accesorios y refacciones y toda clase de actividades, artículos y/o productos relacionados con el objeto enunciado.",
  "Realizar toda clase de actos, trámites y gestorías en nombre y representación de terceros, compareciendo ante toda clase de personas físicas y morales del sector privado y público, autoridades en sus distintos niveles: federal, estatal y municipal, autoridades agrarias, judiciales, administrativas, civiles, penales y del trabajo federales y locales.",
  "Licitar y concursar ante autoridades federales, estatales, municipales para la explotación de servicios públicos dados en administración o para financiar proyectos de desarrollo económico a niveles locales, regionales y nacionales relacionados con el objeto social.",
  "El establecimiento de plantas renovadoras de neumáticos o de otras refacciones, talleres, bodegas, almacenes, oficinas, agencias y sucursales necesarios y convenientes para la realización del objeto social.",
  "La publicidad de los productos anteriores y el uso de sus nombres comerciales, a través de los medios que se estimen más adecuados.",
  "La obtención, adquisición el uso, enajenación y en general, la explotación y concesión en uso, por cualquier medio legal, de patentes, invenciones, modelos industriales, marcas o nombres comerciales, marcas propias, regalías y derechos de autor, relacionadas directa o indirectamente con el objeto social.",
  "Concurrir como socio de otras personas morales, bien sea en su constitución o adquiriendo acciones en las ya existentes, así como toda clase de valores, de acuerdo con las disposiciones legales vigentes.",
  "Ser agente, representante, comisionista o mandatario de empresas nacionales o extranjeras, fabricantes o comerciantes de los bienes, productos, servicios y elementos necesarios para la consecución de su objeto social.",
  "Contratar al personal necesario para el cumplimiento de los fines sociales y delegar en una o varias personas el cumplimiento de mandatos, comisiones y demás actividades propias de su objeto.",
  "Obtener y recibir dinero en préstamo con o sin garantía, emitir bonos, cédulas hipotecarias, obligaciones y otros títulos de crédito con la participación de las instituciones que en cada caso se requiera, de acuerdo con la Ley.",
  "En general realizar y/o llevar a cabo en el País o en el extranjero, por cuenta propia o de terceros, toda clase de actos, contratos o convenios principales o accesorios, civiles o mercantiles o de cualquier otra naturaleza, que sean necesarios o convenientes para la realización de los objetos antes mencionados. Todas las finalidades señaladas en este objeto social, se llevarán a cabo con las limitaciones y restricciones que fijen las leyes respectivas.",
  "La producción en general de anuncios publicitarios, comerciales interactivos e impresos; así como la realización de todo tipo de actividad que tenga por objeto el negocio de la publicidad en general, incluyendo diseño, preparación y elaboración de avisos y anuncios comerciales y la colocación de los mismos, así como la preparación y realización de campañas publicitarias para dar a conocer productos de toda clase de servicios a empresas e instituciones comerciales, industriales, bancarias, cívicas y artísticas.",
  "La compra, venta y renta de todo tipo de cajas de luz, anuncios y espacios publicitarios.",
  "El análisis y estudio de mercados y la prestación de servicios de mercadotecnia.",
  "Suministro y servicios a municipios, Estados y/o Federación en todo lo relacionado a su giro.",
];

type FormValues = Pick<AMSFormData,
  | "attnLugar" | "attnDia" | "attnMes" | "attnAnio" | "attnGrado" | "contactPerson" | "destinationCompany" | "attnArea" | "attnUbicacion" | "attnDireccion"
  | "projectTitle" | "attnContacto" | "attnCargo"
  | "validityDays" | "paymentTerms" | "goodsOrigin" | "deliveryTime"
  | "hasManufacturingTime" | "manufacturingTime"
  | "deliverySingle" | "deliveryLocation" | "deliveryLocations"
  | "qualityGuarantees" | "requiredDocuments" | "normsTable" | "selectedSocialObjects"
  | "lineItems"
>;

interface DEMABienesFormProps {
  companyName?: string;
  values: FormValues;
  onChange: (values: FormValues) => void;
}

const unitMeasureAbbreviations: Record<string, string> = {
  kilogramo: "KG", pieza: "PZA", metro: "M", litro: "LT", unidad: "UND",
};

const normalizeUnitMeasure = (value: string) => {
  if (!value || typeof value !== "string") return "";
  return unitMeasureAbbreviations[value.trim().toLowerCase()] || value;
};

export function DEMABienesForm({ companyName, values, onChange }: DEMABienesFormProps) {
  const initialized = useRef(false);

  const form = useForm<FormValues>({
    defaultValues: values,
    mode: "onChange",
  });

  const deliveryLocations = useFieldArray({ control: form.control, name: "deliveryLocations" });
  const qualityGuarantees = useFieldArray({ control: form.control, name: "qualityGuarantees" as any });
  const lineItems = useFieldArray({ control: form.control, name: "lineItems" });

  const deliverySingle = form.watch("deliverySingle");
  const hasManufacturingTime = form.watch("hasManufacturingTime");
  const selectedSocialObjects = form.watch("selectedSocialObjects");
  const watchedLineItems = form.watch("lineItems");

  useEffect(() => {
    if (!initialized.current) {
      form.reset(values);
      initialized.current = true;
    }
  }, []);

  useEffect(() => {
    const sub = form.watch((v) => onChange(v as FormValues));
    return () => sub.unsubscribe();
  }, [form, onChange]);

  const toggleSocialObject = (obj: string) => {
    const current = form.getValues("selectedSocialObjects") ?? [];
    const updated = current.includes(obj) ? current.filter((o) => o !== obj) : [...current, obj];
    form.setValue("selectedSocialObjects", updated, { shouldDirty: true });
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const current = form.getValues("lineItems");
    const item = { ...current[index], [field]: value };

    if (field === "purchaseCost" || field === "profitFactor") {
      const cost = field === "purchaseCost" ? Number(value || 0) : Number(item.purchaseCost || 0);
      const factor = field === "profitFactor" ? Number(value || 1) : Number(item.profitFactor || 1);
      item.previo = cost * factor;
      item.unitPrice = Number((cost * factor).toFixed(2));
    }

    if (field === "purchaseCost" || field === "quantity") {
      const cost = field === "purchaseCost" ? Number(value || 0) : Number(item.purchaseCost || 0);
      const qty = field === "quantity" ? Number(value || 0) : Number(item.quantity || 0);
      item.importe = cost * qty;
    }

    form.setValue(`lineItems.${index}`, item, { shouldDirty: true });
  };

  const inputClass = "bg-white dark:bg-slate-900/60 dark:text-white dark:placeholder-slate-400 border border-slate-200 dark:border-slate-700 focus:border-cyan-400 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/20 dark:focus:ring-cyan-400/25 transition";

  return (
    <Form {...form}>

      {/* SECCIÓN 1 */}
      <FormSection title='Sección 1' subtitle="Solo aparecerán en el PDF los campos que se llenen.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 grid grid-cols-3 gap-4">
            <FormField control={form.control} name="attnDia" render={({ field }) => (
              <FormItem><FormLabel>Día</FormLabel><FormControl>
                <Input className={inputClass} placeholder="Ej. 10" {...field} />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="attnMes" render={({ field }) => (
              <FormItem><FormLabel>Mes</FormLabel><FormControl>
                <Input className={inputClass} placeholder="Ej. junio" {...field} />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="attnAnio" render={({ field }) => (
              <FormItem><FormLabel>Año</FormLabel><FormControl>
                <Input className={inputClass} placeholder="Ej. 2026" {...field} />
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="attnLugar" render={({ field }) => (
            <FormItem><FormLabel>Lugar</FormLabel><FormControl>
              <Input className={inputClass} placeholder={'Ej. CAMPO MIL. No. 25-E "VENUSTIANO CARRANZA DE LA GARZA".'} {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="attnGrado" render={({ field }) => (
            <FormItem><FormLabel>Grado</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. C. Tte. Cor. Inf." {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="contactPerson" render={({ field }) => (
            <FormItem><FormLabel>Nombre</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Vicente Herrera Valdez" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="destinationCompany" render={({ field }) => (
            <FormItem><FormLabel>Dependencia</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Secretaría de la Defensa Nacional" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="attnArea" render={({ field }) => (
            <FormItem><FormLabel>Área</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Comedor, puerta 4 étc..." {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="attnUbicacion" render={({ field }) => (
            <FormItem><FormLabel>Ubicación</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. CARRETERA FEDERAL 140-D KILOMETRO 1.5, C.P. 68200..." {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="attnDireccion" render={({ field }) => (
            <FormItem><FormLabel>Dirección</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Av. Dirección General de Sanidad" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="attnCargo" render={({ field }) => (
            <FormItem><FormLabel>Cargo</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Jefe de I.M. de la Dir. Gral. Ind. Mil." {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <div className="md:col-span-2">
            <FormField control={form.control} name="projectTitle" render={({ field }) => (
              <FormItem><FormLabel>Nombre del procedimiento</FormLabel><FormControl>
                <Input className={inputClass} placeholder={'Ej. Requisición No. FA09-R001/2026, "Adquisición de polímeros A".'} {...field} />
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>

          {/* TABLA DE PARTIDAS */}
          <div className="md:col-span-2 space-y-3">
            <div className="border rounded-xl overflow-hidden shadow-sm dark:border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-[#0F172A] text-white">
                  <tr>
                    <th className="px-3 py-2 text-center w-10">#</th>
                    <th className="px-3 py-2 text-left min-w-[200px]">Descripción / Esp. Técnica</th>
                    <th className="px-3 py-2 text-left min-w-[160px]">Req. / Versión / Fecha</th>
                    <th className="px-3 py-2 text-center border-l border-slate-700 bg-slate-800 text-emerald-300 min-w-[280px]">Datos Internos</th>
                    <th className="px-3 py-2 text-center w-16">Cant.</th>
                    <th className="px-3 py-2 text-left w-16">U.M.</th>
                    <th className="px-3 py-2 text-center w-28">P. Venta Unit.</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.fields.map((f, i) => (
                    <tr key={f.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-2 py-2">
                        <Input
                          className={inputClass + " text-xs w-14 text-center"}
                          placeholder={String(i + 1)}
                          value={watchedLineItems?.[i]?.noPartida ?? ""}
                          onChange={e => updateLineItem(i, "noPartida", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input className={inputClass + " text-xs"} placeholder="Ej. Cinta de aluminio..."
                          value={watchedLineItems?.[i]?.description ?? ""}
                          onChange={e => updateLineItem(i, "description", e.target.value)} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="space-y-1">
                          <Input className={inputClass + " text-[10px] h-6"} placeholder="Req. técnicos"
                            value={watchedLineItems?.[i]?.techRequirements ?? ""}
                            onChange={e => updateLineItem(i, "techRequirements", e.target.value)} />
                          <div className="flex gap-1">
                            <Input className={inputClass + " text-[10px] h-6 w-1/2"} placeholder="Versión"
                              value={watchedLineItems?.[i]?.versionReference ?? ""}
                              onChange={e => updateLineItem(i, "versionReference", e.target.value)} />
                            <Input className={inputClass + " text-[10px] h-6 w-1/2"} placeholder="Fecha"
                              value={watchedLineItems?.[i]?.reqDate ?? ""}
                              onChange={e => updateLineItem(i, "reqDate", e.target.value)} />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 border-l border-slate-200 dark:border-slate-700 bg-emerald-50/30 dark:bg-emerald-950/20">
                        <div className="space-y-1 min-w-[260px]">
                          <Input className={inputClass + " text-[10px] h-7"} placeholder="Proveedor"
                            value={watchedLineItems?.[i]?.supplier ?? ""}
                            onChange={e => updateLineItem(i, "supplier", e.target.value)} />
                          <div className="grid grid-cols-3 gap-1">
                            <div>
                              <p className="text-[9px] text-slate-400 mb-0.5">Costo Prov.</p>
                              <Input className={inputClass + " text-[10px] h-7"} type="number" placeholder="$0"
                                value={watchedLineItems?.[i]?.purchaseCost || ""}
                                onChange={e => updateLineItem(i, "purchaseCost", Number(e.target.value))} />
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 mb-0.5">Factor</p>
                              <Input className={inputClass + " text-[10px] h-7"} type="number" placeholder="1"
                                value={watchedLineItems?.[i]?.profitFactor || ""}
                                onChange={e => updateLineItem(i, "profitFactor", Number(e.target.value))} />
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 mb-0.5">Previo</p>
                              <Input className="text-[10px] h-7 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500"
                                readOnly value={watchedLineItems?.[i]?.previo?.toFixed(4) ?? "0"} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <div>
                              <p className="text-[9px] text-slate-400 mb-0.5">Importe</p>
                              <Input className="text-[10px] h-7 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500"
                                readOnly value={watchedLineItems?.[i]?.importe?.toLocaleString() ?? "0"} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <Input className={inputClass + " text-xs w-16"} type="number"
                          value={watchedLineItems?.[i]?.quantity || ""}
                          onChange={e => updateLineItem(i, "quantity", Number(e.target.value))} />
                      </td>
                      <td className="px-2 py-2">
                        <Input className={inputClass + " text-xs w-16 uppercase"} placeholder="KG"
                          value={watchedLineItems?.[i]?.unitMeasure ?? ""}
                          onChange={e => updateLineItem(i, "unitMeasure", normalizeUnitMeasure(e.target.value))} />
                      </td>
                      <td className="px-2 py-2">
                        <Input className="text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 h-8 w-28"
                          type="number"
                          value={watchedLineItems?.[i]?.unitPrice || ""}
                          onChange={e => updateLineItem(i, "unitPrice", Number(e.target.value))} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button type="button" onClick={() => lineItems.remove(i)}
                          className="text-red-500 hover:text-red-700">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <Button type="button" variant="outline"
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs"
                onClick={() => lineItems.append({ ...defaultLineItem, id: Date.now() })}
              >
                <Plus className="mr-1 h-3 w-3" /> Agregar Material
              </Button>
              <div className="text-right">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Total Venta</p>
                <p className="text-2xl font-black text-[#1E40AF] dark:text-blue-300">
                  ${(watchedLineItems ?? []).reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

        </div>
      </FormSection>

      {/* SECCIÓN 2 */}
      <FormSection title="Sección 2" subtitle="Los campos vacíos no aparecerán en el PDF.">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField control={form.control} name="validityDays" render={({ field }) => (
            <FormItem><FormLabel>Vigencia de cotización (días)</FormLabel><FormControl>
              <Input className={inputClass} type="number" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="paymentTerms" render={({ field }) => (
            <FormItem><FormLabel>Condiciones de pago</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. 17 días naturales" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="goodsOrigin" render={({ field }) => (
            <FormItem><FormLabel>Origen de bienes</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Nacional" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="deliveryTime" render={({ field }) => (
            <FormItem><FormLabel>Tiempo de entrega</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. 3 meses posteriores al fallo" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />

          <div className="md:col-span-2 space-y-2">
            <FormLabel>¿Incluir tiempo de fabricación?</FormLabel>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="hasManufacturingTime"
                  checked={hasManufacturingTime === true}
                  onChange={() => form.setValue("hasManufacturingTime", true, { shouldDirty: true })} />
                Sí
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="hasManufacturingTime"
                  checked={hasManufacturingTime === false}
                  onChange={() => {
                    form.setValue("hasManufacturingTime", false, { shouldDirty: true });
                    form.setValue("manufacturingTime", "");
                  }} />
                No
              </label>
            </div>
            {hasManufacturingTime === true && (
              <FormField control={form.control} name="manufacturingTime" render={({ field }) => (
                <FormItem><FormLabel>Tiempo de fabricación</FormLabel><FormControl>
                  <Input className={inputClass} placeholder="Ej. 2 meses" {...field} />
                </FormControl><FormMessage /></FormItem>
              )} />
            )}
          </div>

          <div className="md:col-span-2 space-y-3">
            <FormLabel>¿Lugar de entrega único?</FormLabel>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="deliverySingle"
                  checked={deliverySingle === true}
                  onChange={() => form.setValue("deliverySingle", true, { shouldDirty: true })} />
                Sí
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="deliverySingle"
                  checked={deliverySingle === false}
                  onChange={() => form.setValue("deliverySingle", false, { shouldDirty: true })} />
                No
              </label>
            </div>
            {deliverySingle ? (
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="deliveryLocation" render={({ field }) => (
                  <FormItem><FormLabel>Lugar de entrega</FormLabel><FormControl>
                    <Input className={inputClass} placeholder={'Ej. Hospital Militar de Zona de Ixcotel, Oax.'} {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="attnContacto" render={({ field }) => (
                  <FormItem><FormLabel>Contacto</FormLabel><FormControl>
                    <Input className={inputClass} placeholder="Ej. Coronel Ing. Ind. Fredy Ramírez Ruíz..." {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Lugares de entrega</FormLabel>
                  <button type="button"
                    className="rounded border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    onClick={() => deliveryLocations.append({ noPartida: "", address: "", contact: "" } as any)}>
                    + Agregar fila
                  </button>
                </div>
                <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                  <thead className="bg-green-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left">No. Partida</th>
                      <th className="px-3 py-2 text-left">Dirección</th>
                      <th className="px-3 py-2 text-left">Contacto</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryLocations.fields.map((f, i) => (
                      <tr key={f.id} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="px-2 py-1">
                          <FormField control={form.control} name={`deliveryLocations.${i}.noPartida` as any} render={({ field }) => (
                            <Input className={inputClass} placeholder="Ej. 6" {...field} />
                          )} />
                        </td>
                        <td className="px-2 py-1">
                          <FormField control={form.control} name={`deliveryLocations.${i}.address` as const} render={({ field }) => (
                            <Input className={inputClass} placeholder="Dirección" {...field} />
                          )} />
                        </td>
                        <td className="px-2 py-1">
                          <FormField control={form.control} name={`deliveryLocations.${i}.contact` as const} render={({ field }) => (
                            <Input className={inputClass} placeholder="Contacto" {...field} />
                          )} />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button type="button" onClick={() => deliveryLocations.remove(i)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold px-2">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </FormSection>

      {/* SECCIÓN 3 */}
      <FormSection title='Sección 3' subtitle="Agrega las garantías y selecciona los objetos sociales aplicables.">
        <div className="space-y-6">
          <div className="space-y-3">
            {(form.watch("qualityGuarantees") ?? [""]).map((_, i) => (
              <div key={i} className="flex gap-2 items-start">
                <FormItem className="flex-1">
                  <FormLabel className="text-xs text-slate-500">Garantía {i + 1}</FormLabel>
                  <Textarea
                    className={inputClass + " min-h-[80px]"}
                    placeholder={`Descripción de la garantía ${i + 1}`}
                    value={form.watch("qualityGuarantees")?.[i] ?? ""}
                    onChange={e => {
                      const current = [...(form.getValues("qualityGuarantees") ?? [])];
                      current[i] = e.target.value;
                      form.setValue("qualityGuarantees", current, { shouldDirty: true });
                    }}
                  />
                </FormItem>
                <button type="button"
                  className="mt-6 text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 rounded px-2 py-1"
                  onClick={() => {
                    const current = [...(form.getValues("qualityGuarantees") ?? [])];
                    current.splice(i, 1);
                    form.setValue("qualityGuarantees", current, { shouldDirty: true });
                  }}>✕</button>
              </div>
            ))}
            <button type="button"
              className="rounded border border-cyan-400 px-3 py-1 text-sm text-cyan-600 font-semibold hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition"
              onClick={() => {
                const current = [...(form.getValues("qualityGuarantees") ?? [])];
                current.push("");
                form.setValue("qualityGuarantees", current, { shouldDirty: true });
              }}>
              + Agregar garantía
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel>Documentación requerida</FormLabel>
              <button type="button"
                className="rounded border border-cyan-400 px-3 py-1 text-sm text-cyan-600 font-semibold hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition"
                onClick={() => {
                  const current = [...(form.getValues("requiredDocuments") ?? [])];
                  current.push("");
                  form.setValue("requiredDocuments", current, { shouldDirty: true });
                }}>
                + Agregar documento
              </button>
            </div>
            {(form.watch("requiredDocuments") ?? [""]).map((_, i) => (
              <div key={i} className="flex gap-2 items-start">
                <FormItem className="flex-1">
                  <FormLabel className="text-xs text-slate-500">Documento {i + 1}</FormLabel>
                  <Textarea
                    className={inputClass + " min-h-[70px]"}
                    placeholder={`Ej. Copia de identificación oficial...`}
                    value={form.watch("requiredDocuments")?.[i] ?? ""}
                    onChange={e => {
                      const current = [...(form.getValues("requiredDocuments") ?? [])];
                      current[i] = e.target.value;
                      form.setValue("requiredDocuments", current, { shouldDirty: true });
                    }}
                  />
                </FormItem>
                <button type="button"
                  className="mt-6 text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 rounded px-2 py-1"
                  onClick={() => {
                    const current = [...(form.getValues("requiredDocuments") ?? [])];
                    current.splice(i, 1);
                    form.setValue("requiredDocuments", current, { shouldDirty: true });
                  }}>✕</button>
              </div>
            ))}
          </div>

          {/* TABLA PTDA / DESCRIPCIÓN / NORMA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel>Descripción y norma aplicable</FormLabel>
              <button type="button"
                className="rounded border border-cyan-400 px-3 py-1 text-sm text-cyan-600 font-semibold hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition"
                onClick={() => {
                  const current = [...(form.getValues("normsTable") ?? [])];
                  current.push({ description: "", norm: "" });
                  form.setValue("normsTable", current, { shouldDirty: true });
                }}>
                + Agregar fila
              </button>
            </div>
            <div className="border rounded-xl overflow-hidden shadow-sm dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-green-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-center w-14">PTDA.</th>
                    <th className="px-3 py-2 text-left">DESCRIPCIÓN</th>
                    <th className="px-3 py-2 text-left">NORMA</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {(form.watch("normsTable") ?? []).map((_, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-3 py-2 text-center font-bold text-slate-400">{i + 1}</td>
                      <td className="px-2 py-2">
                        <Textarea
                          className={inputClass + " min-h-[70px] text-xs"}
                          placeholder="Ej. Extintores portátiles de P.Q.S. de 6 kg de capacidad."
                          value={form.watch("normsTable")?.[i]?.description ?? ""}
                          onChange={e => {
                            const current = [...(form.getValues("normsTable") ?? [])];
                            current[i] = { ...current[i], description: e.target.value };
                            form.setValue("normsTable", current, { shouldDirty: true });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Textarea
                          className={inputClass + " min-h-[70px] text-xs"}
                          placeholder="Ej. NOM-104-STPS-2001. Seguridad-Extintores..."
                          value={form.watch("normsTable")?.[i]?.norm ?? ""}
                          onChange={e => {
                            const current = [...(form.getValues("normsTable") ?? [])];
                            current[i] = { ...current[i], norm: e.target.value };
                            form.setValue("normsTable", current, { shouldDirty: true });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button type="button"
                          className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 rounded px-2 py-1"
                          onClick={() => {
                            const current = [...(form.getValues("normsTable") ?? [])];
                            current.splice(i, 1);
                            form.setValue("normsTable", current, { shouldDirty: true });
                          }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <FormLabel>Objetos sociales</FormLabel>
            <p className="text-xs text-slate-500">Selecciona los que apliquen:</p>
            <div className="space-y-2 rounded border border-slate-200 dark:border-slate-700 p-3">
              {SOCIAL_OBJECTS.map((obj) => (
                <label key={obj} className="flex items-start gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" className="mt-0.5 accent-cyan-500"
                    checked={(selectedSocialObjects ?? []).includes(obj)}
                    onChange={() => toggleSocialObject(obj)} />
                  <span>{obj}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </FormSection>

    </Form>
  );
}
