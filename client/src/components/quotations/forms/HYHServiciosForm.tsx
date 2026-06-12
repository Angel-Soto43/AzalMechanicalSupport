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
    "La sociedad podrá realizar toda clase de actos, convenios, contratos, operaciones y en general todas las actividades necesarias para el cumplimiento de su objeto social, ya sean civiles, mercantiles o de cualquier otra naturaleza, aceptando u otorgando toda clase de comisiones mercantiles y mandatos, obrando en su propio nombre o en nombre del comitente o mandante; contratar al personal necesario para el cumplimiento de los fines sociales o delegar en una o varias personas el cumplimiento de mandatos, comisiones, servicios y demás actividades propias de su objeto, salvo lo expresamente prohibido por las leyes, el presente acto constitutivo y lo establecido en la Ley de Inversión Extranjera.",
    "La sociedad tiene como actividad principal Comercio al por mayor de materiales metálicos, Comercio al por mayor de maquinaria y equipo para otros servicios y para actividades comerciales, Comercio al por mayor de maquinaria y equipo para la industria manufacturera.",
    "Ejecutar toda clase de actos de comercio, pudiendo comprar y vender, importar y exportar toda clase de artículos y mercancías, así como la prestación de toda clase de servicios.",
    "Contratar activa o pasivamente toda clase de prestaciones de servicios, celebrar contratos, convenios, así como adquirir por cualquier título patentes, marcas industriales, nombres comerciales, opciones y preferencias, derechos de propiedad literaria, industrial, artística o concesiones.",
    "Recibir pagos, intentar y desistirse de todo tipo de demandas, procesos y procedimientos, inclusive del juicio de amparo, otorgar y suscribir toda clase de documentos públicos y privados, inclusive convenios de mediación referidos por las leyes de mediación o justicia alternativa, hacer manifestaciones, renuncias, protestas aún las establecidas por la Constitución Política de los Estados Unidos Mexicanos, para articular, y absolver posiciones en juicio y fuera de él, para recusar, para transigir, para tachar testigos, para comprometerse en árbitros, para presentar demandas, quejas, querellas y denuncias, ratificarlas y ampliarlas desistirse de las mismas y constituirse en tercero coadyuvante del Ministerio Público, otorgar perdón judicial en su caso, aportar pruebas, solicitar quiebras, concursos mercantiles, y en general para iniciar, proseguir y dar término en cualquier forma, a toda clase de demandas, recursos, arbitrajes, mediaciones, procesos y procedimientos de cualquier orden y designar a una o más personas en los términos dispuestos por el artículo 1069 del Código de Comercio.",
    "Realizar contratos y operaciones de crédito, arrendamiento financiero y factoraje financiero en los términos previstos y autorizados por la Ley General de Títulos y Operaciones de Crédito, y demás disposiciones legales aplicables.",
    "Emitir, otorgar, suscribir, aceptar, girar, librar, endosar, avalar y ceder toda clase de títulos de crédito, en los términos referidos por el artículo noveno de la Ley General de Títulos y Operaciones de Crédito sin limitación alguna, así como abrir y cancelar cuentas de banco de forma individual y suscripción de toda clase de títulos de crédito.",
    "Aceptar o conferir toda clase de comisiones mercantiles y mandatos, obrando en su propio nombre o en nombre del comitente o mandaste.",
    "Adquirir, transmitir, enajenar o gravar por cualquier título, inclusive hipoteca, así como poseer y explotar toda clase de bienes muebles e inmuebles, constituir, transmitir, modificar o extinguir derechos reales y personales, respecto de los mismos.",
    "Contratar al personal necesario para el cumplimiento de los fines sociales o delegar en una o varias personas el cumplimiento de mandatos, comisiones, servicios y demás actividades propias de su objeto.",
    "Otorgar avales y obligarse solidariamente por terceros, así como constituir garantías a favor de terceros.",
    "Suscribir y celebrar toda clase de actos, convenios, contratos y documentos, hacer renuncias, contraer obligaciones, otorgar fianzas, y gravámenes.",
    "Concurrir y participar en toda clase de concursos y licitaciones públicas o privadas de cualquier clase, convocadas por particulares o por los Gobiernos Federal, Estatales, de la Ciudad de México, Municipales, sus dependencias, entidades y órganos u organismos desconcentrados, descentralizados, empresas de participación estatal, fideicomisos públicos y en general cualquier dependencia o entidad ya sea de la Administración Pública Federal, de la Ciudad de México, de las Entidades Federativas de la República Mexicana, o de sus Municipios, con todas las facultades necesarias para que entre otros actos pueda firmar ofertas, cartas de garantías, presentar y firmar ofertas técnicas o económicas, asistir y participar en los actos de apertura de ofertas y firmar las actas correspondientes y los pedidos en su caso y cobrar todo tipo de adeudos, asistir a los actos de evaluación o discusión técnica de las ofertas que presente, asistir al acto de fallo y firma de actas correspondientes, adjudicarse contratos que resulten de los fallos conferidos a su favor, así como realizar cualquier trámite o gestión necesarios, convenientes o conducentes ante las dependencias o entidades u organismos de cualquier instancia, sean Federales, Estatales, de la Ciudad de México, o Municipales.",
    "Participar en el capital de cualquier tipo de sociedad, ya sea mercantil, civil o de cualquier otra índole.",
    "Participar y recibir apoyos y subsidios de los programas de los Gobiernos Municipales, Estatales y Federal."
];

