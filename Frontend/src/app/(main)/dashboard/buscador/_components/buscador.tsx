"use client";

import * as React from "react";

import { BadgeCheck, FilePlus2, FolderSync, LockOpen, Scale } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { DialogoCarga } from "./dialogo-carga";
import { PanelCriterios } from "./panel-criterios";
import { TablaResultados } from "./tabla-resultados";
import { CRITERIOS_INICIALES, type CriteriosBusqueda, type PlanAcceso, type ResultadoNormativa } from "./tipos";
import { VisorDocumento } from "./visor-documento";

const CLAVE_PLAN = "buscador-juridico-plan";

export function Buscador() {
  const [plan, setPlan] = React.useState<PlanAcceso>("gratuita");
  const [materias, setMaterias] = React.useState<string[]>([]);
  const [resultados, setResultados] = React.useState<ResultadoNormativa[]>([]);
  const [buscando, setBuscando] = React.useState(true);
  const [ultimosCriterios, setUltimosCriterios] = React.useState<CriteriosBusqueda>(CRITERIOS_INICIALES);

  const [documentoVisor, setDocumentoVisor] = React.useState<ResultadoNormativa | null>(null);
  const [visorAbierto, setVisorAbierto] = React.useState(false);
  const [cargaAbierta, setCargaAbierta] = React.useState(false);
  const [sincronizando, setSincronizando] = React.useState(false);

  const planRef = React.useRef(plan);
  planRef.current = plan;

  const cargarMaterias = React.useCallback(async () => {
    try {
      const respuesta = await fetch("/api/biblioteca/materias");
      const datos: { materias?: string[] } = await respuesta.json();
      if (respuesta.ok) setMaterias(datos.materias ?? []);
    } catch {
      // La lista de materias es opcional; la búsqueda sigue funcionando sin ella.
    }
  }, []);

  const ejecutarBusqueda = React.useCallback(async (criterios: CriteriosBusqueda) => {
    setBuscando(true);
    setUltimosCriterios(criterios);

    try {
      const respuesta = await fetch("/api/biblioteca/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...criterios, plan: planRef.current }),
      });
      const datos: { resultados?: ResultadoNormativa[]; error?: string } = await respuesta.json();

      if (!respuesta.ok) {
        toast.error(datos.error ?? "No fue posible ejecutar la búsqueda.");
        setResultados([]);
        return;
      }

      setResultados(datos.resultados ?? []);
    } catch {
      toast.error("No fue posible comunicarse con el servidor.", {
        description: "Verifique que la base de datos systemJuridico esté disponible.",
      });
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  React.useEffect(() => {
    const guardado = window.localStorage.getItem(CLAVE_PLAN);
    if (guardado === "gratuita" || guardado === "suscripcion") setPlan(guardado);

    void ejecutarBusqueda(CRITERIOS_INICIALES);
    void cargarMaterias();
  }, [ejecutarBusqueda, cargarMaterias]);

  function cambiarPlan(valor: string) {
    const nuevoPlan: PlanAcceso = valor === "suscripcion" ? "suscripcion" : "gratuita";
    setPlan(nuevoPlan);
    window.localStorage.setItem(CLAVE_PLAN, nuevoPlan);

    toast.info(
      nuevoPlan === "suscripcion"
        ? "Suscripción activa: acceso irrestricto a la normativa emitida y actualizada."
        : "Opción gratuita: solo puede abrir documentos de la carpeta Normativa emitida.",
    );
  }

  function verDocumento(documento: ResultadoNormativa) {
    setDocumentoVisor(documento);
    setVisorAbierto(true);
  }

  function refrescar() {
    void ejecutarBusqueda(ultimosCriterios);
    void cargarMaterias();
  }

  async function sincronizarFinalizados() {
    setSincronizando(true);
    try {
      const respuesta = await fetch("/api/biblioteca/sincronizar-finalizados", { method: "POST" });
      const datos: {
        incorporados?: number;
        omitidos?: number;
        errores?: { documento: string; motivo: string }[];
        error?: string;
      } = await respuesta.json();

      if (!respuesta.ok) {
        toast.error(datos.error ?? "No fue posible sincronizar el archivo finalizado.");
        return;
      }

      const incorporados = datos.incorporados ?? 0;
      const errores = datos.errores ?? [];

      if (incorporados > 0) {
        toast.success(`${incorporados} documento(s) del archivo finalizado incorporados a la biblioteca.`, {
          description: "Ya puede encontrarlos con los criterios de búsqueda del módulo.",
        });
        refrescar();
      } else if (errores.length === 0) {
        toast.info("La biblioteca ya está al día.", {
          description: `Los ${datos.omitidos ?? 0} documento(s) finalizados ya estaban incorporados.`,
        });
      }

      if (errores.length > 0) {
        toast.warning(`${errores.length} documento(s) no se pudieron incorporar.`, {
          description: errores.map((error) => `${error.documento}: ${error.motivo}`).join(" "),
        });
      }
    } catch {
      toast.error("No fue posible comunicarse con el servidor.");
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Scale className="size-5" />
            </div>
            <div className="grid gap-1">
              <CardTitle className="text-xl leading-none">Buscador jurídico</CardTitle>
              <CardDescription className="leading-snug">
                Encuentre normativa por tipo, número, fecha, título, materia o dentro del contenido de cada documento.
              </CardDescription>
            </div>
          </div>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap items-center justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:justify-end md:justify-self-end">
            <Tabs value={plan} onValueChange={cambiarPlan}>
              <TabsList>
                <TabsTrigger value="gratuita">
                  <LockOpen className="size-3.5" /> Gratuita
                </TabsTrigger>
                <TabsTrigger value="suscripcion">
                  <BadgeCheck className="size-3.5" /> Suscripción
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" variant="outline" onClick={() => void sincronizarFinalizados()} disabled={sincronizando}>
              <FolderSync className={cn("size-4", sincronizando && "animate-pulse")} />
              {sincronizando ? "Sincronizando…" : "Sincronizar finalizados"}
            </Button>
            <Button size="sm" onClick={() => setCargaAbierta(true)}>
              <FilePlus2 className="size-4" /> Agregar a biblioteca
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(300px,340px)_minmax(0,1fr)]">
        <PanelCriterios
          materias={materias}
          buscando={buscando}
          onBuscar={(criterios) => void ejecutarBusqueda(criterios)}
        />
        <TablaResultados
          resultados={resultados}
          buscando={buscando}
          plan={plan}
          onVer={verDocumento}
          onEliminado={refrescar}
        />
      </div>

      <VisorDocumento documento={documentoVisor} plan={plan} abierto={visorAbierto} onOpenChange={setVisorAbierto} />
      <DialogoCarga abierto={cargaAbierta} onOpenChange={setCargaAbierta} onCargado={refrescar} />
    </div>
  );
}
