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
  "Fabricación, preparación, suministro, distribución, instalación, soporte, compra, venta, importación y exportación de materias primas, productos semiterminados, productos finales y toda clase de elementos propios de la industria metalmecánica aplicada a procesos industriales y de manufactura.",
  "Diseño, ingeniería, fabricación, asesoría técnica, instalación, mantenimiento, compra, venta e importación de maquinaria convencional, automática y Control Numérico Computarizado (C.N.C.), así como equipo industrial, insumos y refacciones relacionadas con procesos de manufactura en la industria metalmecánica.",
  "Diseño, ingeniería, fabricación, asesoría técnica, desarrollo e implementación, ensamble, instalación y soporte, mantenimiento, mano de obra especializada, compra, venta e importación de maquinaria especializada, dispositivos, accesorios, equipo industrial, refacciones e insumos en general utilizados en procesos relacionados con la industria manufacturera, metalmecánica, automotriz, construcción, química, y la industria en general.",
  "Fabricación, asesoría técnica, preparación, suministro, distribución, instalación y soporte, compra, venta e importación de toda clase de productos químicos empleados como materias primas, insumos en la elaboración de productos, aditivos o catalizadores, así como en procesos de limpieza, desengrasado, tratamientos superficiales y térmicos, de galvanoplastia; así como químicos en general empleados en los procesos producción de la industria manufacturera, automotriz y construcción.",
  "Adquirir, distribuir, comprar, vender, ensamblar, vender, procesar, distribuir, importar y exportar, todo tipo de fierros, aceros aleados, aceros no aleados, aceros inoxidables, aceros laminados o estructurales, aluminios, bronces, cobres, zamak, plomo, zinc, níquel, estaño, empleados en la industria manufacturera, metalmecánica, automotriz, y de la construcción.",
  "Proporcionar servicios de diseño e ingeniería, fabricación, asesoría técnica, desarrollo e implementación, ensamble, instalación y soporte, mantenimiento, mano de obra especializada, compra, venta e importación de equipos básicos, industriales y especializados, insumos y refacciones utilizados en todo tipo de instalaciones que requieran almacenamiento y distribución de energía eléctrica para su operación.",
  "Proporcionar servicios de diseño e ingeniería, fabricación, asesoría técnica, desarrollo e implementación, ensamble, instalación y soporte, mantenimiento, mano de obra especializada, compra, venta e importación de equipo industrial, insumos y refacciones utilizadas en la operación de plantas de tratamiento de aguas residuales, pozos profundos, potabilizadoras y purificadoras de agua, aires acondicionados industriales, manejadoras de aire, calderas, sistemas de calentamiento de agua, hidroneumáticos, cuartos fríos, sistemas de refrigeración, conservación y congelamiento.",
  "Diseño, ingeniería, fabricación, asesoría técnica, desarrollo e implementación, ensamble, instalación y soporte, mantenimiento, mano de obra especializada, compra, venta e importación de equipos de laboratorio industrial, de investigación científica, médico, servicios forenses y periciales, criminalística, criminología y en general, todo tipo de equipos de laboratorio empleados para la realización de pruebas y ensayos específicos.",
  "Adquirir, distribuir, comprar, vender, ensamblar, vender, distribuir, importar y exportar todo tipo de equipo de protección personal para el ámbito industrial, médico, farmacéutico, de laboratorio, equipos de alarma y evacuación, equipos de primeros auxilios, equipos de primera y segunda intervención, equipos contra incendios, entre otros.",
  "Adquirir, distribuir, comprar, vender, ensamblar, procesar, vender, distribuir, importar y exportar todo tipo de herramientas de corte, manuales, eléctricas, portátiles, empleadas en equipos industriales, accesorios, maquinaria convencional y de Control Numérico Computarizado (C.N.C.).",
  "Adquirir, distribuir, comprar, vender, ensamblar, procesar, vender, distribuir, importar y exportar todo tipo de herramientas de fabricación especial como moldes de inyección de plástico y de metal, troqueles, calibres, verificadores, y demás utillaje especial empleados en procesos de manufactura, así como equipos industriales, accesorios e instrumentos de medición.",
  "Adquirir, distribuir, comprar, vender, ensamblar, procesar, vender, distribuir, importar y exportar todo tipo de aparatos eléctricos y electrónicos, de cómputo, videovigilancia y de impresión.",
  "Proporcionar servicios de desarrollo y soporte, asesoría técnica, implementación, instalación, mantenimiento, mano de obra especializada, compra, venta e importación de software comercial, industrial, especializado, personalizado y desarrollo de aplicaciones para la automatización de procesos, operaciones de manufactura, gestión de la producción, gestión de la cadena de suministro, prevención, seguridad, entre otros, empleados en aplicaciones y desarrollos médicos, en los procesos producción de la industria manufacturera, automotriz y construcción, en la investigación científica, pericial y de peritaje.",
  "Adquirir, distribuir, comprar, vender, ensamblar, procesar, vender, distribuir, importar y exportar artículos de papelería, de oficina, mobiliario, consumibles, productos de cómputo y accesorios, sellos mecánicos, equipo de copiado, impresión, escaneo, enmecado, engargolado, entre otros, empleados en la industria en general.",
  "Fabricación, adquisición, producción, disposición, aplicación, preparación, manipulación y acabado, diagnóstico, tratamiento e impregnación para su protección y conservación, compra y venta de madera en general y de productos químicos utilizados para la conservación de maderas, elementos, útiles y enseres de dicha naturaleza empleados en los procesos producción de la industria manufacturera, automotriz y construcción.",
  "La compra y/o venta de accesorios y refacciones, la compra, venta, importación, exportación, comisión, consignación, representación, corretaje, agencia, franquicia, licencia, concesión, fabricación, maquila, diseño, exposición, elaboración, envasado, empacado, servicio, mantenimiento, reparación, financiamiento, arrendamiento, subarrendamiento, arrendamiento puro, distribución y comercio en general, de toda clase de artículos, vehículos nuevos y usados, bienes muebles e inmuebles y productos ya sean de uso industrial, comercial y doméstico, así como de maquinaria, equipo herramientas necesarias para su fabricación, sus partes, materias primas, accesorios y refacciones y toda clase de actividades, artículos y/o productos relacionados con el objeto enunciado.",
  "Realizar toda clase de actos, trámites y gestiones en nombre y representación de terceros, compareciendo ante toda clase de personas físicas y morales del sector privado y público, autoridades en sus distintos niveles: federal, estatal y municipal, autoridades agrarias, judiciales, administrativas, civiles, penales y del trabajo federales y locales.",
  "Licitar y concursar ante autoridades federales, estatales y municipales para la explotación de servicios públicos dados en administración o para financiar proyectos de desarrollo económico a niveles locales, regionales y nacionales relacionados con el objeto social.",
  "El establecimiento de plantas renovadoras de neumáticos o de otras refacciones, talleres, bodegas, almacenes, oficinas, agencias y sucursales necesarios y convenientes para la realización del objeto social.",
  "La publicidad de los productos anteriores y el uso de sus nombres comerciales, a través de los medios que se estimen más adecuados.",
  "La obtención, adquisición, uso, enajenación y en general, la explotación y concesión en uso, por cualquier medio legal, de patentes, invenciones, modelos industriales, marcas o nombres comerciales, marcas propias, regalías y derechos de autor, relacionadas directa o indirectamente con el objeto social. ",
  "Concurrir como socio de otras personas morales, bien sea en su constitución o adquiriendo acciones en las ya existentes, así como toda clase de valores, de acuerdo con las disposiciones legales vigentes.",
  "Ser agente, representante, comisionista o mandatario de empresas nacionales o extranjeras, fabricantes o comerciantes de los bienes, productos, servicios y elementos necesarios para la consecución de su objeto social.",
  "Contratar al personal necesario para el cumplimiento de los fines sociales y delegar en una o varias personas el cumplimiento de mandatos, comisiones y demás actividades propias de su objeto.",
  "Obtener y recibir dinero en préstamo con o sin garantía, emitir bonos, cédulas hipotecarias, obligaciones y otros títulos de crédito con la participación de las instituciones que en cada caso se requiera, de acuerdo con la Ley.",
  "La producción en general de anuncios publicitarios, comerciales interactivos e impresos; así como la realización de todo tipo de actividad que tenga por objeto el negocio de la publicidad en general, incluyendo diseño, preparación y elaboración de avisos y anuncios comerciales y la colocación de los mismos, así como la preparación y realización de campañas publicitarias para dar a conocer productos de toda clase de servicios a empresas e instituciones comerciales, industriales, bancarias, cívicas y artísticas.",
  "La compra, venta y renta de todo tipo de cajas de luz, anuncios y espacios publicitarios.",
  "El análisis y estudio de mercados y la prestación de servicios de mercadotecnia.",
  "Suministro y servicios a municipios, Estados y/o Federación en todo lo relacionado a su giro.",
  "Todas las demás actividades que permitan la óptima realización del objeto social.",
  "En general realizar y/o llevar a cabo en el País o en el extranjero, por cuenta propia o de terceros, toda clase de actos, contratos o convenios principales o accesorios, civiles o mercantiles o de cualquier otra naturaleza, que sean necesarios o convenientes para la realización de los objetos antes mencionados.",
];

