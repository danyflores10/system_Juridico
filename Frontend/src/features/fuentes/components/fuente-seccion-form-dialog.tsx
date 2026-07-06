"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { catalogoDefinitions } from "@/features/catalogos/catalogos-config";
import { useCatalogos } from "@/features/catalogos/hooks/use-catalogos";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";

import { useSeccionMutations } from "../hooks/use-fuentes-mutations";
import { type FuenteSeccionFormValues, fuenteSeccionSchema } from "../schemas/fuentes-schemas";
import type { FuenteSeccion, FuenteSeccionPayload } from "../types/fuentes.types";

export function FuenteSeccionFormDialog({
  fuenteId,
  section,
  open,
  onOpenChange,
}: {
  fuenteId: number;
  section: FuenteSeccion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutations = useSeccionMutations();
  const materias = useCatalogos(catalogoDefinitions.materias, { activo: "true", ordering: "nombre", page: 1 });
  const resolver = zodResolver(fuenteSeccionSchema as never) as Resolver<FuenteSeccionFormValues>;
  const form = useForm<FuenteSeccionFormValues>({
    resolver,
    defaultValues: {
      codigo: "",
      nombre: "",
      descripcion: "",
      url_listado: "",
      url_busqueda: "",
      materia_predeterminada: 0,
      orden: 0,
      activa: true,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      codigo: section?.codigo ?? "",
      nombre: section?.nombre ?? "",
      descripcion: section?.descripcion ?? "",
      url_listado: section?.url_listado ?? "",
      url_busqueda: section?.url_busqueda ?? "",
      materia_predeterminada: section?.materia_predeterminada ?? 0,
      orden: section?.orden ?? 0,
      activa: section?.activa ?? true,
    });
  }, [form, open, section]);

  const submit = form.handleSubmit(async (values) => {
    const payload: FuenteSeccionPayload = {
      ...values,
      fuente: fuenteId,
      materia_predeterminada: values.materia_predeterminada || null,
    };
    try {
      await mutations.save.mutateAsync({ id: section?.id, payload });
      toast.success(section ? "Sección actualizada." : "Sección creada.");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.details && typeof error.details === "object") {
        for (const [field, messages] of Object.entries(error.details)) {
          form.setError(field as keyof FuenteSeccionFormValues, {
            message: Array.isArray(messages) ? messages.join(" ") : String(messages),
          });
        }
      }
      toast.error("No se pudo guardar la sección.", { description: getApiErrorMessage(error) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{section ? "Editar sección" : "Nueva sección"}</DialogTitle>
          <DialogDescription>Configure una sección específica dentro del portal oficial.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Field data-invalid={Boolean(form.formState.errors.codigo)}>
            <FieldLabel>Código</FieldLabel>
            <Input
              placeholder="Ej. RND"
              {...form.register("codigo", { setValueAs: (value) => String(value).toUpperCase() })}
            />
            <FieldError>{form.formState.errors.codigo?.message}</FieldError>
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.nombre)}>
            <FieldLabel>Nombre</FieldLabel>
            <Input {...form.register("nombre")} />
            <FieldError>{form.formState.errors.nombre?.message}</FieldError>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Descripción</FieldLabel>
            <Textarea {...form.register("descripcion")} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.url_listado)}>
            <FieldLabel>URL de listado</FieldLabel>
            <Input type="url" placeholder="https://..." {...form.register("url_listado")} />
            <FieldError>{form.formState.errors.url_listado?.message}</FieldError>
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.url_busqueda)}>
            <FieldLabel>URL de búsqueda</FieldLabel>
            <Input type="url" placeholder="https://..." {...form.register("url_busqueda")} />
            <FieldError>{form.formState.errors.url_busqueda?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Materia predeterminada</FieldLabel>
            <NativeSelect className="w-full" {...form.register("materia_predeterminada", { valueAsNumber: true })}>
              <NativeSelectOption value={0}>Heredar de la fuente</NativeSelectOption>
              {materias.data?.results.map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {String(item.nombre)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel>Orden</FieldLabel>
            <Input type="number" min={0} {...form.register("orden", { valueAsNumber: true })} />
          </Field>
          <Controller
            control={form.control}
            name="activa"
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldLabel className="flex-1">Sección activa</FieldLabel>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutations.save.isPending}>
              {mutations.save.isPending ? "Guardando..." : "Guardar sección"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
