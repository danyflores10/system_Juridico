"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Trash2, Upload } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/ui/user-avatar";

import type { Usuario, UsuarioPayload } from "../types";

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024; // 5 MB

const esquema = z.object({
  nombre: z.string().min(2, { message: "Ingresa el nombre." }),
  apellido: z.string().optional(),
  email: z.string().email({ message: "Ingresa un correo electrónico válido." }),
  rol: z.enum(["admin", "usuario"]),
  activo: z.boolean(),
  password: z.string().refine((valor) => valor === "" || valor.length >= 8, {
    message: "La contraseña debe tener al menos 8 caracteres.",
  }),
});

type ValoresFormulario = z.infer<typeof esquema>;

interface UsuarioFormDialogProps {
  readonly abierto: boolean;
  readonly usuario: Usuario | null;
  readonly guardando: boolean;
  readonly esUsuarioActual: boolean;
  readonly onCerrar: () => void;
  readonly onGuardar: (payload: UsuarioPayload) => void;
}

const VALORES_INICIALES: ValoresFormulario = {
  nombre: "",
  apellido: "",
  email: "",
  rol: "usuario",
  activo: true,
  password: "",
};

export function UsuarioFormDialog({
  abierto,
  usuario,
  guardando,
  esUsuarioActual,
  onCerrar,
  onGuardar,
}: UsuarioFormDialogProps) {
  const esEdicion = usuario !== null;
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
  const [fotoEliminada, setFotoEliminada] = useState(false);

  const form = useForm<ValoresFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: VALORES_INICIALES,
  });

  useEffect(() => {
    if (abierto) {
      setMostrarPassword(false);
      setFotoArchivo(null);
      setFotoEliminada(false);
      form.reset(
        usuario
          ? {
              nombre: usuario.nombre,
              apellido: usuario.apellido,
              email: usuario.email,
              rol: usuario.rol,
              activo: usuario.activo,
              password: "",
            }
          : VALORES_INICIALES,
      );
    }
  }, [abierto, usuario, form]);

  // Vista previa: foto recién elegida, o la actual, o ninguna (iniciales de color).
  const previewNuevaFoto = useMemo(() => (fotoArchivo ? URL.createObjectURL(fotoArchivo) : null), [fotoArchivo]);
  useEffect(() => {
    return () => {
      if (previewNuevaFoto) URL.revokeObjectURL(previewNuevaFoto);
    };
  }, [previewNuevaFoto]);
  const fotoPreview = previewNuevaFoto ?? (fotoEliminada ? null : (usuario?.avatar ?? null));

  const nombreVista = `${form.watch("nombre") ?? ""} ${form.watch("apellido") ?? ""}`.trim();
  const emailVista = form.watch("email") ?? "";

  const seleccionarFoto = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    if (!TIPOS_FOTO.includes(archivo.type)) {
      toast.error("Formato no permitido", { description: "Usa una imagen JPG, PNG, WEBP o GIF." });
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_FOTO) {
      toast.error("Imagen demasiado grande", { description: "La foto no debe superar los 5 MB." });
      return;
    }
    setFotoArchivo(archivo);
    setFotoEliminada(false);
  };

  const quitarFoto = () => {
    setFotoArchivo(null);
    setFotoEliminada(true);
  };

  const onSubmit = (valores: ValoresFormulario) => {
    if (!esEdicion && !valores.password) {
      form.setError("password", { message: "La contraseña es obligatoria al crear un usuario." });
      return;
    }
    const payload: UsuarioPayload = {
      nombre: valores.nombre.trim(),
      apellido: valores.apellido?.trim() ?? "",
      email: valores.email.trim(),
      rol: valores.rol,
      activo: valores.activo,
    };
    if (valores.password) payload.password = valores.password;
    if (fotoArchivo) payload.avatar = fotoArchivo;
    else if (fotoEliminada && usuario?.avatar) payload.avatar = null;
    onGuardar(payload);
  };

  return (
    <Dialog open={abierto} onOpenChange={(estado) => !estado && onCerrar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualiza los datos, el rol o la contraseña de la cuenta."
              : "Crea una cuenta con acceso al sistema y asígnale un rol."}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FieldGroup className="gap-4">
            <div className="flex items-center gap-4">
              <UserAvatar
                nombre={nombreVista}
                email={emailVista}
                src={fotoPreview}
                className="size-16"
                fallbackClassName="text-lg"
              />
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={guardando}
                    onClick={() => inputFotoRef.current?.click()}
                  >
                    <Upload className="size-4" />
                    {fotoPreview ? "Cambiar foto" : "Subir foto"}
                  </Button>
                  {fotoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={guardando}
                      onClick={quitarFoto}
                      className="text-muted-foreground"
                    >
                      <Trash2 className="size-4" />
                      Quitar
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  JPG, PNG o WEBP · máx. 5 MB. Sin foto se usan las iniciales.
                </p>
                <input
                  ref={inputFotoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={seleccionarFoto}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="nombre"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="usuario-nombre">Nombre</FieldLabel>
                    <Input {...field} id="usuario-nombre" placeholder="Ana" disabled={guardando} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="apellido"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="usuario-apellido">Apellido</FieldLabel>
                    <Input {...field} id="usuario-apellido" placeholder="Pérez" disabled={guardando} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="usuario-email">Correo electrónico</FieldLabel>
                  <Input
                    {...field}
                    id="usuario-email"
                    type="email"
                    placeholder="usuario@estudio.com"
                    disabled={guardando}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="rol"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="usuario-rol">Rol</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={guardando || esUsuarioActual}>
                    <SelectTrigger id="usuario-rol" className="w-full">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador — acceso total y gestión de usuarios</SelectItem>
                      <SelectItem value="usuario">Usuario — acceso operativo al sistema</SelectItem>
                    </SelectContent>
                  </Select>
                  {esUsuarioActual && <p className="text-muted-foreground text-xs">No puedes cambiar tu propio rol.</p>}
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="usuario-password">
                    {esEdicion ? "Nueva contraseña (opcional)" : "Contraseña"}
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      id="usuario-password"
                      type={mostrarPassword ? "text" : "password"}
                      placeholder={esEdicion ? "Dejar en blanco para no cambiarla" : "Mínimo 8 caracteres"}
                      autoComplete="new-password"
                      disabled={guardando}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword((v) => !v)}
                      className="-translate-y-1/2 absolute top-1/2 right-3 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {esEdicion && (
              <Controller
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <Switch
                      id="usuario-activo"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={guardando || esUsuarioActual}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="usuario-activo" className="font-normal">
                        Cuenta activa
                      </FieldLabel>
                      {esUsuarioActual && (
                        <p className="text-muted-foreground text-xs">No puedes desactivar tu propia cuenta.</p>
                      )}
                    </FieldContent>
                  </Field>
                )}
              />
            )}
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando}
              className="bg-linear-to-b from-[#2f86ff] to-[#0e63e0] text-white hover:from-[#4292ff] hover:to-[#1670ef]"
            >
              {guardando ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Guardando…
                </>
              ) : esEdicion ? (
                "Guardar cambios"
              ) : (
                "Crear usuario"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
