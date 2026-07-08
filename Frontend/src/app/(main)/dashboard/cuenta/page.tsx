"use client";

import * as React from "react";

import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Camera,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Save,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

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
import { rootUser } from "@/data/users";
import { getInitials } from "@/lib/utils";

const stats = [
  { label: "Expedientes", value: "18", icon: BriefcaseBusiness },
  { label: "Clientes", value: "42", icon: Users },
  { label: "Audiencias", value: "7", icon: CalendarClock },
  { label: "Años de ejercicio", value: "9", icon: Scale },
];

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

export default function CuentaPage() {
  const [avatarError, setAvatarError] = React.useState(false);

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    toast.success("Cambios guardados correctamente.");
  }

  function handlePasswordSave(event: React.FormEvent) {
    event.preventDefault();
    toast.success("Contraseña actualizada.");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-none bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
        <BadgeCheck className="pointer-events-none absolute -right-6 -bottom-8 size-48 rotate-12 text-primary-foreground/10" />
        <div className="relative flex flex-col gap-5 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
            <Avatar className="size-24 rounded-2xl ring-4 ring-primary-foreground/25">
              {!avatarError ? (
                <AvatarImage
                  src={rootUser.avatar || undefined}
                  alt={rootUser.name}
                  onError={() => setAvatarError(true)}
                />
              ) : null}
              <AvatarFallback className="rounded-2xl bg-primary-foreground/15 font-semibold text-2xl text-primary-foreground">
                {getInitials(rootUser.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 font-medium text-xs uppercase tracking-wide">
                <BadgeCheck className="size-3.5" /> Mi cuenta
              </span>
              <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">{rootUser.name}</h1>
              <p className="flex items-center justify-center gap-2 text-primary-foreground/80 text-sm capitalize sm:justify-start">
                <Scale className="size-4" /> {rootUser.role}
                <span className="text-primary-foreground/40">•</span>
                <Mail className="size-4" /> {rootUser.email}
              </p>
            </div>
          </div>
          <div className="flex justify-center gap-2 sm:justify-end">
            <Button variant="secondary" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Camera className="size-4" /> Cambiar foto
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-2xl tabular-nums leading-none">{stat.value}</p>
                  <p className="mt-1 text-muted-foreground text-sm">{stat.label}</p>
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
            <form onSubmit={handleSave}>
              <Card>
                <CardHeader>
                  <CardTitle>Información personal</CardTitle>
                  <CardDescription>Actualice sus datos de contacto y su información profesional.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="nombre">Nombres</Label>
                      <Input id="nombre" defaultValue="Daniel Wilson" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="apellidos">Apellidos</Label>
                      <Input id="apellidos" defaultValue="Flores" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input id="email" type="email" defaultValue={rootUser.email} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input id="telefono" type="tel" defaultValue="+591 700 00000" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="matricula">Matrícula profesional</Label>
                      <Input id="matricula" defaultValue="RNA 12345" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="especialidad">Especialidad</Label>
                      <Input id="especialidad" defaultValue="Derecho Civil y Comercial" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bio">Reseña profesional</Label>
                    <Textarea
                      id="bio"
                      rows={4}
                      defaultValue="Abogado administrador del estudio, responsable de la gestión de expedientes, audiencias y la coordinación del equipo jurídico."
                    />
                  </div>
                </CardContent>
                <Separator />
                <CardContent className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Save className="size-4" /> Guardar cambios
                  </Button>
                </CardContent>
              </Card>
            </form>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Estudio jurídico</CardTitle>
                <CardDescription>Información de la organización.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Building2 className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">Consultor Jurídico</p>
                    <p className="text-muted-foreground text-xs">Estudio de abogados</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <MapPin className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">La Paz, Bolivia</p>
                    <p className="text-muted-foreground text-xs">Zona Central</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Phone className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">+591 2 000 0000</p>
                    <p className="text-muted-foreground text-xs">Central telefónica</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rol</span>
                  <Badge variant="secondary" className="capitalize">
                    {rootUser.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge className="border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <ShieldCheck className="size-3" /> Verificado
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Seguridad */}
        <TabsContent value="seguridad" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={handlePasswordSave}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="size-4.5 text-primary" /> Cambiar contraseña
                  </CardTitle>
                  <CardDescription>Use una contraseña segura que no utilice en otros servicios.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="actual">Contraseña actual</Label>
                    <Input id="actual" type="password" placeholder="••••••••" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nueva">Nueva contraseña</Label>
                    <Input id="nueva" type="password" placeholder="••••••••" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmar">Confirmar nueva contraseña</Label>
                    <Input id="confirmar" type="password" placeholder="••••••••" />
                  </div>
                </CardContent>
                <Separator />
                <CardContent className="flex justify-end pt-4">
                  <Button type="submit">
                    <Save className="size-4" /> Actualizar contraseña
                  </Button>
                </CardContent>
              </Card>
            </form>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4.5 text-primary" /> Seguridad de la cuenta
                </CardTitle>
                <CardDescription>Refuerce la protección de su acceso.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Verificación en dos pasos</p>
                    <p className="text-muted-foreground text-xs">Solicita un código adicional al iniciar sesión.</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Cerrar sesión en otros dispositivos</p>
                    <p className="text-muted-foreground text-xs">Finaliza las sesiones activas fuera de este equipo.</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Cerrar sesiones
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Última conexión</p>
                    <p className="text-muted-foreground text-xs">Hoy · La Paz, Bolivia</p>
                  </div>
                  <Badge variant="outline">Este equipo</Badge>
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
                <Bell className="size-4.5 text-primary" /> Notificaciones
              </CardTitle>
              <CardDescription>Elija qué avisos desea recibir en su panel.</CardDescription>
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
