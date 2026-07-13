"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  MonitorSmartphone,
  Search,
  UserRound,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getApiErrorMessage } from "@/lib/api/client";

import { useResumenSuscriptores, useSuscriptores } from "../hooks";
import type { CodigoPlan, EstadoSuscripcion, Suscriptor } from "../types";

const TAMANO_PAGINA = 20;

const ETIQUETA_PERIODICIDAD: Record<string, string> = {
  mensual: "Mensual",
  semestral: "Semestral",
  anual: "Anual",
};

function formatearFecha(valor: string | null) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(valor));
}

function formatearBs(valor: string | number) {
  const numero = typeof valor === "string" ? Number.parseFloat(valor) : valor;
  return `Bs ${Number.isNaN(numero) ? valor : numero.toLocaleString("es-BO", { minimumFractionDigits: 2 })}`;
}

function BadgeEstadoSuscripcion({ estado }: { readonly estado: EstadoSuscripcion }) {
  switch (estado) {
    case "activa":
      return (
        <Badge className="border-transparent bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Activa
        </Badge>
      );
    case "pendiente_pago":
      return (
        <Badge className="border-transparent bg-amber-500/12 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Pendiente de pago
        </Badge>
      );
    case "vencida":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <span className="size-1.5 rounded-full bg-muted-foreground/60" />
          Vencida
        </Badge>
      );
    default:
      return (
        <Badge className="border-transparent bg-red-500/12 text-red-600 dark:bg-red-500/20 dark:text-red-400">
          <span className="size-1.5 rounded-full bg-red-500" />
          Cancelada
        </Badge>
      );
  }
}

function BadgePlan({ suscriptor }: { readonly suscriptor: Suscriptor }) {
  const destacado = suscriptor.plan_codigo === "profesional";
  return (
    <div className="space-y-0.5">
      <Badge
        className={
          destacado
            ? "border-transparent bg-[#1279fd]/12 text-[#0e63e0] dark:bg-[#1279fd]/20 dark:text-[#6fb0ff]"
            : undefined
        }
        variant={destacado ? undefined : "secondary"}
      >
        {suscriptor.plan.replace("Plan ", "")}
      </Badge>
      <p className="text-muted-foreground text-xs">
        {ETIQUETA_PERIODICIDAD[suscriptor.periodicidad] ?? suscriptor.periodicidad} · {formatearBs(suscriptor.precio)}
      </p>
    </div>
  );
}

function TarjetaResumen({
  titulo,
  valor,
  detalle,
  icono,
  cargando,
}: {
  readonly titulo: string;
  readonly valor: string;
  readonly detalle: string;
  readonly icono: React.ReactNode;
  readonly cargando: boolean;
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="font-medium text-muted-foreground text-sm">{titulo}</CardTitle>
        <div className="flex size-9 items-center justify-center rounded-lg bg-[#1279fd]/10 text-[#0e63e0] dark:text-[#6fb0ff]">
          {icono}
        </div>
      </CardHeader>
      <CardContent>
        {cargando ? <Skeleton className="h-8 w-24" /> : <p className="font-bold text-2xl tracking-tight">{valor}</p>}
        <p className="mt-1 text-muted-foreground text-xs">{detalle}</p>
      </CardContent>
    </Card>
  );
}

