"use client";

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeCheck,
  Bell,
  CalendarClock,
  Camera,
  Clock,
  KeyRound,
  Loader2,
  Mail,
  Save,
  Scale,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { colorAvatar, inicialesAvatar } from "@/lib/avatar";
import type { PerfilCompleto } from "@/server/auth/session";

function extraerError(payload: unknown, respaldo: string): string {
  if (payload && typeof payload === "object") {
    const registro = payload as Record<string, unknown>;
    for (const clave of ["detail", "password_actual", "password_nueva", "email", "non_field_errors"]) {
      const valor = registro[clave];
      if (typeof valor === "string") return valor;
      if (Array.isArray(valor) && typeof valor[0] === "string") return valor[0];
    }
  }
  return respaldo;
}

function fechaLarga(valor: string | null) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date(valor));
}

function fechaHora(valor: string | null) {
  if (!valor) return "Nunca";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(valor));
}

const perfilSchema = z.object({
  nombre: z.string().min(1, { message: "Ingresa tu nombre." }),
  apellido: z.string().optional(),
  email: z.string().email({ message: "Ingresa un correo electrónico válido." }),
  telefono: z.string().optional(),
  matricula: z.string().optional(),
  especialidad: z.string().optional(),
  bio: z.string().optional(),
});

const passwordSchema = z
  .object({
    password_actual: z.string().min(1, { message: "Ingresa tu contraseña actual." }),
    password_nueva: z.string().min(8, { message: "La nueva contraseña debe tener al menos 8 caracteres." }),
    confirmar: z.string().min(1, { message: "Confirma la nueva contraseña." }),
  })
  .refine((data) => data.password_nueva === data.confirmar, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmar"],
  });

const notificationPrefs = [
  {
    id: "audiencias",
    title: "Recordatorios de audiencias",
    description: "Avisos antes de cada audiencia programada.",
    defaultChecked: true,
  },
  {
    id: "plazos",
    title: "Vencimiento de plazos",
    description: "Alertas de escritos y actuaciones por vencer.",
    defaultChecked: true,
  },
  {
    id: "documentos",
    title: "Documentos por revisar",
    description: "Notificación cuando ingresa un documento a la bandeja.",
    defaultChecked: true,
  },
  {
    id: "resumen",
    title: "Resumen semanal",
    description: "Reporte de gestión cada lunes por la mañana.",
    defaultChecked: false,
  },
];

const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024; // 5 MB

