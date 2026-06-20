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
  "Proporcionar el servicio de diseño, desarrollo e implementación de la ingeniería metal mecánica y automatizada aplicada a procesos industriales en el ramo automotriz, aeronáutico y militar.",
  "Adquirir, fabricar, ensamblar, procesar, preparar, reparar, vender, comprar, distribuir, importar y exportar armamento, municiones, vehículos (blindados, militares y convencionales) y aeronaves (militares y convencionales).",
  "Adquirir, fabricar, ensamblar, procesar, preparar, reparar, vender, comprar, distribuir, importar, exportar e instalar todo tipo de refacciones e insumos para la industria automotriz, aeronáutica y militar tales como armamento, municiones, vehículos (blindados, militares y convencionales) y aeronaves (militares y convencionales).",
  "Proporcionar servicio de diseño, instalación, mantenimiento, soporte técnico, así como el suministro, venta, compra e importación de refacciones para el equipamiento y maquinaria industrial convencionales o computarizadas en el ramo automotriz, aeronáutico y militar aplicado a la industria metal mecánica.",
  "Adquirir, procesar, vender, comprar, distribuir, importar y exportar todo tipo de químicos que se utilizan en la industria automotriz, aeronáutica y militar como materia prima o producto terminado, incluyendo las sustancias peligrosas que establece la NORMA Oficial Mexicana NOM-002-SCT/2011, Listado de las substancias y materiales peligrosos más usualmente transportados.",
  "Adquirir, fabricar, ensamblar, procesar, preparar, reparar,  vender, comprar, distribuir, importar, exportar e instalar todo tipo de resortes, muelles, tornillos, pernos, tuercas, arandelas, herramientas de corte, herramientas manuales, dispositivos, calibres troqueles y en general todo tipo de componentes estándar, herramienta y utillaje, especialmente pero no limitado para la industria vehicular, aeronáutica, militar y/u otras industrias sin limitación de trabajar y manipular todo tipo de cobre, acero hierro estaño plomo zinc, titanio y un sinfín de material existente utilizado en la fabricación metal mecánica.",
  "Adquirir, fabricar, ensamblar, procesar, preparar, reparar, vender, comprar, arrendar, distribuir, importar, exportar e instalar todo tipo de equipos electrónicos, material eléctrico y equipo de cómputo, aplicados a la industria automotriz, aeronáutica y militar.",
  "Adquirir, procesar, vender, comprar, distribuir, importar, exportar, diseñar, implementar software aplicado a la industria automotriz, aeronáutica y militar.",
  "La compra y/o venta de accesorios y refacciones, la compra, venta, importación, exportación, comisión consignación, representación corretaje, agencia, franquicia, licencia, concesión, fabricación, maquila, diseño, exposición, elaboración, envasado, empacado, servicio, mantenimiento, reparación, financiamiento, arrendamiento, subarrendamiento, arrendamiento puro, distribución y comercio en general, de toda clase de artículos, vehículos nuevos y usados, bienes  muebles e inmuebles y productos ya sean de uso industrial, militar, comercial y doméstico, así como de maquinaria, equipo y herramientas necesarias para su fabricación, sus partes, materias primas, accesorios y refacciones y toda clase de actividades, artículos y/o productos relacionados con el objeto enunciado.",
];

type FormValues = Pick<AMSFormData,
  | "attnLugar" | "attnDia" | "attnMes" | "attnAnio" | "attnGrado" | "contactPerson" | "destinationCompany" | "attnArea" | "attnUbicacion" | "attnDireccion"
  | "projectTitle" | "attnContacto" | "attnCargo"
  | "validityDays" | "paymentTerms" | "goodsOrigin" | "deliveryTime"
  | "deliverySingle" | "deliveryLocation" | "deliveryLocations" | "deliveryConditions"
  | "qualityGuarantees" | "selectedSocialObjects"
  | "lineItems"
>;

interface AMSServiciosFormProps {
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

export function AMSServiciosForm({ companyName, values, onChange }: AMSServiciosFormProps) {
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
          <FormField control={form.control} name="attnNombre" render={({ field }) => (
            <FormItem><FormLabel>Nombre</FormLabel><FormControl>
              <Input className={inputClass} placeholder="Ej. Vicente Herrera Valdez" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="attnDependencia" render={({ field }) => (
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
            <FormField control={form.control} name="attnNombreProcedimiento" render={({ field }) => (
              <FormItem><FormLabel>Nombre del procedimiento</FormLabel><FormControl>
                <Input className={inputClass} placeholder={'Ej. "MANTENIMIENTO Y OPERACIÓN DEL SISTEMA DIGITAL DE SANIDAD.'} {...field} />
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
                        <Input className={inputClass + " text-xs"} placeholder="Ej. Servicio de mantenimiento..."
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
                    <Input className={inputClass} placeholder={'Ej. Hospital Militar de Zona de Ixcotel, Oax., en el interior del Campo Mil. No. 28-A "Gral. Bgda. Antonio...'} {...field} />
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="attnContacto" render={({ field }) => (
                    <FormItem><FormLabel>Contacto</FormLabel><FormControl>
                      <Input className={inputClass} placeholder="Ej. Coronel Ing. Ind. Fredy Ramírez Ruíz Jefe de la Ensambladora Militar, o quien haga sus veces al momento de la recepción, Teléfono: 276-688-3229..." {...field} />
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