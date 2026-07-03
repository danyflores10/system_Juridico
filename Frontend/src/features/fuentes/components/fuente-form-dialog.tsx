"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, ChevronDown, Globe2, Settings2 } from "lucide-react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { catalogoDefinitions } from "@/features/catalogos/catalogos-config";
import { useCatalogos } from "@/features/catalogos/hooks/use-catalogos";
import { ApiError, getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useFuente } from "../hooks/use-fuentes";
import { useFuenteMutations } from "../hooks/use-fuentes-mutations";
import { type FuenteFormValues, fuenteSchema } from "../schemas/fuentes-schemas";
import type { FuentePayload } from "../types/fuentes.types";

const emptyValues: FuenteFormValues = {
  codigo: "", nombre: "", descripcion: "", url_base: "", url_consulta_principal: "",
  tipo_fuente: "PORTAL_WEB", motor_consulta: "HTTPX", requiere_javascript: false,
  requiere_autenticacion: false, frecuencia_consulta: "MANUAL", materia_predeterminada: 0,
  entidad_emisora_predeterminada: 0, max_documentos_por_ejecucion: 50,
  patron_incluir: "", patron_excluir: "", esperar_selector: "", esperar_ms: 0,
  orden: 0, activa: true,
};

function configString(value: unknown) { return typeof value === "string" ? value : ""; }
function configNumber(value: unknown, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }

export function FuenteFormDialog({ sourceId, open, onOpenChange }: { sourceId: number | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [advanced, setAdvanced] = React.useState(false);
  const detail = useFuente(sourceId ?? 0);
  const mutations = useFuenteMutations();
  const materias = useCatalogos(catalogoDefinitions.materias, { activo: "true", ordering: "nombre", page: 1 });
  const entidades = useCatalogos(catalogoDefinitions["entidades-emisoras"], { activo: "true", ordering: "nombre", page: 1 });
  const resolver = zodResolver(fuenteSchema as never) as Resolver<FuenteFormValues>;
  const form = useForm<FuenteFormValues>({ resolver, defaultValues: emptyValues });

  React.useEffect(() => {
    if (!open) return;
    setAdvanced(false);
    const source = detail.data;
    if (!sourceId || !source) {
      if (!sourceId) form.reset(emptyValues);
      return;
    }
    form.reset({
      codigo: source.codigo, nombre: source.nombre, descripcion: source.descripcion,
      url_base: source.url_base, url_consulta_principal: source.url_consulta_principal || source.url_base,
      tipo_fuente: source.tipo_fuente, motor_consulta: source.motor_consulta,
      requiere_javascript: source.requiere_javascript, requiere_autenticacion: source.requiere_autenticacion,
      frecuencia_consulta: source.frecuencia_consulta, materia_predeterminada: source.materia_predeterminada?.id ?? 0,
      entidad_emisora_predeterminada: source.entidad_emisora_predeterminada?.id ?? 0,
      max_documentos_por_ejecucion: configNumber(source.configuracion.max_documentos_por_ejecucion, 50),
      patron_incluir: configString(source.configuracion.patron_incluir), patron_excluir: configString(source.configuracion.patron_excluir),
      esperar_selector: configString(source.configuracion.esperar_selector), esperar_ms: configNumber(source.configuracion.esperar_ms, 0),
      orden: source.orden, activa: source.activa,
    });
  }, [detail.data, form, open, sourceId]);

  function applyServerErrors(error: unknown) {
    if (!(error instanceof ApiError) || !error.details || typeof error.details !== "object") return;
    for (const [field, value] of Object.entries(error.details)) {
      const message = Array.isArray(value) ? value.join(" ") : String(value);
      form.setError(field as keyof FuenteFormValues, { message });
    }
    setAdvanced(true);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const { max_documentos_por_ejecucion, patron_incluir, patron_excluir, esperar_selector, esperar_ms, ...sourceValues } = values;
    const payload: FuentePayload = {
      ...sourceValues,
      materia_predeterminada: values.materia_predeterminada || null,
      entidad_emisora_predeterminada: values.entidad_emisora_predeterminada || null,
      configuracion: {
        max_documentos_por_ejecucion,
        deteccion_automatica: true,
        ...(patron_incluir.trim() ? { patron_incluir: patron_incluir.trim() } : {}),
        ...(patron_excluir.trim() ? { patron_excluir: patron_excluir.trim() } : {}),
        ...(esperar_selector.trim() ? { esperar_selector: esperar_selector.trim() } : {}),
        ...(esperar_ms ? { esperar_ms } : {}),
      },
    };
    try {
      await mutations.save.mutateAsync({ id: sourceId ?? undefined, payload });
      toast.success(sourceId ? "Fuente actualizada correctamente." : "Fuente lista para buscar normativa.");
      onOpenChange(false);
    } catch (error) {
      applyServerErrors(error);
      toast.error("No se pudo guardar la fuente.", { description: getApiErrorMessage(error) });
    }
  });

  const busy = mutations.save.isPending || (Boolean(sourceId) && detail.isLoading);
  let submitLabel = sourceId ? "Guardar cambios" : "Agregar fuente";
  if (busy) submitLabel = "Guardando...";
  return <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>{sourceId ? "Editar fuente oficial" : "Agregar fuente oficial"}</DialogTitle><DialogDescription>Indique dónde publica normativa la institución. El sistema configurará el resto automáticamente.</DialogDescription></DialogHeader>
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div className="space-y-5 rounded-2xl border bg-muted/10 p-5">
          <Field data-invalid={Boolean(form.formState.errors.nombre)}><FieldLabel htmlFor="fuente-nombre">Nombre de la institución</FieldLabel><div className="relative"><Globe2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="fuente-nombre" className="pl-10" placeholder="Ej. Servicio de Impuestos Nacionales" {...form.register("nombre")} /></div><FieldError>{form.formState.errors.nombre?.message}</FieldError></Field>
          <Field data-invalid={Boolean(form.formState.errors.url_consulta_principal)}><FieldLabel htmlFor="fuente-url-consulta">Página donde publica la normativa</FieldLabel><Input id="fuente-url-consulta" type="url" placeholder="https://institucion.gob.bo/normativa" {...form.register("url_consulta_principal")} /><FieldDescription>Pegue la dirección completa de la página que contiene los PDF.</FieldDescription><FieldError>{form.formState.errors.url_consulta_principal?.message}</FieldError></Field>
          <Field><FieldLabel htmlFor="fuente-frecuencia">¿Cada cuánto debe revisarse?</FieldLabel><div className="relative"><CalendarClock className="absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" /><NativeSelect id="fuente-frecuencia" className="w-full pl-10" {...form.register("frecuencia_consulta")}><NativeSelectOption value="MANUAL">Solo cuando yo lo solicite</NativeSelectOption><NativeSelectOption value="DIARIA">Todos los días</NativeSelectOption><NativeSelectOption value="SEMANAL">Una vez por semana</NativeSelectOption></NativeSelect></div></Field>
        </div>

        <Collapsible open={advanced} onOpenChange={setAdvanced}>
          <CollapsibleTrigger asChild><Button type="button" variant="ghost" className="w-full justify-between"><span className="flex items-center gap-2"><Settings2 /> Opciones técnicas para administrador</span><ChevronDown className={cn("transition-transform", advanced && "rotate-180")} /></Button></CollapsibleTrigger>
          <CollapsibleContent className="mt-3"><div className="grid gap-4 rounded-2xl border border-dashed p-5 sm:grid-cols-2">
            <Field><FieldLabel htmlFor="fuente-codigo">Código</FieldLabel><Input id="fuente-codigo" placeholder="Se genera automáticamente" {...form.register("codigo", { setValueAs: (value) => String(value).toUpperCase() })} /></Field>
            <Field><FieldLabel htmlFor="fuente-url-base">URL base</FieldLabel><Input id="fuente-url-base" type="url" placeholder="Se deriva automáticamente" {...form.register("url_base")} /></Field>
            <Field className="sm:col-span-2"><FieldLabel htmlFor="fuente-descripcion">Descripción</FieldLabel><Textarea id="fuente-descripcion" {...form.register("descripcion")} /></Field>
            <Field><FieldLabel htmlFor="fuente-tipo">Tipo</FieldLabel><NativeSelect id="fuente-tipo" className="w-full" {...form.register("tipo_fuente")}><NativeSelectOption value="PORTAL_WEB">Portal web</NativeSelectOption><NativeSelectOption value="API">API</NativeSelectOption><NativeSelectOption value="RSS">RSS</NativeSelectOption><NativeSelectOption value="REPOSITORIO">Repositorio</NativeSelectOption></NativeSelect></Field>
            <Field><FieldLabel htmlFor="fuente-motor">Motor</FieldLabel><NativeSelect id="fuente-motor" className="w-full" {...form.register("motor_consulta")}><NativeSelectOption value="HTTPX">Detección automática</NativeSelectOption><NativeSelectOption value="PLAYWRIGHT">Forzar Playwright</NativeSelectOption></NativeSelect></Field>
            <Field><FieldLabel htmlFor="fuente-max">Máximo de PDF</FieldLabel><Input id="fuente-max" type="number" min={1} max={500} {...form.register("max_documentos_por_ejecucion", { valueAsNumber: true })} /></Field>
            <Field><FieldLabel htmlFor="fuente-orden">Orden</FieldLabel><Input id="fuente-orden" type="number" min={0} {...form.register("orden", { valueAsNumber: true })} /></Field>
            <Field><FieldLabel htmlFor="fuente-incluir">Patrón para incluir</FieldLabel><Input id="fuente-incluir" placeholder="Ej. resolución|\\.pdf" {...form.register("patron_incluir")} /></Field>
            <Field><FieldLabel htmlFor="fuente-excluir">Patrón para excluir</FieldLabel><Input id="fuente-excluir" placeholder="Ej. formulario|boletín" {...form.register("patron_excluir")} /></Field>
            <Field><FieldLabel htmlFor="fuente-selector">Esperar selector</FieldLabel><Input id="fuente-selector" placeholder="Ej. .lista-normativa" {...form.register("esperar_selector")} /></Field>
            <Field><FieldLabel htmlFor="fuente-espera">Espera en ms</FieldLabel><Input id="fuente-espera" type="number" min={0} max={10000} {...form.register("esperar_ms", { valueAsNumber: true })} /></Field>
            <Field><FieldLabel htmlFor="fuente-materia">Materia sugerida</FieldLabel><NativeSelect id="fuente-materia" className="w-full" {...form.register("materia_predeterminada", { valueAsNumber: true })}><NativeSelectOption value={0}>Sin asignar</NativeSelectOption>{materias.data?.results.map((item) => <NativeSelectOption key={item.id} value={item.id}>{String(item.nombre)}</NativeSelectOption>)}</NativeSelect></Field>
            <Field><FieldLabel htmlFor="fuente-entidad">Entidad sugerida</FieldLabel><NativeSelect id="fuente-entidad" className="w-full" {...form.register("entidad_emisora_predeterminada", { valueAsNumber: true })}><NativeSelectOption value={0}>Sin asignar</NativeSelectOption>{entidades.data?.results.map((item) => <NativeSelectOption key={item.id} value={item.id}>{String(item.nombre)}</NativeSelectOption>)}</NativeSelect></Field>
            <Controller control={form.control} name="requiere_autenticacion" render={({ field }) => <Field orientation="horizontal"><FieldLabel className="flex-1">Requiere autenticación</FieldLabel><Switch checked={field.value} onCheckedChange={field.onChange} /></Field>} />
            <Controller control={form.control} name="activa" render={({ field }) => <Field orientation="horizontal"><FieldLabel className="flex-1">Fuente activa</FieldLabel><Switch checked={field.value} onCheckedChange={field.onChange} /></Field>} />
          </div></CollapsibleContent>
        </Collapsible>

        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{submitLabel}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
