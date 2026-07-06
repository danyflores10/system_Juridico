"use client";

import * as React from "react";

import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/api/client";

import { catalogoDefinitions } from "../catalogos-config";
import { useCatalogos } from "../hooks/use-catalogos";
import { useCatalogoMutations } from "../hooks/use-catalogos-mutations";
import type {
  CatalogoDefinition,
  CatalogoRecord,
  CatalogoTabKey,
  ReglaTabKey,
  StatusFilter,
} from "../types/catalogos.types";
import { CatalogoConfirmDialog } from "./catalogo-confirm-dialog";
import { CatalogoFormDialog } from "./catalogo-form-dialog";
import { CatalogoTable } from "./catalogo-table";

function CatalogoSection({ definition }: { definition: CatalogoDefinition }) {
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("todos");
  const [ordering, setOrdering] = React.useState(definition.ordering);
  const [page, setPage] = React.useState(1);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CatalogoRecord | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<CatalogoRecord | null>(null);
  const result = useCatalogos(definition, {
    q: deferredQuery,
    activo: statusFilter,
    ordering,
    page,
  });
  const mutations = useCatalogoMutations(definition);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  async function changeStatus() {
    if (!statusTarget) return;
    const activate = !statusTarget.activo;
    try {
      await mutations.status.mutateAsync({ id: statusTarget.id, active: activate });
      toast.success(activate ? "Registro activado." : "Registro desactivado. No se eliminó de la base de datos.");
      setStatusTarget(null);
    } catch (error) {
      toast.error("No se pudo cambiar el estado.", { description: getApiErrorMessage(error) });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <CardTitle>{definition.title}</CardTitle>
            <CardDescription className="mt-1">{definition.description}</CardDescription>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus /> Nuevo registro
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por código, nombre o descripción..."
              className="pl-9"
            />
          </div>
          <NativeSelect
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setPage(1);
            }}
            className="w-full md:w-40"
          >
            <NativeSelectOption value="todos">Todos</NativeSelectOption>
            <NativeSelectOption value="true">Activos</NativeSelectOption>
            <NativeSelectOption value="false">Inactivos</NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            value={ordering}
            onChange={(event) => {
              setOrdering(event.target.value);
              setPage(1);
            }}
            className="w-full md:w-48"
          >
            <NativeSelectOption value={definition.ordering}>Orden predeterminado</NativeSelectOption>
            <NativeSelectOption value="-created_at">Más recientes</NativeSelectOption>
            <NativeSelectOption value="created_at">Más antiguos</NativeSelectOption>
          </NativeSelect>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Actualizar"
            onClick={() => result.refetch()}
            disabled={result.isFetching}
          >
            <RefreshCw className={result.isFetching ? "animate-spin" : undefined} />
          </Button>
        </div>
        {result.isError ? (
          <Alert variant="destructive">
            <AlertTitle>No se pudieron cargar los registros</AlertTitle>
            <AlertDescription>{getApiErrorMessage(result.error)}</AlertDescription>
          </Alert>
        ) : null}
        <CatalogoTable
          definition={definition}
          items={result.data?.results ?? []}
          count={result.data?.count ?? 0}
          loading={result.isLoading}
          page={page}
          onPageChange={setPage}
          onEdit={(item) => {
            setEditing(item);
            setFormOpen(true);
          }}
          onStatus={setStatusTarget}
        />
      </CardContent>
      <CatalogoFormDialog definition={definition} item={editing} open={formOpen} onOpenChange={setFormOpen} />
      <CatalogoConfirmDialog
        item={statusTarget}
        pending={mutations.status.isPending}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        onConfirm={() => void changeStatus()}
      />
    </Card>
  );
}

const mainTabs: Array<{ key: CatalogoTabKey; label: string }> = [
  { key: "tipos-norma", label: "Tipos de norma" },
  { key: "efectos-normativos", label: "Efectos normativos" },
  { key: "materias", label: "Materias" },
  { key: "entidades-emisoras", label: "Entidades emisoras" },
];

const ruleTabs: Array<{ key: ReglaTabKey; label: string }> = [
  { key: "patrones-tipo-norma", label: "Patrones de tipo de norma" },
  { key: "palabras-clave-materia", label: "Palabras clave de materia" },
  { key: "reglas-efecto-normativo", label: "Reglas de efecto normativo" },
];

export function CatalogoTabs({ initialTab = "tipos-norma" }: { initialTab?: CatalogoTabKey | "reglas" }) {
  const [tab, setTab] = React.useState<CatalogoTabKey | "reglas">(initialTab);
  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as CatalogoTabKey | "reglas")} className="gap-4">
      <TabsList className="h-auto w-full flex-wrap justify-start">
        {mainTabs.map((item) => (
          <TabsTrigger key={item.key} value={item.key}>
            {item.label}
          </TabsTrigger>
        ))}
        <TabsTrigger value="reglas">Reglas de detección</TabsTrigger>
      </TabsList>
      {mainTabs.map((item) => (
        <TabsContent key={item.key} value={item.key}>
          <CatalogoSection definition={catalogoDefinitions[item.key]} />
        </TabsContent>
      ))}
      <TabsContent value="reglas" className="space-y-4">
        <Alert>
          <AlertTitle>Configuración técnica</AlertTitle>
          <AlertDescription>
            Estas reglas serán usadas posteriormente durante la lectura automática de documentos. Cambios incorrectos
            pueden afectar la clasificación automática.
          </AlertDescription>
        </Alert>
        <Tabs defaultValue="patrones-tipo-norma" className="gap-4">
          <TabsList className="h-auto w-full flex-wrap justify-start" variant="line">
            {ruleTabs.map((item) => (
              <TabsTrigger key={item.key} value={item.key}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {ruleTabs.map((item) => (
            <TabsContent key={item.key} value={item.key}>
              <CatalogoSection definition={catalogoDefinitions[item.key]} />
            </TabsContent>
          ))}
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
