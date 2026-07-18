"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  Check,
  ExternalLink,
  FileOutput,
  Gavel,
  History,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { catalogoDefinitions } from "@/features/catalogos/catalogos-config";
import { useCatalogos } from "@/features/catalogos/hooks/use-catalogos";
import { DocumentoStatusBadge } from "@/features/documentos/components/documento-status-badge";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useRevisionJuridica } from "../hooks/use-revision";
import { useRevisionMutations } from "../hooks/use-revision-mutations";
import type {
  AlertaRevision,
  AprobarRevisionPayload,
  DocumentoRevision,
  EvidenciaRevision,
} from "../types/revision.types";

type ReviewForm = {
  tipo_norma: string;
  efecto_normativo: string;
  materia: string;
  entidad_emisora: string;
  numero: string;
  fecha_emision: string;
  titulo: string;
  objeto: string;
  titulo_archivo: string;
  objeto_resumido: string;
  observaciones: string;
  observaciones_revision: string;
};
type AlertChoice = { decision: "RESUELTA" | "IGNORADA" | ""; justificacion: string };
type CatalogOption = {
  id: number;
  nombre?: unknown;
  codigo?: unknown;
  abreviatura_archivo?: unknown;
  carpeta_destino?: unknown;
};

const emptyForm: ReviewForm = {
  tipo_norma: "",
  efecto_normativo: "",
  materia: "",
  entidad_emisora: "",
  numero: "",
  fecha_emision: "",
  titulo: "",
  objeto: "",
  titulo_archivo: "",
  objeto_resumido: "",
  observaciones: "",
  observaciones_revision: "",
};

function shortenAtWord(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  const words = normalized.split(" ");
  const selected: string[] = [];
  let length = 0;
  for (const word of words) {
    const extra = word.length + (selected.length ? 1 : 0);
    if (length + extra > limit) break;
    selected.push(word);
    length += extra;
  }
  return selected.join(" ");
}

function initialBrief(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const sentenceEnd = normalized.search(/[.!?](?:\s|$)/);
  const firstSentence = sentenceEnd >= 0 ? normalized.slice(0, sentenceEnd + 1) : normalized;
  return shortenAtWord(firstSentence, limit);
}

function initialForm(data: DocumentoRevision): ReviewForm {
  const proposal = data.propuesta;
  return {
    tipo_norma: String(data.tipo_norma?.id ?? proposal.tipo_norma_propuesto?.id ?? ""),
    efecto_normativo: String(data.efecto_normativo?.id ?? proposal.efecto_normativo_propuesto?.id ?? ""),
    materia: String(data.materia?.id ?? proposal.materia_propuesta?.id ?? ""),
    entidad_emisora: String(data.entidad_emisora?.id ?? proposal.entidad_emisora_propuesta?.id ?? ""),
    numero: data.numero || proposal.numero_propuesto || "",
    fecha_emision: data.fecha_emision ?? proposal.fecha_emision_propuesta ?? "",
    titulo: data.titulo || proposal.titulo_propuesto || "",
    objeto: data.objeto || proposal.objeto_propuesto || "",
    titulo_archivo: data.titulo_archivo || initialBrief(data.titulo || proposal.titulo_propuesto || "", 80),
    objeto_resumido: data.objeto_resumido || initialBrief(data.objeto || proposal.objeto_propuesto || "", 120),
    observaciones: data.observaciones || "",
    observaciones_revision: "",
  };
}

function confidence(value: string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * (parsed <= 1 ? 100 : 1)) : 0;
}

function cleanFilePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, " ")
    .replaceAll(";", ",")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,; ]+$/, "");
}

