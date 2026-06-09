import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { FormSection } from "./FormSection";
import type { AMSFormData } from "./form-types";

interface AMSBienesFormProps {
  companyName?: string;
  values: Pick<AMSFormData, "technicalScope" | "goodsOrigin" | "providerNationality" | "manufacturingTime" | "deliveryTime" | "complianceWarranty" | "similarContracts" | "qualityStandards" | "warrantyCoverage">;
  onChange: (values: Pick<AMSFormData, "technicalScope" | "goodsOrigin" | "providerNationality" | "manufacturingTime" | "deliveryTime" | "complianceWarranty" | "similarContracts" | "qualityStandards" | "warrantyCoverage">) => void;
}

export function AMSBienesForm({ companyName, values, onChange }: AMSBienesFormProps) {
  const form = useForm({
    defaultValues: values,
    mode: "onChange",
  });

  useEffect(() => {
    form.reset(values);
  }, [values, form]);

  useEffect(() => {
    const subscription = form.watch((currentValues) => {
      onChange(currentValues as AMSBienesFormProps["values"]);
    });

    return () => subscription.unsubscribe();
  }, [form, onChange]);

  return (
    <Form {...form}>
      <FormSection
        title="AMS Bienes"
        subtitle={companyName ? `Proveedor seleccionado: ${companyName}` : "Selecciona un proveedor para adaptar bien el formulario AMS."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="technicalScope"
            rules={{ required: "Describe el alcance técnico del bien." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alcance técnico del bien</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe la especificación del bien" {...field} className="min-h-[112px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="qualityStandards"
            rules={{ required: "Agrega los estándares de calidad requeridos." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estándares de calidad</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ej. ISO 9001, pruebas de resistencia" {...field} className="min-h-[112px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="goodsOrigin"
            rules={{ required: "Origen de los bienes es obligatorio." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origen de los bienes</FormLabel>
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
            name="manufacturingTime"
            rules={{ required: "Tiempo de fabricación es obligatorio." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tiempo de fabricación</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. 2 meses" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deliveryTime"
            rules={{ required: "Tiempo de entrega es obligatorio." }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tiempo de entrega</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. 3 meses posteriores al fallo" {...field} />
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
              required: "Cantidad de contratos afines es obligatoria.",
              min: { value: 0, message: "Ingresa un número válido." },
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
                  <Textarea placeholder="Ej. Reposición al 100% por defectos de fabricación" {...field} className="min-h-[112px]" />
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