type FormValues = Pick<AMSFormData,
  | "attnLugar" | "attnDia" | "attnMes" | "attnAnio" | "attnGrado" | "attnNombre" | "attnDependencia" | "attnArea" | "attnUbicacion" | "attnDireccion"
  | "attnNombreProcedimiento" | "attnContacto" | "attnCargo"
  | "validityDays" | "paymentTerms" | "goodsOrigin" | "deliveryTime"
  | "deliverySingle" | "deliveryLocation" | "deliveryLocations" | "deliveryConditions"
  | "qualityGuarantees" | "selectedSocialObjects"
  | "lineItems"
>;

interface HYHServiciosFormProps {
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

export function HYHServiciosForm({ companyName, values, onChange }: HYHServiciosFormProps) {
  const initialized = useRef(false);

  const form = useForm<FormValues>({
    defaultValues: values,
    mode: "onChange",
  });

  const deliveryLocations = useFieldArray({ control: form.control, name: "deliveryLocations" });
  const qualityGuarantees = useFieldArray({ control: form.control, name: "qualityGuarantees" as any });
  const lineItems = useFieldArray({ control: form.control, name: "lineItems" });

  const deliverySingle = form.watch("deliverySingle");
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
      item.unitPrice = item.previo;
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
                <Input className={inputClass} placeholder={'Ej. "MANTENIMIENTO Y OPERACIÃ“N DEL SISTEMA DIGITAL DE SANIDAD.'} {...field} />
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
                        <Input className={inputClass + " text-xs"} placeholder="Ej. Servicio de mantenimiento..."
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
            <FormItem><FormLabel>Origen del servicio</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Nacional" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="deliveryTime" render={({ field }) => (
            <FormItem><FormLabel>Tiempo de entrega</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. 3 meses posteriores al fallo" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />

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

          {/* Condiciones de entrega */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel>Condiciones de entrega</FormLabel>
              <button
                type="button"
                className="rounded border border-cyan-400 px-3 py-1 text-sm text-cyan-600 font-semibold hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition"
                onClick={() => {
                  const current = [...(form.getValues("deliveryConditions") ?? [])];
                  current.push("");
                  form.setValue("deliveryConditions", current, { shouldDirty: true });
                }}
              >
                <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Agregar condiciÃ³n</span>
              </button>
            </div>
            {(form.watch("deliveryConditions") ?? [""]).map((_, i) => (
              <div key={i} className="flex gap-2 items-start">
                <FormItem className="flex-1">
                  <FormLabel className="text-xs text-slate-500">CondiciÃ³n {i + 1}</FormLabel>
                  <Textarea
                    className={inputClass + " min-h-[70px]"}
                    placeholder="Ej. La entrega deberÃ¡ realizarse en dÃ­as hÃ¡biles..."
                    value={form.watch("deliveryConditions")?.[i] ?? ""}
                    onChange={e => {
                      const current = [...(form.getValues("deliveryConditions") ?? [])];
                      current[i] = e.target.value;
                      form.setValue("deliveryConditions", current, { shouldDirty: true });
                    }}
                  />
                </FormItem>
                <button
                  type="button"
                  className="mt-6 text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 rounded px-2 py-1"
                  onClick={() => {
                    const current = [...(form.getValues("deliveryConditions") ?? [])];
                    current.splice(i, 1);
                    form.setValue("deliveryConditions", current, { shouldDirty: true });
                  }}
                >âœ•</button>
              </div>
            ))}
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