function buildFilenamePreview(
  form: ReviewForm,
  tipos: CatalogOption[],
  efectos: CatalogOption[],
  materias: CatalogOption[],
) {
  const type = tipos.find((item) => String(item.id) === form.tipo_norma);
  const effect = efectos.find((item) => String(item.id) === form.efecto_normativo);
  const matter = materias.find((item) => String(item.id) === form.materia);
  const dateParts = form.fecha_emision.split("-");
  const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : "Fecha";
  const matterName = String(matter?.nombre || "Materia");
  const folder = cleanFilePart(String(matter?.carpeta_destino || matterName));
  const parts = [
    cleanFilePart(String(effect?.abreviatura_archivo || effect?.codigo || "Efecto")),
    cleanFilePart(String(type?.abreviatura_archivo || type?.codigo || "Tipo")),
    cleanFilePart(form.numero || "Número"),
    formattedDate,
    cleanFilePart(form.titulo_archivo || "Título breve"),
    cleanFilePart(form.objeto_resumido || "Objeto resumido"),
    cleanFilePart(matterName),
  ];
  const maxLength = Math.min(230, 240 - 100 - folder.length - 2);
  let filename = `${parts.join("; ")}.docx`;
  const original = filename;
  for (const [index, minimum] of [
    [5, 18],
    [4, 15],
    [6, 15],
    [2, 4],
  ] as const) {
    if (filename.length <= maxLength) break;
    const excess = filename.length - maxLength;
    const limit = Math.max(minimum, parts[index].length - excess);
    const shortened = shortenAtWord(parts[index], limit);
    if (shortened) parts[index] = shortened;
    filename = `${parts.join("; ")}.docx`;
  }
  return {
    filename,
    shortened: filename !== original,
    valid: filename.length <= maxLength,
  };
}

function EvidenceNote({ evidence }: { evidence?: EvidenciaRevision }) {
  if (!evidence)
    return <FieldDescription>Sin evidencia automática. Verifique directamente en el PDF.</FieldDescription>;
  const score = confidence(evidence.confianza);
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-xs",
        score >= 80
          ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200"
          : score >= 60
            ? "border-amber-200 bg-amber-50/70 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
            : "border-red-200 bg-red-50/70 text-red-900 dark:bg-red-950/20 dark:text-red-200",
      )}
    >
      <div className="mb-1 flex items-center justify-between font-medium">
        <span>Texto encontrado</span>
        {evidence.numero_pagina ? <span>Página {evidence.numero_pagina}</span> : null}
      </div>
      <p className="line-clamp-2 opacity-80">
        {evidence.fragmento || evidence.regla_aplicada || "Sin fragmento disponible"}
      </p>
    </div>
  );
}

function AlertDecision({
  alert,
  value,
  onChange,
}: {
  alert: AlertaRevision;
  value: AlertChoice;
  onChange: (next: AlertChoice) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        alert.severidad === "GRAVE"
          ? "border-red-300/70 bg-red-50/40 dark:bg-red-950/10"
          : "border-amber-300/70 bg-amber-50/40 dark:bg-amber-950/10",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("size-4", alert.severidad === "GRAVE" ? "text-red-600" : "text-amber-600")} />
            <span className="font-medium">{alert.titulo}</span>
            <Badge variant="outline">{alert.severidad_display}</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{alert.descripcion}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            variant={value.decision === "RESUELTA" ? "default" : "outline"}
            onClick={() => onChange({ ...value, decision: "RESUELTA" })}
          >
            <Check /> Resuelta
          </Button>
          <Button
            type="button"
            size="sm"
            variant={value.decision === "IGNORADA" ? "default" : "outline"}
            onClick={() => onChange({ ...value, decision: "IGNORADA" })}
          >
            No aplica
          </Button>
        </div>
      </div>
      <Textarea
        className="mt-3 min-h-20 bg-background"
        placeholder="Justifique la decisión para dejar constancia en la auditoría…"
        value={value.justificacion}
        onChange={(event) => onChange({ ...value, justificacion: event.target.value })}
      />
    </div>
  );
}