type FormValues = Pick<AMSFormData,
  | "attnLugar" | "attnDia" | "attnMes" | "attnAnio" | "attnGrado" | "attnNombre" | "attnDependencia" | "attnArea" | "attnUbicacion" | "attnDireccion"
  | "attnNombreProcedimiento" | "attnContacto" | "attnCargo"
  | "validityDays" | "paymentTerms" | "goodsOrigin" | "deliveryTime"
  | "hasManufacturingTime" | "manufacturingTime"
  | "deliverySingle" | "deliveryLocation" | "deliveryLocations"
  | "qualityGuarantees" | "selectedSocialObjects"
  | "lineItems"
>;

interface HERMALBienesFormProps {
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

export function HERMALBienesForm({ companyName, values, onChange }: HERMALBienesFormProps) {
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

      {/* SECCIÃ“N 1 */}
      <FormSection title='SecciÃ³n 1' subtitle="Solo aparecerÃ¡n en el PDF los campos que se llenen.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 grid grid-cols-3 gap-4">
            <FormField control={form.control} name="attnDia" render={({ field }) => (
              <FormItem><FormLabel>DÃ­a</FormLabel><FormControl>
                <Input className={inputClass} placeholder="Ej. 10" {...field} />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="attnMes" render={({ field }) => (
              <FormItem><FormLabel>Mes</FormLabel><FormControl>
                <Input className={inputClass} placeholder="Ej. junio" {...field} />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="attnAnio" render={({ field }) => (
              <FormItem><FormLabel>AÃ±o</FormLabel><FormControl>
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
          <FormField control={form.control} name="attnNombre" render={({ field }) => (
            <FormItem><FormLabel>Nombre</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Vicente Herrera Valdez" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="attnDependencia" render={({ field }) => (
            <FormItem><FormLabel>Dependencia</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. SecretarÃ­a de la Defensa Nacional" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="attnArea" render={({ field }) => (
            <FormItem><FormLabel>Ãrea</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Comedor, puerta 4 Ã©tc..." {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="attnUbicacion" render={({ field }) => (
            <FormItem><FormLabel>UbicaciÃ³n</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. CARRETERA FEDERAL 140-D KILOMETRO 1.5, C.P. 68200..." {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="attnDireccion" render={({ field }) => (
            <FormItem><FormLabel>DirecciÃ³n</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Av. DirecciÃ³n General de Sanidad" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="attnCargo" render={({ field }) => (
            <FormItem><FormLabel>Cargo</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Jefe de I.M. de la Dir. Gral. Ind. Mil." {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <div className="md:col-span-2">
            <FormField control={form.control} name="attnNombreProcedimiento" render={({ field }) => (
              <FormItem><FormLabel>Nombre del procedimiento</FormLabel><FormControl>
                <Input className={inputClass} placeholder={'Ej. RequisiciÃ³n No. FA09-R001/2026, "AdquisiciÃ³n de polÃ­meros A".'} {...field} />
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
                    <th className="px-3 py-2 text-left min-w-[200px]">DescripciÃ³n / Esp. TÃ©cnica</th>
                    <th className="px-3 py-2 text-left min-w-[160px]">Req. / VersiÃ³n / Fecha</th>
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
                      <td className="px-2 py-2 text-center font-bold text-slate-400">{i + 1}</td>
                      <td className="px-2 py-2">
                        <Input className={inputClass + " text-xs"} placeholder="Ej. Cinta de aluminio..."
                          value={watchedLineItems?.[i]?.description ?? ""}
                          onChange={e => updateLineItem(i, "description", e.target.value)} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="space-y-1">
                          <Input className={inputClass + " text-[10px] h-6"} placeholder="Req. tÃ©cnicos"
                            value={watchedLineItems?.[i]?.techRequirements ?? ""}
                            onChange={e => updateLineItem(i, "techRequirements", e.target.value)} />
                          <div className="flex gap-1">
                            <Input className={inputClass + " text-[10px] h-6 w-1/2"} placeholder="VersiÃ³n"
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

      {/* SECCIÃ“N 2 */}
      <FormSection title="SecciÃ³n 2" subtitle="Los campos vacÃ­os no aparecerÃ¡n en el PDF.">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField control={form.control} name="validityDays" render={({ field }) => (
            <FormItem><FormLabel>Vigencia de cotizaciÃ³n (dÃ­as)</FormLabel><FormControl>
              <Input className={inputClass} type="number" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="paymentTerms" render={({ field }) => (
            <FormItem><FormLabel>Condiciones de pago</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. 17 dÃ­as naturales" {...field} />
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
            <FormLabel>Â¿Incluir tiempo de fabricaciÃ³n?</FormLabel>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="hasManufacturingTime"
                  checked={hasManufacturingTime === true}
                  onChange={() => form.setValue("hasManufacturingTime", true, { shouldDirty: true })} />
                SÃ­
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
                <FormItem><FormLabel>Tiempo de fabricaciÃ³n</FormLabel><FormControl>
                  <Input className={inputClass} placeholder="Ej. 2 meses" {...field} />
                </FormControl><FormMessage /></FormItem>
              )} />
            )}
          </div>

          <div className="md:col-span-2 space-y-3">
            <FormLabel>Â¿Lugar de entrega Ãºnico?</FormLabel>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="deliverySingle"
                  checked={deliverySingle === true}
                  onChange={() => form.setValue("deliverySingle", true, { shouldDirty: true })} />
                SÃ­
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
                    <Input className={inputClass} placeholder="Ej. Coronel Ing. Ind. Fredy RamÃ­rez RuÃ­z..." {...field} />
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
                      <th className="px-3 py-2 text-left">DirecciÃ³n</th>
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
                            <Input className={inputClass} placeholder="DirecciÃ³n" {...field} />
                          )} />
                        </td>
                        <td className="px-2 py-1">
                          <FormField control={form.control} name={`deliveryLocations.${i}.contact` as const} render={({ field }) => (
                            <Input className={inputClass} placeholder="Contacto" {...field} />
                          )} />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button type="button" onClick={() => deliveryLocations.remove(i)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold px-2">âœ•</button>
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

      {/* SECCIÃ“N 3 */}
      <FormSection title='SecciÃ³n 3' subtitle="Agrega las garantÃ­as y selecciona los objetos sociales aplicables.">
        <div className="space-y-6">
          <div className="space-y-3">
            {(form.watch("qualityGuarantees") ?? [""]).map((_, i) => (
              <div key={i} className="flex gap-2 items-start">
                <FormItem className="flex-1">
                  <FormLabel className="text-xs text-slate-500">GarantÃ­a {i + 1}</FormLabel>
                  <Textarea
                    className={inputClass + " min-h-[80px]"}
                    placeholder={`DescripciÃ³n de la garantÃ­a ${i + 1}`}
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
                  }}>âœ•</button>
              </div>
            ))}
            <button type="button"
              className="rounded border border-cyan-400 px-3 py-1 text-sm text-cyan-600 font-semibold hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition"
              onClick={() => {
                const current = [...(form.getValues("qualityGuarantees") ?? [])];
                current.push("");
                form.setValue("qualityGuarantees", current, { shouldDirty: true });
              }}>
              + Agregar garantÃ­a
            </button>
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

