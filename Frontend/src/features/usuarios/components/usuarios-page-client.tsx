"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getApiErrorMessage } from "@/lib/api/client";

import { useUsuarioMutations, useUsuarios } from "../hooks";
import type { RolUsuario, Usuario, UsuarioPayload } from "../types";
import { UsuarioDeleteDialog } from "./usuario-delete-dialog";
import { UsuarioFormDialog } from "./usuario-form-dialog";

const TAMANO_PAGINA = 20;

function formatearFecha(valor: string | null) {
  if (!valor) return "Nunca";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(valor));
}

function BadgeRol({ rol }: { readonly rol: RolUsuario }) {
  if (rol === "admin") {
    return (
      <Badge className="border-transparent bg-[#1279fd]/12 text-[#0e63e0] dark:bg-[#1279fd]/20 dark:text-[#6fb0ff]">
        <ShieldCheck className="size-3" />
        Administrador
      </Badge>
    );
  }
  return <Badge variant="secondary">Usuario</Badge>;
}

function BadgeEstado({ activo }: { readonly activo: boolean }) {
  return activo ? (
    <Badge className="border-transparent bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Activo
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/60" />
      Inactivo
    </Badge>
  );
}

export function UsuariosPageClient({ usuarioActualId }: { readonly usuarioActualId: number }) {
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<"todos" | RolUsuario>("todos");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "true" | "false">("todos");
  const [pagina, setPagina] = useState(1);

  const [dialogoFormulario, setDialogoFormulario] = useState<{ abierto: boolean; usuario: Usuario | null }>({
    abierto: false,
    usuario: null,
  });
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);

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
      rol: filtroRol === "todos" ? undefined : filtroRol,
      activo: filtroEstado === "todos" ? undefined : filtroEstado,
      page: pagina,
    }),
    [busqueda, filtroRol, filtroEstado, pagina],
  );

  const { data, isPending, isError, error, refetch, isFetching } = useUsuarios(consulta);
  const { crear, actualizar, eliminar, cambiarEstado } = useUsuarioMutations();

  const usuarios = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const guardando = crear.isPending || actualizar.isPending;

  const abrirCrear = () => setDialogoFormulario({ abierto: true, usuario: null });
  const abrirEditar = (usuario: Usuario) => setDialogoFormulario({ abierto: true, usuario });
  const cerrarFormulario = () => setDialogoFormulario({ abierto: false, usuario: null });

  const guardarUsuario = (payload: UsuarioPayload) => {
    const usuarioEnEdicion = dialogoFormulario.usuario;
    if (usuarioEnEdicion) {
      actualizar.mutate({ id: usuarioEnEdicion.id, payload }, { onSuccess: cerrarFormulario });
    } else {
      crear.mutate(payload, { onSuccess: cerrarFormulario });
    }
  };

  const confirmarEliminar = () => {
    if (!usuarioAEliminar) return;
    eliminar.mutate(usuarioAEliminar.id, { onSuccess: () => setUsuarioAEliminar(null) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-bold text-2xl tracking-tight">Gestión de usuarios</h1>
          <p className="text-muted-foreground text-sm">Crea cuentas, asigna roles y controla el acceso al sistema.</p>
        </div>
        <Button
          onClick={abrirCrear}
          className="bg-linear-to-b from-[#2f86ff] to-[#0e63e0] text-white shadow-[#1279fd]/25 shadow-lg transition-all hover:from-[#4292ff] hover:to-[#1670ef] hover:shadow-[#1279fd]/35 hover:shadow-xl"
        >
          <UserPlus className="size-4" />
          Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Usuarios registrados</CardTitle>
              <CardDescription className="mt-1">
                {isPending ? "Cargando…" : `${total} ${total === 1 ? "cuenta" : "cuentas"} en total`}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
                <Input
                  value={textoBusqueda}
                  onChange={(evento) => setTextoBusqueda(evento.target.value)}
                  placeholder="Buscar por nombre o correo…"
                  className="w-full pl-9 sm:w-64"
                />
              </div>
              <Select
                value={filtroRol}
                onValueChange={(valor) => {
                  setFiltroRol(valor as typeof filtroRol);
                  setPagina(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                  <SelectItem value="usuario">Usuarios</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filtroEstado}
                onValueChange={(valor) => {
                  setFiltroEstado(valor as typeof filtroEstado);
                  setPagina(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="true">Activos</SelectItem>
                  <SelectItem value="false">Inactivos</SelectItem>
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
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Último acceso</TableHead>
                  <TableHead className="hidden lg:table-cell">Registrado</TableHead>
                  <TableHead className="w-12 text-right" />
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
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell />
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

                {!isPending && !isError && usuarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <p className="font-medium text-sm">No se encontraron usuarios</p>
                      <p className="mt-1 text-muted-foreground text-sm">Ajusta los filtros o crea un nuevo usuario.</p>
                    </TableCell>
                  </TableRow>
                )}

                {!isPending &&
                  !isError &&
                  usuarios.map((usuario) => {
                    const esActual = usuario.id === usuarioActualId;
                    return (
                      <TableRow key={usuario.id} className={isFetching ? "opacity-60" : undefined}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              nombre={`${usuario.nombre} ${usuario.apellido}`.trim()}
                              email={usuario.email}
                              src={usuario.avatar}
                              className="size-9"
                              fallbackClassName="text-xs"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-sm">
                                {`${usuario.nombre} ${usuario.apellido}`.trim() || "Sin nombre"}
                                {esActual && <span className="ml-1.5 text-muted-foreground text-xs">(tú)</span>}
                              </p>
                              <p className="truncate text-muted-foreground text-xs">{usuario.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <BadgeRol rol={usuario.rol} />
                        </TableCell>
                        <TableCell>
                          <BadgeEstado activo={usuario.activo} />
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground text-sm md:table-cell">
                          {formatearFecha(usuario.ultimo_acceso)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground text-sm lg:table-cell">
                          {formatearFecha(usuario.fecha_registro)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <EllipsisVertical className="size-4" />
                                <span className="sr-only">Acciones</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => abrirEditar(usuario)}>
                                <Pencil className="size-4" />
                                Editar
                              </DropdownMenuItem>
                              {!esActual && (
                                <DropdownMenuItem
                                  onClick={() => cambiarEstado.mutate({ id: usuario.id, activo: !usuario.activo })}
                                >
                                  {usuario.activo ? (
                                    <>
                                      <UserX className="size-4" />
                                      Desactivar
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="size-4" />
                                      Activar
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              {!esActual && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem variant="destructive" onClick={() => setUsuarioAEliminar(usuario)}>
                                    <Trash2 className="size-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      <UsuarioFormDialog
        abierto={dialogoFormulario.abierto}
        usuario={dialogoFormulario.usuario}
        guardando={guardando}
        esUsuarioActual={dialogoFormulario.usuario?.id === usuarioActualId}
        onCerrar={cerrarFormulario}
        onGuardar={guardarUsuario}
      />
      <UsuarioDeleteDialog
        usuario={usuarioAEliminar}
        eliminando={eliminar.isPending}
        onCerrar={() => setUsuarioAEliminar(null)}
        onConfirmar={confirmarEliminar}
      />
    </div>
  );
}
