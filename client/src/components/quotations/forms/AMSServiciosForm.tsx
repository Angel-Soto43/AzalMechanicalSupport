import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { FormSection } from "./FormSection";
import type { AMSFormData } from "./form-types";

interface AMSServiciosFormProps {
  companyName?: string;
  values: Pick<AMSFormData, "serviceScope" | "serviceOrigin" | "providerNationality" | "serviceSchedule" | "serviceInspection" | "complianceWarranty" | "similarContracts" | "experienceYears" | "specialtyYears" | "qualityStandards" | "warrantyCoverage">;
  onChange: (values: Pick<AMSFormData, "serviceScope" | "serviceOrigin" | "providerNationality" | "serviceSchedule" | "serviceInspection" | "complianceWarranty" | "similarContracts" | "experienceYears" | "specialtyYears" | "qualityStandards" | "warrantyCoverage">) => void;
}

export function AMSServiciosForm({ companyName, values, onChange }: AMSServiciosFormProps) {
  const form = useForm({
    defaultValues: values,
    mode: "onChange",
  });

  useEffect(() => {
    form.reset(values);
  }, [values, form]);

  useEffect(() => {
    const subscription = form.watch((currentValues) => {
      onChange(currentValues as AMSServiciosFormProps["values"]);
    });

    return () => subscription.unsubscribe();
  }, [form, onChange]);

  return (
    <Form {...form}>
      <FormSection
        title="AMS Servicios"
        subtitle={companyName ? `Proveedor seleccionado: ${companyName}` : "Selecciona un proveedor para adaptar el formulario AMS."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="serviceScope"
            rules={{ required: "Describe el alcance del servicio." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alcance del servicio</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe los servicios a entregar" {...field} className="min-h-[112px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="qualityStandards"
            rules={{ required: "Agrega los estándares de calidad del servicio." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estándares de calidad</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ej. entregables, revisión técnica, horas de trabajo" {...field} className="min-h-[112px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serviceOrigin"
            rules={{ required: "Origen del servicio es obligatorio." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origen del servicio</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. Nacional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="providerNationality"
            rules={{ required: "Nacionalidad del proveedor es obligatoria." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nacionalidad del proveedor</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. Mexicana" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serviceSchedule"
            rules={{ required: "Define el cronograma de entrega." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cronograma de entrega</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. A partir de la comunicación del fallo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serviceInspection"
            rules={{ required: "Especifica el criterio de inspección." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Criterio de inspección</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ej. Acta de aceptación, dictamen técnico" {...field} className="min-h-[112px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="experienceYears"
            rules={{
              required: "Años de experiencia es obligatorio.",
              min: { value: 0, message: "Ingresa un valor mayor o igual a 0." },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Años de experiencia</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specialtyYears"
            rules={{
              required: "Años de especialidad es obligatorio.",
              min: { value: 0, message: "Ingresa un valor mayor o igual a 0." },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Años de especialidad</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="complianceWarranty"
            rules={{
              required: "La garantía de cumplimiento es obligatoria.",
              min: { value: 0, message: "Ingresa un valor mayor o igual a 0." },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>% de garantía de cumplimiento</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="similarContracts"
            rules={{
              required: "Contratos afines es obligatorio.",
              min: { value: 0, message: "Ingresa un valor válido." },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contratos afines</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="warrantyCoverage"
            rules={{ required: "Describe la cobertura de garantía." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cobertura de garantía</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ej. Garantía de cumplimiento documentada" {...field} className="min-h-[112px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>
    </Form>
  );
}