function SelectCatalog({
  id,
  label,
  value,
  onChange,
  records,
  evidence,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  records: CatalogOption[];
  evidence?: EvidenciaRevision;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect id={id} className="w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        <NativeSelectOption value="">Seleccione una opción</NativeSelectOption>
        {records.map((item) => (
          <NativeSelectOption key={item.id} value={item.id}>
            {item.codigo ? `${String(item.codigo)} — ` : ""}
            {String(item.nombre)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <EvidenceNote evidence={evidence} />
    </Field>
  );
}

export function RevisionJuridicaClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const review = useRevisionJuridica(uuid);
  const mutations = useRevisionMutations();
  const [form, setForm] = React.useState<ReviewForm>(emptyForm);
  const [decisions, setDecisions] = React.useState<Record<number, AlertChoice>>({});
  const [initialized, setInitialized] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [returnReason, setReturnReason] = React.useState("");
  const startAttempted = React.useRef(false);

  const tipos = useCatalogos(catalogoDefinitions["tipos-norma"], { activo: "true", ordering: "orden", page: 1 });
  const efectos = useCatalogos(catalogoDefinitions["efectos-normativos"], {
    activo: "true",
    ordering: "orden",
    page: 1,
  });
  const materias = useCatalogos(catalogoDefinitions.materias, { activo: "true", ordering: "nombre", page: 1 });
  const entidades = useCatalogos(catalogoDefinitions["entidades-emisoras"], {
    activo: "true",
    ordering: "nombre",
    page: 1,
  });

  React.useEffect(() => {
    if (!review.data || initialized) return;
    setForm(initialForm(review.data));
    setDecisions(
      Object.fromEntries(
        review.data.calidad.alertas
          .filter((item) => item.estado === "ACTIVA")
          .map((item) => [item.id, { decision: "", justificacion: "" }]),
      ),
    );
    setInitialized(true);
  }, [initialized, review.data]);

  React.useEffect(() => {
    const data = review.data;
    if (
      !data ||
      startAttempted.current ||
      data.revisiones.some((item) => item.estado === "EN_CURSO") ||
      ["LISTO_PARA_CONVERSION", "CONVIRTIENDO", "FINALIZADO"].includes(data.estado)
    )
      return;
    startAttempted.current = true;
    mutations.start.mutate(uuid, {
      onError: (error) => toast.error("No se pudo iniciar la revisión.", { description: getApiErrorMessage(error) }),
    });
  }, [mutations.start, review.data, uuid]);

  const evidence = React.useMemo(
    () => Object.fromEntries((review.data?.propuesta.evidencias ?? []).map((item) => [item.campo, item])),
    [review.data],
  );
  const activeAlerts = review.data?.calidad.alertas.filter((item) => item.estado === "ACTIVA") ?? [];
  const filenamePreview = React.useMemo(
    () =>
      buildFilenamePreview(form, tipos.data?.results ?? [], efectos.data?.results ?? [], materias.data?.results ?? []),
    [efectos.data?.results, form, materias.data?.results, tipos.data?.results],
  );

  function update(field: keyof ReviewForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function approve() {
    const required: Array<keyof ReviewForm> = [
      "tipo_norma",
      "efecto_normativo",
      "materia",
      "entidad_emisora",
      "numero",
      "fecha_emision",
      "titulo",
      "objeto",
      "titulo_archivo",
      "objeto_resumido",
    ];
    if (required.some((field) => !form[field].trim())) {
      toast.error("Complete todos los datos jurídicos obligatorios.");
      return;
    }
    if (!filenamePreview.valid) {
      toast.error("Acorte el título para archivo o el objeto resumido.");
      return;
    }
    if (
      activeAlerts.some(
        (alert) => !decisions[alert.id]?.decision || decisions[alert.id].justificacion.trim().length < 5,
      )
    ) {
      toast.error("Resuelva y justifique todas las alertas activas.");
      return;
    }
    const payload: AprobarRevisionPayload = {
      tipo_norma: Number(form.tipo_norma),
      efecto_normativo: Number(form.efecto_normativo),
      materia: Number(form.materia),
      entidad_emisora: Number(form.entidad_emisora),
      numero: form.numero.trim(),
      fecha_emision: form.fecha_emision || null,
      titulo: form.titulo.trim(),
      objeto: form.objeto.trim(),
      titulo_archivo: form.titulo_archivo.trim(),
      objeto_resumido: form.objeto_resumido.trim(),
      observaciones: form.observaciones.trim(),
      observaciones_revision: form.observaciones_revision.trim(),
      decisiones_alertas: activeAlerts.map((alert) => ({
        alerta_id: alert.id,
        decision: decisions[alert.id].decision as "RESUELTA" | "IGNORADA",
        justificacion: decisions[alert.id].justificacion.trim(),
      })),
    };
    try {
      await mutations.approve.mutateAsync({ uuid, payload });
      toast.success("Ficha jurídica aprobada y habilitada para conversión.");
      router.push(`/dashboard/documentos/${uuid}`);
    } catch (error) {
      toast.error("No se pudo aprobar la ficha.", { description: getApiErrorMessage(error) });
    }
  }

  async function returnDocument() {
    if (returnReason.trim().length < 10) {
      toast.error("Explique el motivo de devolución con al menos 10 caracteres.");
      return;
    }
    try {
      await mutations.returnDocument.mutateAsync({ uuid, motivo: returnReason.trim() });
      toast.success("Documento devuelto con observaciones.");
      router.push("/dashboard/revision-juridica");
    } catch (error) {
      toast.error("No se pudo devolver el documento.", { description: getApiErrorMessage(error) });
    }
  }

  if (review.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  if (review.isError || !review.data)
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="mx-auto size-8 text-destructive" />
          <h1 className="mt-3 text-lg font-medium">No se pudo abrir la revisión</h1>
          <p className="mt-1 text-sm text-muted-foreground">{getApiErrorMessage(review.error)}</p>
          <Button className="mt-5" variant="outline" onClick={() => router.back()}>
            <ArrowLeft /> Volver
          </Button>
        </CardContent>
      </Card>
    );
  const data = review.data;
  const locked = ["LISTO_PARA_CONVERSION", "CONVIRTIENDO", "FINALIZADO"].includes(data.estado);

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-5 bg-slate-950 p-6 text-white dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => router.push("/dashboard/revision-juridica")}
            >
              <ArrowLeft />
            </Button>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="bg-violet-500 text-white">Revisión jurídica</Badge>
                <span className="font-mono text-xs text-slate-400">{data.codigo_interno}</span>
              </div>
              <h1 className="max-w-4xl text-2xl font-semibold">{form.titulo || data.nombre_archivo}</h1>
              <p className="mt-1 text-sm text-slate-300">Contraste la propuesta con su evidencia antes de aprobar.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="grid size-11 place-items-center rounded-full bg-violet-500/20 text-violet-300">
              <Scale />
            </div>
            <div>
              <div className="font-medium">Revisión guiada</div>
              <div className="text-xs text-slate-400">Compare la ficha con el PDF original</div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t px-6 py-3">
          <DocumentoStatusBadge estado={data.estado} />
          {activeAlerts.length ? (
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              <AlertTriangle /> {activeAlerts.length} observaciones
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-300 text-emerald-700">
              <ShieldCheck /> Sin observaciones
            </Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{data.tipo_origen_display}</span>
        </div>
      </div>

      <Tabs defaultValue="ficha" className="gap-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="ficha" className="px-3 py-1.5">
            <Gavel /> Ficha jurídica
          </TabsTrigger>
          <TabsTrigger value="alertas" className="px-3 py-1.5">
            <AlertTriangle /> Observaciones <Badge variant="secondary">{activeAlerts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="evidencias" className="px-3 py-1.5">
            <Sparkles /> Detalles técnicos
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="px-3 py-1.5">
            <History /> Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ficha" className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,.85fr)]">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Datos jurídicos definitivos</CardTitle>
              <p className="text-sm text-muted-foreground">Puede corregir cualquier valor propuesto por el sistema.</p>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <SelectCatalog
                id="tipo-norma"
                label="Tipo de norma *"
                value={form.tipo_norma}
                onChange={(value) => update("tipo_norma", value)}
                records={tipos.data?.results ?? []}
                evidence={evidence.tipo_norma}
              />
              <SelectCatalog
                id="efecto"
                label="Efecto normativo *"
                value={form.efecto_normativo}
                onChange={(value) => update("efecto_normativo", value)}
                records={efectos.data?.results ?? []}
                evidence={evidence.efecto_normativo}
              />
              <Field>
                <FieldLabel htmlFor="numero">Número *</FieldLabel>
                <Input id="numero" value={form.numero} onChange={(event) => update("numero", event.target.value)} />
                <EvidenceNote evidence={evidence.numero} />
              </Field>
              <Field>
                <FieldLabel htmlFor="fecha">Fecha de emisión *</FieldLabel>
                <Input
                  id="fecha"
                  type="date"
                  value={form.fecha_emision}
                  onChange={(event) => update("fecha_emision", event.target.value)}
                />
                <EvidenceNote evidence={evidence.fecha_emision} />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="titulo">Título *</FieldLabel>
                <Input id="titulo" value={form.titulo} onChange={(event) => update("titulo", event.target.value)} />
                <EvidenceNote evidence={evidence.titulo} />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="objeto">Objeto de la norma *</FieldLabel>
                <Textarea
                  id="objeto"
                  className="min-h-28"
                  value={form.objeto}
                  onChange={(event) => update("objeto", event.target.value)}
                />
                <EvidenceNote evidence={evidence.objeto} />
              </Field>
              <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4 sm:col-span-2 dark:border-violet-900 dark:bg-violet-950/10">
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-violet-600 p-2 text-white">
                    <FileOutput className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold">Nombre de los archivos Word y PDF</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Estos textos breves se usan solamente en el nombre del archivo. El título y el objeto completos se
                      conservan arriba.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <div className="flex items-center justify-between gap-2">
                      <FieldLabel htmlFor="titulo-archivo">Título para el archivo *</FieldLabel>
                      <span className="text-xs text-muted-foreground">{form.titulo_archivo.length}/120</span>
                    </div>
                    <Input
                      id="titulo-archivo"
                      maxLength={120}
                      value={form.titulo_archivo}
                      onChange={(event) => update("titulo_archivo", event.target.value)}
                    />
                    <FieldDescription>Use una denominación breve y reconocible.</FieldDescription>
                  </Field>
                  <Field>
                    <div className="flex items-center justify-between gap-2">
                      <FieldLabel htmlFor="objeto-resumido">Objeto resumido *</FieldLabel>
                      <span className="text-xs text-muted-foreground">{form.objeto_resumido.length}/200</span>
                    </div>
                    <Input
                      id="objeto-resumido"
                      maxLength={200}
                      value={form.objeto_resumido}
                      onChange={(event) => update("objeto_resumido", event.target.value)}
                    />
                    <FieldDescription>Resuma en una frase corta el propósito de la norma.</FieldDescription>
                  </Field>
                </div>
                <div
                  className={cn(
                    "rounded-lg border bg-background p-3",
                    filenamePreview.valid ? "border-emerald-300" : "border-red-300",
                  )}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Vista previa del nombre de descarga
                  </p>
                  <p className="mt-2 break-words font-medium text-sm">{filenamePreview.filename}</p>
                  {filenamePreview.shortened ? (
                    <p className="mt-2 text-amber-700 text-xs dark:text-amber-300">
                      La vista previa se ajustó por palabras completas para respetar el límite de Windows. Puede acortar
                      los dos campos para controlar el texto exacto.
                    </p>
                  ) : null}
                  {!filenamePreview.valid ? (
                    <p className="mt-2 text-red-700 text-xs dark:text-red-300">
                      El nombre todavía es demasiado largo. Acorte el título para archivo o el objeto resumido.
                    </p>
                  ) : null}
                </div>
              </div>
              <SelectCatalog
                id="materia"
                label="Materia *"
                value={form.materia}
                onChange={(value) => update("materia", value)}
                records={materias.data?.results ?? []}
                evidence={evidence.materia}
              />
              <SelectCatalog
                id="entidad"
                label="Entidad emisora *"
                value={form.entidad_emisora}
                onChange={(value) => update("entidad_emisora", value)}
                records={entidades.data?.results ?? []}
                evidence={evidence.entidad_emisora}
              />
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="observaciones">Observaciones del documento</FieldLabel>
                <Textarea
                  id="observaciones"
                  value={form.observaciones}
                  onChange={(event) => update("observaciones", event.target.value)}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="notas-revision">Nota de esta revisión</FieldLabel>
                <Textarea
                  id="notas-revision"
                  placeholder="Criterio aplicado o correcciones relevantes…"
                  value={form.observaciones_revision}
                  onChange={(event) => update("observaciones_revision", event.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
          <Card className="min-h-[720px]">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>PDF original</CardTitle>
                  <p className="text-sm text-muted-foreground">Fuente primaria para contrastar la ficha.</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={data.archivo_original_url} target="_blank" rel="noreferrer">
                    <ExternalLink /> Abrir
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="h-[650px] p-0">
              <iframe title="PDF original" src={data.archivo_original_url} className="size-full border-0 bg-muted" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertas" className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-medium">Observaciones por resolver</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Indique qué hizo con cada observación antes de aprobar el documento.
            </p>
          </div>
          {activeAlerts.length ? (
            activeAlerts.map((alert) => (
              <AlertDecision
                key={alert.id}
                alert={alert}
                value={decisions[alert.id] ?? { decision: "", justificacion: "" }}
                onChange={(next) => setDecisions((current) => ({ ...current, [alert.id]: next }))}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <ShieldCheck className="mx-auto size-10 text-emerald-600" />
                <h2 className="mt-3 text-lg font-medium">Sin observaciones pendientes</h2>
                <p className="text-muted-foreground">Puede aprobar el documento después de verificar su ficha.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evidencias" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.propuesta.evidencias.map((item, index) => (
            <Card key={`${item.campo}-${index}`}>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>{item.campo_display}</CardTitle>
                  <Badge variant="outline">{confidence(item.confianza)}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs tracking-wide text-muted-foreground uppercase">Valor detectado</div>
                  <div className="mt-1 font-medium">{item.valor_propuesto || "Sin valor"}</div>
                </div>
                <blockquote className="border-l-2 border-violet-400 pl-3 text-sm text-muted-foreground">
                  {item.fragmento || "No se almacenó fragmento."}
                </blockquote>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.regla_aplicada}</span>
                  <span>{item.numero_pagina ? `Página ${item.numero_pagina}` : "Sin página"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="auditoria" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Historial del documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {data.historial.map((item) => (
                <div key={item.id} className="relative border-l pb-5 pl-5 last:pb-0">
                  <span className="absolute -left-1.5 top-1 size-3 rounded-full border-2 border-background bg-violet-500" />
                  <div className="font-medium">{item.accion_display}</div>
                  <p className="text-sm text-muted-foreground">{item.descripcion}</p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.usuario_nombre || "Sistema"} · {new Date(item.created_at).toLocaleString("es-BO")}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Rondas de revisión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.revisiones.length ? (
                data.revisiones.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Revisión {item.numero_revision}</span>
                      <Badge variant="outline">{item.estado_display}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {item.revisado_por_nombre || "Usuario actual"} ·{" "}
                      {new Date(item.iniciada_at).toLocaleString("es-BO")}
                    </div>
                    {item.observaciones ? <p className="mt-2 text-sm">{item.observaciones}</p> : null}
                    {item.motivo_devolucion ? (
                      <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/20">
                        {item.motivo_devolucion}
                      </p>
                    ) : null}
                    {item.cambios.length ? (
                      <div className="mt-3 text-xs text-muted-foreground">
                        {item.cambios.length} cambios registrados
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">La primera ronda se está iniciando.</p>
              )}
              <div className="rounded-lg border border-dashed p-4">
                <div className="flex items-center gap-2 font-medium">
                  <BookOpenCheck className="size-4" /> Origen documental
                </div>
                {data.origenes.map((item) => (
                  <div key={item.id} className="mt-2 text-sm">
                    <span>
                      {item.fuente_nombre || "Carga manual"}
                      {item.seccion_nombre ? ` / ${item.seccion_nombre}` : ""}
                    </span>
                    {item.url_origen ? (
                      <a
                        href={item.url_origen}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-violet-600 underline"
                      >
                        Ver origen
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,.06)] backdrop-blur md:left-[var(--sidebar-width)]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="hidden text-sm text-muted-foreground sm:block">
            {locked
              ? "Esta revisión ya fue aprobada."
              : "La aprobación habilita la conversión y deja una auditoría completa."}
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              disabled={locked || mutations.returnDocument.isPending}
              onClick={() => setReturnOpen(true)}
            >
              <RotateCcw /> Devolver
            </Button>
            <Button
              className="bg-violet-700 text-white hover:bg-violet-800"
              disabled={locked || mutations.approve.isPending}
              onClick={() => void approve()}
            >
              <ShieldCheck /> {mutations.approve.isPending ? "Aprobando…" : "Aprobar ficha"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Devolver documento con observaciones</DialogTitle>
            <DialogDescription>
              El documento quedará observado y deberá corregirse antes de una nueva aprobación.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="motivo">Motivo de devolución</FieldLabel>
            <Textarea
              id="motivo"
              className="min-h-28"
              placeholder="Indique exactamente qué debe corregirse…"
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={mutations.returnDocument.isPending}
              onClick={() => void returnDocument()}
            >
              {mutations.returnDocument.isPending ? "Devolviendo…" : "Confirmar devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