export function CuentaClient({ perfil }: { readonly perfil: PerfilCompleto }) {
  const router = useRouter();
  const esAdmin = perfil.rol === "admin";
  const rolTexto = esAdmin ? "Administrador" : "Usuario";
  const nombreCompleto = `${perfil.nombre} ${perfil.apellido}`.trim() || perfil.email;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);

  const onSeleccionarFoto = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      toast.error("Archivo no válido", { description: "Selecciona una imagen (JPG, PNG, WEBP o GIF)." });
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_FOTO) {
      toast.error("Imagen muy grande", { description: "La foto no debe superar los 5 MB." });
      return;
    }

    setProcesandoFoto(true);
    const datosFormulario = new FormData();
    datosFormulario.append("avatar", archivo);
    const respuesta = await fetch("/api/backend/auth/perfil/avatar", {
      method: "POST",
      body: datosFormulario,
    }).catch(() => null);
    setProcesandoFoto(false);

    if (!respuesta) {
      toast.error("Sin conexión", { description: "No se pudo contactar al servidor." });
      return;
    }
    const datos: unknown = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      toast.error("No se pudo subir la foto", { description: extraerError(datos, "Intenta con otra imagen.") });
      return;
    }
    toast.success("Foto de perfil actualizada");
    router.refresh();
  };

  const quitarFoto = async () => {
    setProcesandoFoto(true);
    const respuesta = await fetch("/api/backend/auth/perfil/avatar", { method: "DELETE" }).catch(() => null);
    setProcesandoFoto(false);
    if (!respuesta?.ok) {
      toast.error("No se pudo quitar la foto", { description: "Inténtalo de nuevo." });
      return;
    }
    toast.success("Foto de perfil eliminada");
    router.refresh();
  };

  const perfilForm = useForm<z.infer<typeof perfilSchema>>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      email: perfil.email,
      telefono: perfil.telefono,
      matricula: perfil.matricula,
      especialidad: perfil.especialidad,
      bio: perfil.bio,
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password_actual: "", password_nueva: "", confirmar: "" },
  });

  const stats = [
    { label: "Rol", value: rolTexto, icon: esAdmin ? ShieldCheck : UserIcon },
    { label: "Estado", value: perfil.activo ? "Activa" : "Inactiva", icon: BadgeCheck },
    { label: "Miembro desde", value: fechaLarga(perfil.fecha_registro), icon: CalendarClock },
    { label: "Último acceso", value: fechaHora(perfil.ultimo_acceso), icon: Clock },
  ];

  const guardarPerfil = async (valores: z.infer<typeof perfilSchema>) => {
    const respuesta = await fetch("/api/backend/auth/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    }).catch(() => null);

    if (!respuesta) {
      toast.error("Sin conexión", { description: "No se pudo contactar al servidor." });
      return;
    }
    const datos: unknown = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      toast.error("No se pudo guardar", { description: extraerError(datos, "Revisa los datos ingresados.") });
      return;
    }
    toast.success("Perfil actualizado", { description: "Tus datos se guardaron correctamente." });
    router.refresh();
  };

  const cambiarPassword = async (valores: z.infer<typeof passwordSchema>) => {
    const respuesta = await fetch("/api/backend/auth/cambiar-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password_actual: valores.password_actual,
        password_nueva: valores.password_nueva,
      }),
    }).catch(() => null);

    if (!respuesta) {
      toast.error("Sin conexión", { description: "No se pudo contactar al servidor." });
      return;
    }
    const datos: unknown = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      toast.error("No se pudo actualizar la contraseña", {
        description: extraerError(datos, "Revisa los datos ingresados."),
      });
      return;
    }
    toast.success("Contraseña actualizada", { description: "Usa tu nueva contraseña la próxima vez." });
    passwordForm.reset();
  };

  const guardandoPerfil = perfilForm.formState.isSubmitting;
  const guardandoPassword = passwordForm.formState.isSubmitting;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-none bg-gradient-to-br from-[#061e46] via-[#0e63e0] to-[#1279fd] text-white shadow-sm">
        <BadgeCheck className="pointer-events-none absolute -right-6 -bottom-8 size-48 rotate-12 text-white/10" />
        <div className="relative flex flex-col gap-5 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
            <div className="group relative">
              <Avatar className="size-24 rounded-full bg-white/15 ring-4 ring-white/25">
                {perfil.avatar ? (
                  <AvatarImage src={perfil.avatar} alt={nombreCompleto} className="rounded-full object-cover" />
                ) : null}
                <AvatarFallback className="rounded-full bg-transparent font-semibold text-2xl text-white">
                  {inicialesAvatar(nombreCompleto, perfil.email)}
                </AvatarFallback>
              </Avatar>
              {/* Superposición para cambiar la foto al pasar el cursor */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={procesandoFoto}
                aria-label="Cambiar foto de perfil"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed"
              >
                {procesandoFoto ? (
                  <Loader2 className="size-6 animate-spin text-white" />
                ) : (
                  <Camera className="size-6 text-white" />
                )}
              </button>
            </div>
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-2 rounded-none bg-white/15 px-3 py-1 font-medium text-xs uppercase tracking-wide">
                <BadgeCheck className="size-3.5" /> Mi cuenta
              </span>
              <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">{nombreCompleto}</h1>
              <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-white/85 sm:justify-start">
                <Scale className="size-4" /> {rolTexto}
                <span className="text-white/40">•</span>
                <Mail className="size-4" /> {perfil.email}
              </p>
            </div>
          </div>

          {/* Acciones de foto */}
          <div className="flex justify-center gap-2 sm:justify-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              onChange={onSeleccionarFoto}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={procesandoFoto}
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-[#0e63e0] hover:bg-white/90"
            >
              {procesandoFoto ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {perfil.avatar ? "Cambiar foto" : "Subir foto"}
            </Button>
            {perfil.avatar ? (
              <Button
                type="button"
                variant="ghost"
                disabled={procesandoFoto}
                onClick={quitarFoto}
                className="text-white hover:bg-white/15 hover:text-white"
              >
                <Trash2 className="size-4" /> Quitar
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Datos reales de la cuenta */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="rounded-none">
              <CardContent className="flex items-center gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-none bg-[#1279fd]/10 text-[#0e63e0] dark:text-[#6fb0ff]">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-base leading-tight">{stat.value}</p>
                  <p className="mt-0.5 text-muted-foreground text-sm">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="perfil" className="gap-6">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
          <TabsTrigger value="preferencias">Preferencias</TabsTrigger>
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
            <form onSubmit={perfilForm.handleSubmit(guardarPerfil)}>
              <Card className="rounded-none">
                <CardHeader>
                  <CardTitle>Información personal</CardTitle>
                  <CardDescription>Actualiza tus datos de contacto y tu información profesional.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Controller
                      control={perfilForm.control}
                      name="nombre"
                      render={({ field, fieldState }) => (
                        <div className="grid gap-2">
                          <Label htmlFor="nombre">Nombres</Label>
                          <Input id="nombre" {...field} disabled={guardandoPerfil} aria-invalid={fieldState.invalid} />
                          {fieldState.error && <p className="text-destructive text-xs">{fieldState.error.message}</p>}
                        </div>
                      )}
                    />
                    <Controller
                      control={perfilForm.control}
                      name="apellido"
                      render={({ field }) => (
                        <div className="grid gap-2">
                          <Label htmlFor="apellidos">Apellidos</Label>
                          <Input id="apellidos" {...field} disabled={guardandoPerfil} />
                        </div>
                      )}
                    />
                    <Controller
                      control={perfilForm.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <div className="grid gap-2">
                          <Label htmlFor="email">Correo electrónico</Label>
                          <Input
                            id="email"
                            type="email"
                            {...field}
                            disabled={guardandoPerfil}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.error && <p className="text-destructive text-xs">{fieldState.error.message}</p>}
                        </div>
                      )}
                    />
                    <Controller
                      control={perfilForm.control}
                      name="telefono"
                      render={({ field }) => (
                        <div className="grid gap-2">
                          <Label htmlFor="telefono">Teléfono</Label>
                          <Input
                            id="telefono"
                            type="tel"
                            placeholder="+591 700 00000"
                            {...field}
                            disabled={guardandoPerfil}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      control={perfilForm.control}
                      name="matricula"
                      render={({ field }) => (
                        <div className="grid gap-2">
                          <Label htmlFor="matricula">Matrícula profesional</Label>
                          <Input id="matricula" placeholder="Ej. RNA 12345" {...field} disabled={guardandoPerfil} />
                        </div>
                      )}
                    />
                    <Controller
                      control={perfilForm.control}
                      name="especialidad"
                      render={({ field }) => (
                        <div className="grid gap-2">
                          <Label htmlFor="especialidad">Especialidad</Label>
                          <Input
                            id="especialidad"
                            placeholder="Ej. Derecho Civil"
                            {...field}
                            disabled={guardandoPerfil}
                          />
                        </div>
                      )}
                    />
                  </div>
                  <Controller
                    control={perfilForm.control}
                    name="bio"
                    render={({ field }) => (
                      <div className="grid gap-2">
                        <Label htmlFor="bio">Reseña profesional</Label>
                        <Textarea
                          id="bio"
                          rows={4}
                          placeholder="Cuéntanos sobre tu experiencia profesional…"
                          {...field}
                          disabled={guardandoPerfil}
                        />
                      </div>
                    )}
                  />
                </CardContent>
                <Separator />
                <CardContent className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" disabled={guardandoPerfil} onClick={() => perfilForm.reset()}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={guardandoPerfil}
                    className="bg-linear-to-b from-[#2f86ff] to-[#0e63e0] text-white hover:from-[#4292ff] hover:to-[#1670ef]"
                  >
                    {guardandoPerfil ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Guardando…
                      </>
                    ) : (
                      <>
                        <Save className="size-4" /> Guardar cambios
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </form>

            <Card className="h-fit rounded-none">
              <CardHeader>
                <CardTitle>Resumen de la cuenta</CardTitle>
                <CardDescription>Información registrada en el sistema.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 rounded-full">
                    {perfil.avatar ? (
                      <AvatarImage src={perfil.avatar} alt={nombreCompleto} className="rounded-full object-cover" />
                    ) : null}
                    <AvatarFallback
                      className="rounded-full font-semibold text-white text-xs"
                      style={{ backgroundColor: colorAvatar(nombreCompleto || perfil.email) }}
                    >
                      {inicialesAvatar(nombreCompleto, perfil.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{nombreCompleto}</p>
                    <p className="truncate text-muted-foreground text-xs">{perfil.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rol</span>
                  <Badge
                    className={
                      esAdmin
                        ? "border-transparent bg-[#1279fd]/12 text-[#0e63e0] dark:bg-[#1279fd]/20 dark:text-[#6fb0ff]"
                        : ""
                    }
                    variant={esAdmin ? "default" : "secondary"}
                  >
                    {esAdmin && <ShieldCheck className="size-3" />} {rolTexto}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  {perfil.activo ? (
                    <Badge className="border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <ShieldCheck className="size-3" /> Activa
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inactiva
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Miembro desde</span>
                  <span className="font-medium">{fechaLarga(perfil.fecha_registro)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Último acceso</span>
                  <span className="font-medium">{fechaHora(perfil.ultimo_acceso)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Seguridad */}
        <TabsContent value="seguridad" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={passwordForm.handleSubmit(cambiarPassword)}>
              <Card className="rounded-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="size-4.5 text-[#0e63e0] dark:text-[#6fb0ff]" /> Cambiar contraseña
                  </CardTitle>
                  <CardDescription>Usa una contraseña segura que no utilices en otros servicios.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <Controller
                    control={passwordForm.control}
                    name="password_actual"
                    render={({ field, fieldState }) => (
                      <div className="grid gap-2">
                        <Label htmlFor="actual">Contraseña actual</Label>
                        <Input
                          id="actual"
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          {...field}
                          disabled={guardandoPassword}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error && <p className="text-destructive text-xs">{fieldState.error.message}</p>}
                      </div>
                    )}
                  />
                  <Controller
                    control={passwordForm.control}
                    name="password_nueva"
                    render={({ field, fieldState }) => (
                      <div className="grid gap-2">
                        <Label htmlFor="nueva">Nueva contraseña</Label>
                        <Input
                          id="nueva"
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
                          {...field}
                          disabled={guardandoPassword}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error && <p className="text-destructive text-xs">{fieldState.error.message}</p>}
                      </div>
                    )}
                  />
                  <Controller
                    control={passwordForm.control}
                    name="confirmar"
                    render={({ field, fieldState }) => (
                      <div className="grid gap-2">
                        <Label htmlFor="confirmar">Confirmar nueva contraseña</Label>
                        <Input
                          id="confirmar"
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
                          {...field}
                          disabled={guardandoPassword}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error && <p className="text-destructive text-xs">{fieldState.error.message}</p>}
                      </div>
                    )}
                  />
                </CardContent>
                <Separator />
                <CardContent className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={guardandoPassword}
                    className="bg-linear-to-b from-[#2f86ff] to-[#0e63e0] text-white hover:from-[#4292ff] hover:to-[#1670ef]"
                  >
                    {guardandoPassword ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Actualizando…
                      </>
                    ) : (
                      <>
                        <Save className="size-4" /> Actualizar contraseña
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </form>

            <Card className="h-fit rounded-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4.5 text-[#0e63e0] dark:text-[#6fb0ff]" /> Seguridad de la cuenta
                </CardTitle>
                <CardDescription>Datos de acceso de tu cuenta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4 rounded-none border p-4">
                  <div>
                    <p className="font-medium text-sm">Correo de acceso</p>
                    <p className="text-muted-foreground text-xs">{perfil.email}</p>
                  </div>
                  <Badge variant="outline">
                    <Mail className="size-3" /> Correo
                  </Badge>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-none border p-4">
                  <div>
                    <p className="font-medium text-sm">Último acceso</p>
                    <p className="text-muted-foreground text-xs">{fechaHora(perfil.ultimo_acceso)}</p>
                  </div>
                  <Badge variant="outline">Este equipo</Badge>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-none border p-4">
                  <div>
                    <p className="font-medium text-sm">Nivel de acceso</p>
                    <p className="text-muted-foreground text-xs">
                      {esAdmin ? "Acceso total y gestión de usuarios." : "Acceso operativo al sistema."}
                    </p>
                  </div>
                  <Badge variant={esAdmin ? "default" : "secondary"} className="capitalize">
                    {rolTexto}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Preferencias */}
        <TabsContent value="preferencias" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4.5 text-[#0e63e0] dark:text-[#6fb0ff]" /> Notificaciones
              </CardTitle>
              <CardDescription>Elige qué avisos deseas recibir en tu panel.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {notificationPrefs.map((pref) => (
                <div key={pref.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{pref.title}</p>
                    <p className="text-muted-foreground text-xs">{pref.description}</p>
                  </div>
                  <Switch defaultChecked={pref.defaultChecked} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
