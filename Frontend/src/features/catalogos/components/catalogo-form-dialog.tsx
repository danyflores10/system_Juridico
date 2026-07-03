"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, type FieldErrors, type Resolver, useForm } from "react-hook-form";
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";

import { catalogoDefinitions } from "../catalogos-config";
import { useCatalogos } from "../hooks/use-catalogos";
import { useCatalogoMutations } from "../hooks/use-catalogos-mutations";
import type { CatalogoDefinition, CatalogoRecord, FormFieldDefinition } from "../types/catalogos.types";

type FormValues = Record<string, unknown>;

function fieldError(errors: FieldErrors<FormValues>, name: string) {
  const error = errors[name];
  return typeof error?.message === "string" ? error.message : undefined;
}

function normalizedDefaults(definition: CatalogoDefinition, item: CatalogoRecord | null) {
  if (!item) return definition.defaultValues;
  return Object.fromEntries(
    definition.fields.map((field) => [field.name, item[field.name] ?? definition.defaultValues[field.name] ?? ""]),
  );
}

function RelationField({
  field,
  register,
  options,
  error,
}: {
  field: FormFieldDefinition;
  register: ReturnType<typeof useForm<FormValues>>["register"];
  options: CatalogoRecord[];
  error?: string;
}) {
  return (
    <Field data-invalid={Boolean(error)} className={field.className}>
      <FieldLabel htmlFor={`field-${field.name}`}>{field.label}</FieldLabel>
      <NativeSelect
        id={`field-${field.name}`}
        className="w-full"
        aria-invalid={Boolean(error)}
        {...register(field.name, { valueAsNumber: true })}
      >
        <NativeSelectOption value={0}>Seleccione una opción</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.id} value={option.id}>
            {String(option.codigo ?? option.sigla ?? "")} · {String(option.nombre ?? "")}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

export function CatalogoFormDialog({
  definition,
  item,
  open,
  onOpenChange,
}: {
  definition: CatalogoDefinition;
  item: CatalogoRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const resolver = zodResolver(definition.schema as never) as Resolver<FormValues>;
  const form = useForm<FormValues>({ resolver, defaultValues: normalizedDefaults(definition, item) });
  const mutations = useCatalogoMutations(definition);
  const tipos = useCatalogos(catalogoDefinitions["tipos-norma"], { activo: "true", ordering: "orden", page: 1 });
  const materias = useCatalogos(catalogoDefinitions.materias, { activo: "true", ordering: "orden", page: 1 });
  const efectos = useCatalogos(catalogoDefinitions["efectos-normativos"], {
    activo: "true",
    ordering: "orden",
    page: 1,
  });

  React.useEffect(() => {
    if (open) form.reset(normalizedDefaults(definition, item));
  }, [definition, form, item, open]);

  function relationOptions(field: FormFieldDefinition) {
    if (field.relationDefinition === "tipos-norma") return tipos.data?.results ?? [];
    if (field.relationDefinition === "materias") return materias.data?.results ?? [];
    if (field.relationDefinition === "efectos-normativos") return efectos.data?.results ?? [];
    return [];
  }

  function applyServerErrors(error: unknown) {
    if (!(error instanceof ApiError) || !error.details || typeof error.details !== "object") return;
    for (const [name, value] of Object.entries(error.details)) {
      const message = Array.isArray(value)
        ? value.filter((entry) => typeof entry === "string").join(" ")
        : String(value);
      form.setError(name, { message });
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutations.save.mutateAsync({ id: item?.id, payload: values });
      toast.success(item ? definition.successUpdated : definition.successCreated);
      onOpenChange(false);
    } catch (error) {
      applyServerErrors(error);
      toast.error("No se pudo guardar. Revise los campos marcados.", { description: getApiErrorMessage(error) });
    }
  });

  const saving = mutations.save.isPending;
  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? `Editar ${definition.singular}` : `Nuevo ${definition.singular}`}</DialogTitle>
          <DialogDescription>{definition.description}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit} noValidate>
          {definition.fields.map((field) => {
            const error = fieldError(form.formState.errors, field.name);
            if (field.type === "relation") {
              return (
                <RelationField
                  key={field.name}
                  field={field}
                  register={form.register}
                  options={relationOptions(field)}
                  error={error}
                />
              );
            }
            if (field.type === "switch") {
              return (
                <Controller
                  key={field.name}
                  control={form.control}
                  name={field.name}
                  render={({ field: controllerField }) => (
                    <Field orientation="horizontal" className={field.className} data-invalid={Boolean(error)}>
                      <div className="flex-1">
                        <FieldLabel htmlFor={`field-${field.name}`}>{field.label}</FieldLabel>
                        {field.help ? <FieldDescription>{field.help}</FieldDescription> : null}
                      </div>
                      <Switch
                        id={`field-${field.name}`}
                        checked={Boolean(controllerField.value)}
                        onCheckedChange={controllerField.onChange}
                      />
                      <FieldError>{error}</FieldError>
                    </Field>
                  )}
                />
              );
            }
            if (field.type === "select") {
              return (
                <Field key={field.name} className={field.className} data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor={`field-${field.name}`}>{field.label}</FieldLabel>
                  <NativeSelect id={`field-${field.name}`} className="w-full" {...form.register(field.name)}>
                    {field.options?.map((option) => (
                      <NativeSelectOption key={option.value} value={option.value}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError>{error}</FieldError>
                </Field>
              );
            }
            const uppercase = ["codigo", "sigla", "abreviatura_archivo"].includes(field.name);
            return (
              <Field key={field.name} className={field.className} data-invalid={Boolean(error)}>
                <FieldLabel htmlFor={`field-${field.name}`}>{field.label}</FieldLabel>
                {field.type === "textarea" ? (
                  <Textarea
                    id={`field-${field.name}`}
                    placeholder={field.placeholder}
                    aria-invalid={Boolean(error)}
                    {...form.register(field.name)}
                  />
                ) : (
                  <Input
                    id={`field-${field.name}`}
                    type={field.type === "number" ? "number" : "text"}
                    min={field.type === "number" ? 0 : undefined}
                    maxLength={field.maxLength}
                    placeholder={field.placeholder}
                    aria-invalid={Boolean(error)}
                    {...form.register(field.name, {
                      valueAsNumber: field.type === "number",
                      setValueAs: uppercase ? (value) => String(value).toUpperCase() : undefined,
                    })}
                  />
                )}
                {field.help ? <FieldDescription>{field.help}</FieldDescription> : null}
                <FieldError>{error}</FieldError>
              </Field>
            );
          })}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