export function SuscriptoresPageClient() {
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoSuscripcion>("todos");
  const [filtroPlan, setFiltroPlan] = useState<"todos" | CodigoPlan>("todos");
  const [pagina, setPagina] = useState(1);

  // Búsqueda con retardo para no consultar en cada tecla.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBusqueda(textoBusqueda.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(temporizador);
  }, [textoBusqueda]);

  const consulta = useMemo(
    () => ({
      q: busqueda || undefined,
      estado: filtroEstado === "todos" ? undefined : filtroEstado,
      plan: filtroPlan === "todos" ? undefined : filtroPlan,
      page: pagina,
    }),
    [busqueda, filtroEstado, filtroPlan, pagina],
  );

  const { data, isPending, isError, error, refetch, isFetching } = useSuscriptores(consulta);
  const resumen = useResumenSuscriptores();

  const suscriptores = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-bold text-2xl tracking-tight">Suscriptores</h1>
        <p className="text-muted-foreground text-sm">
          Personas suscritas a los planes de la Biblioteca Jurídica: estado, pagos y dispositivos habilitados.
        </p>
      </div>

      {/* Métricas del módulo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaResumen
          titulo="Suscripciones activas"
          valor={String(resumen.data?.activas ?? 0)}
          detalle={`${resumen.data?.clientes ?? 0} clientes registrados`}
          icono={<Users className="size-4" />}
          cargando={resumen.isPending}
        />
        <TarjetaResumen
          titulo="Pendientes de pago"
          valor={String(resumen.data?.pendientes ?? 0)}
          detalle="Iniciaron el checkout y aún no pagan"
          icono={<Clock3 className="size-4" />}
          cargando={resumen.isPending}
        />
        <TarjetaResumen
          titulo="Vencidas / canceladas"
          valor={String(resumen.data?.vencidas ?? 0)}
          detalle="Candidatas a renovación"
          icono={<UserRound className="size-4" />}
          cargando={resumen.isPending}
        />
        <TarjetaResumen
          titulo="Ingresos cobrados"
          valor={formatearBs(resumen.data?.ingresos_cobrados ?? "0")}
          detalle="Pagos verificados por la pasarela"
          icono={<Banknote className="size-4" />}
          cargando={resumen.isPending}
        />
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Suscripciones</CardTitle>
              <CardDescription className="mt-1">
                {isPending ? "Cargando…" : `${total} ${total === 1 ? "suscripción" : "suscripciones"} en total`}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={textoBusqueda}
                  onChange={(evento) => setTextoBusqueda(evento.target.value)}
                  placeholder="Buscar por nombre, correo o WhatsApp…"
                  className="w-full pl-9 sm:w-72"
                />
              </div>
              <Select
                value={filtroEstado}
                onValueChange={(valor) => {
                  setFiltroEstado(valor as typeof filtroEstado);
                  setPagina(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="activa">Activas</SelectItem>
                  <SelectItem value="pendiente_pago">Pendientes de pago</SelectItem>
                  <SelectItem value="vencida">Vencidas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filtroPlan}
                onValueChange={(valor) => {
                  setFiltroPlan(valor as typeof filtroPlan);
                  setPagina(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los planes</SelectItem>
                  <SelectItem value="estudiantil">Estudiantil</SelectItem>
                  <SelectItem value="profesional">Profesional</SelectItem>
                  <SelectItem value="consultora">Consultora</SelectItem>
                  <SelectItem value="empresarial">Empresarial</SelectItem>
                  <SelectItem value="gratuito">Gratuito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Dispositivos</TableHead>
                  <TableHead className="hidden lg:table-cell">Último pago</TableHead>
                  <TableHead className="hidden xl:table-cell">Vigencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending &&
                  Array.from({ length: 5 }, (_, indice) => (
                    <TableRow key={indice}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-9 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-36" />
                            <Skeleton className="h-3 w-44" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))}

                {isError && !isPending && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <p className="text-muted-foreground text-sm">{getApiErrorMessage(error)}</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                        Reintentar
                      </Button>
                    </TableCell>
                  </TableRow>
                )}

                {!isPending && !isError && suscriptores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <p className="font-medium text-sm">Aún no hay suscriptores</p>
                      <p className="mt-1 text-muted-foreground text-sm">
                        Cuando un cliente se suscriba desde la página de planes aparecerá aquí.
                      </p>
                    </TableCell>
                  </TableRow>
                )}

                {!isPending &&
                  !isError &&
                  suscriptores.map((suscriptor) => (
                    <TableRow key={suscriptor.id} className={isFetching ? "opacity-60" : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            nombre={suscriptor.cliente.nombre_completo}
                            email={suscriptor.cliente.email}
                            src={null}
                            className="size-9"
                            fallbackClassName="text-xs"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-sm">{suscriptor.cliente.nombre_completo}</p>
                            <p className="truncate text-muted-foreground text-xs">
                              {suscriptor.cliente.email} · {suscriptor.cliente.whatsapp}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <BadgePlan suscriptor={suscriptor} />
                      </TableCell>
                      <TableCell>
                        <BadgeEstadoSuscripcion estado={suscriptor.estado} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
                          <MonitorSmartphone className="size-3.5" />
                          {suscriptor.credenciales_vinculadas}/{suscriptor.dispositivos} vinculados
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {suscriptor.ultimo_pago ? (
                          <div className="text-sm">
                            <span className="inline-flex items-center gap-1.5">
                              <CreditCard className="size-3.5 text-muted-foreground" />
                              {formatearBs(suscriptor.ultimo_pago.monto)}
                            </span>
                            <p className="text-muted-foreground text-xs">
                              {suscriptor.ultimo_pago.forma_pago ||
                                (suscriptor.ultimo_pago.estado === "pagado" ? "Pagado" : "Sin confirmar")}{" "}
                              · {formatearFecha(suscriptor.ultimo_pago.pagado_en ?? suscriptor.ultimo_pago.creado_en)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-sm xl:table-cell">
                        {suscriptor.fecha_fin ? (
                          <div>
                            <p>hasta {formatearFecha(suscriptor.fecha_fin)}</p>
                            <p className="text-muted-foreground text-xs">
                              desde {formatearFecha(suscriptor.fecha_inicio)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Página {pagina} de {totalPaginas}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina <= 1 || isFetching}
              onClick={() => setPagina((actual) => actual - 1)}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= totalPaginas || isFetching}
              onClick={() => setPagina((actual) => actual + 1)}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
