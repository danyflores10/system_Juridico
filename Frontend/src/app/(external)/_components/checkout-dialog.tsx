"use client";

import { useEffect, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { ahorroPeriodo, type Periodicidad, type PlanSuscripcion } from "./planes-data";

/* ------------------------------------------------------------------ */
/* Validación                                                          */
/* ------------------------------------------------------------------ */

const esquemaCliente = z.object({
  periodicidad: z.enum(["mensual", "semestral", "anual"]),
  nombre_completo: z.string().trim().min(5, "Ingresa tu nombre completo."),
  genero: z.enum(["femenino", "masculino", "otro", "sin_especificar"], {
    message: "Selecciona una opción.",
  }),
  fecha_nacimiento: z
    .string()
    .min(1, "Ingresa tu fecha de nacimiento.")
    .refine((v) => {
      const fecha = new Date(`${v}T00:00:00`);
      return !Number.isNaN(fecha.getTime()) && fecha < new Date();
    }, "La fecha de nacimiento debe ser una fecha pasada."),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?\d{7,15}$/, "Ingresa un número de WhatsApp válido (solo dígitos)."),
  email: z.string().trim().email("Ingresa un correo electrónico válido."),
  canal_contacto: z.enum(["instagram", "facebook", "tiktok", "radio", "asesor", "otro"], {
    message: "Cuéntanos por qué medio te enteraste.",
  }),
});

const esquemaFacturacion = z.object({
  quiere_factura: z.boolean(),
  nombre_o_razon_social: z.string().trim().optional(),
  tipo_documento: z.enum(["ci", "nit"]).optional(),
  numero_documento: z.string().trim().optional(),
  complemento: z.string().trim().optional(),
});

const esquema = esquemaCliente.and(esquemaFacturacion).superRefine((datos, ctx) => {
  if (!datos.quiere_factura) return;
  if (!datos.nombre_o_razon_social || datos.nombre_o_razon_social.length < 3) {
    ctx.addIssue({
      code: "custom",
      path: ["nombre_o_razon_social"],
      message: "Ingresa el nombre o razón social para la factura.",
    });
  }
  if (!datos.tipo_documento) {
    ctx.addIssue({ code: "custom", path: ["tipo_documento"], message: "Selecciona CI o NIT." });
  }
  if (!datos.numero_documento || !/^\d{4,15}$/.test(datos.numero_documento)) {
    ctx.addIssue({
      code: "custom",
      path: ["numero_documento"],
      message: "Ingresa el número de documento (solo dígitos).",
    });
  }
});

type ValoresCheckout = z.infer<typeof esquema>;

const CAMPOS_PASO_1 = [
  "periodicidad",
  "nombre_completo",
  "genero",
  "fecha_nacimiento",
  "whatsapp",
  "email",
  "canal_contacto",
] as const;

/* ------------------------------------------------------------------ */
/* Estilos compartidos (paleta de la landing)                          */
/* ------------------------------------------------------------------ */

const claseInput =
  "w-full rounded-lg border border-[#2b3d63] bg-[#0b1628] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#d4af37]/70 disabled:opacity-50";
const claseLabel = "mb-1.5 block font-semibold text-white/80 text-xs uppercase tracking-wider";
const claseError = "mt-1 text-[#ff8f8f] text-xs";

function CampoError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return <p className={claseError}>{mensaje}</p>;
}

/* ------------------------------------------------------------------ */
/* Diálogo de suscripción (checkout en 2 pasos)                        */
/* ------------------------------------------------------------------ */

interface CheckoutDialogProps {
  plan: PlanSuscripcion | null;
  periodicidadInicial: Periodicidad | null;
  onClose: () => void;
}

export function CheckoutDialog({ plan, periodicidadInicial, onClose }: CheckoutDialogProps) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const form = useForm<ValoresCheckout>({
    resolver: zodResolver(esquema),
    defaultValues: {
      periodicidad: periodicidadInicial ?? "mensual",
      nombre_completo: "",
      genero: undefined,
      fecha_nacimiento: "",
      whatsapp: "",
      email: "",
      canal_contacto: undefined,
      quiere_factura: false,
      nombre_o_razon_social: "",
      tipo_documento: "ci",
      numero_documento: "",
      complemento: "",
    },
  });

  // Al abrir el diálogo con un plan, arranca en el paso 1 con la
  // periodicidad preseleccionada desde la tarjeta.
  useEffect(() => {
    if (plan) {
      setPaso(1);
      setErrorEnvio(null);
      form.setValue("periodicidad", periodicidadInicial ?? plan.precios[0]?.periodicidad ?? "mensual");
    }
  }, [plan, periodicidadInicial, form]);

  const periodicidad = form.watch("periodicidad");
  const quiereFactura = form.watch("quiere_factura");
  const tipoDocumento = form.watch("tipo_documento");

  const precioActual = useMemo(
    () => plan?.precios.find((p) => p.periodicidad === periodicidad) ?? plan?.precios[0] ?? null,
    [plan, periodicidad],
  );

  const avanzarPaso = async () => {
    const valido = await form.trigger([...CAMPOS_PASO_1]);
    if (valido) {
      setErrorEnvio(null);
      setPaso(2);
    }
  };

  const onSubmit = async (valores: ValoresCheckout) => {
    if (!plan || !precioActual) return;
    setErrorEnvio(null);

    const respuesta = await fetch("/api/pagos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: plan.codigo,
        periodicidad: valores.periodicidad,
        cliente: {
          nombre_completo: valores.nombre_completo,
          genero: valores.genero,
          fecha_nacimiento: valores.fecha_nacimiento,
          whatsapp: valores.whatsapp,
          email: valores.email,
          canal_contacto: valores.canal_contacto,
        },
        facturacion: valores.quiere_factura
          ? {
              nombre_o_razon_social: valores.nombre_o_razon_social,
              tipo_documento: valores.tipo_documento,
              numero_documento: valores.numero_documento,
              complemento: valores.tipo_documento === "ci" ? (valores.complemento ?? "") : "",
            }
          : null,
      }),
    }).catch(() => null);

    if (!respuesta) {
      setErrorEnvio("No se pudo contactar al servidor. Verifica tu conexión e inténtalo de nuevo.");
      return;
    }

    const datos: unknown = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      setErrorEnvio(extraerMensajeError(datos));
      return;
    }

    const { url_pasarela_pagos: urlPasarela } = (datos ?? {}) as { url_pasarela_pagos?: string };
    if (!urlPasarela) {
      setErrorEnvio("La pasarela de pagos no devolvió una dirección de pago. Inténtalo nuevamente.");
      return;
    }
    // Redirige a la pasarela segura de Libélula (QR, tarjeta, banca en línea).
    window.location.assign(urlPasarela);
  };

  const cerrar = () => {
    setPaso(1);
    setErrorEnvio(null);
    form.reset();
    onClose();
  };

  const enviando = form.formState.isSubmitting;
  const errores = form.formState.errors;

  return (
    <Dialog open={plan !== null} onOpenChange={(abierto) => !abierto && !enviando && cerrar()}>
      <DialogContent
        style={{ colorScheme: "dark" }}
        className="max-h-[92vh] gap-0 overflow-y-auto border-[#1c2a47] bg-[#0d1830] p-0 text-white shadow-[0_0_60px_rgba(212,175,55,0.08)] sm:max-w-lg"
        showCloseButton={!enviando}
      >
        {/* Encabezado con el resumen del plan elegido */}
        <div className="border-[#1c2a47] border-b bg-[#0f1c33] px-6 py-5">
          <DialogHeader className="gap-1 text-left">
            <DialogTitle className="lj-font-heading font-black text-white text-xl">
              {paso === 1 ? "Registro de datos del cliente" : "Datos de facturación"}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/50">
              {plan ? (
                <>
                  Plan <span className="font-semibold text-[#d4af37]">{plan.nombre}</span>
                  {precioActual ? (
                    <>
                      {" · "}
                      Bs {precioActual.precio} {precioActual.sufijo}
                    </>
                  ) : null}
                  {" · "}
                  {plan.dispositivos}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {/* Indicador de pasos */}
          <div className="mt-4 flex items-center gap-2">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors ${paso >= n ? "bg-[#d4af37]" : "bg-[#1c2a47]"}`}
              />
            ))}
          </div>
          <p className="mt-2 text-white/40 text-xs">
            Paso {paso} de 2 · {paso === 1 ? "Tus datos personales" : "Facturación (opcional) y pago"}
          </p>
        </div>

        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-6 py-5">
          {paso === 1 && plan && (
            <>
              {/* Periodicidad de la suscripción */}
              {plan.precios.length > 0 && (
                <div>
                  <span className={claseLabel}>Periodicidad de la suscripción</span>
                  <Controller
                    control={form.control}
                    name="periodicidad"
                    render={({ field }) => (
                      <div className="grid grid-cols-2 gap-2">
                        {plan.precios.map((precio) => {
                          const activo = field.value === precio.periodicidad;
                          const ahorro = ahorroPeriodo(plan, precio);
                          return (
                            <button
                              key={precio.periodicidad}
                              type="button"
                              onClick={() => field.onChange(precio.periodicidad)}
                              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                                activo
                                  ? "border-[#d4af37]/70 bg-[#d4af37]/10"
                                  : "border-[#2b3d63] bg-[#0b1628] hover:border-[#d4af37]/40"
                              }`}
                            >
                              <span className="block font-bold text-sm text-white">{precio.etiqueta}</span>
                              <span className="block text-white/60 text-xs">
                                Bs {precio.precio} {precio.sufijo}
                              </span>
                              {ahorro > 0 && (
                                <span className="mt-1 inline-block rounded-full bg-[#d4af37]/15 px-2 py-0.5 font-semibold text-[#d4af37] text-[10px]">
                                  Ahorras Bs {ahorro}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </div>
              )}

              <div>
                <label htmlFor="co-nombre" className={claseLabel}>
                  Nombre completo
                </label>
                <input
                  id="co-nombre"
                  type="text"
                  placeholder="Ej. Ana María Pérez Rojas"
                  autoComplete="name"
                  disabled={enviando}
                  className={claseInput}
                  {...form.register("nombre_completo")}
                />
                <CampoError mensaje={errores.nombre_completo?.message} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="co-genero" className={claseLabel}>
                    Género
                  </label>
                  <select id="co-genero" disabled={enviando} className={claseInput} {...form.register("genero")}>
                    <option value="">Selecciona…</option>
                    <option value="femenino">Femenino</option>
                    <option value="masculino">Masculino</option>
                    <option value="otro">Otro</option>
                    <option value="sin_especificar">Prefiero no decirlo</option>
                  </select>
                  <CampoError mensaje={errores.genero?.message} />
                </div>
                <div>
                  <label htmlFor="co-nacimiento" className={claseLabel}>
                    Fecha de nacimiento
                  </label>
                  <input
                    id="co-nacimiento"
                    type="date"
                    disabled={enviando}
                    className={claseInput}
                    {...form.register("fecha_nacimiento")}
                  />
                  <CampoError mensaje={errores.fecha_nacimiento?.message} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="co-whatsapp" className={claseLabel}>
                    Nro. de WhatsApp
                  </label>
                  <input
                    id="co-whatsapp"
                    type="tel"
                    inputMode="tel"
                    placeholder="59162323499"
                    autoComplete="tel"
                    disabled={enviando}
                    className={claseInput}
                    {...form.register("whatsapp")}
                  />
                  <CampoError mensaje={errores.whatsapp?.message} />
                </div>
                <div>
                  <label htmlFor="co-email" className={claseLabel}>
                    Correo electrónico
                  </label>
                  <input
                    id="co-email"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    disabled={enviando}
                    className={claseInput}
                    {...form.register("email")}
                  />
                  <CampoError mensaje={errores.email?.message} />
                </div>
              </div>

              <div>
                <label htmlFor="co-canal" className={claseLabel}>
                  ¿Por qué medio te enteraste de Consultor Jurídico?
                </label>
                <select id="co-canal" disabled={enviando} className={claseInput} {...form.register("canal_contacto")}>
                  <option value="">Selecciona…</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">Tik-Tok</option>
                  <option value="radio">Radio</option>
                  <option value="asesor">Asesor Empresarial</option>
                  <option value="otro">Otro</option>
                </select>
                <CampoError mensaje={errores.canal_contacto?.message} />
              </div>

              <button
                type="button"
                onClick={avanzarPaso}
                className="lj-font-heading mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-b from-[#e2c04d] to-[#c19c30] py-3.5 text-center font-black text-[#081020] text-sm uppercase tracking-wider shadow-[0_0_24px_rgba(212,175,55,0.35)] transition-all hover:shadow-[0_0_36px_rgba(212,175,55,0.55)]"
              >
                Continuar <ArrowRight size={16} />
              </button>
            </>
          )}

          {paso === 2 && plan && precioActual && (
            <>
              {/* Facturación opcional (a nombre del cliente o razón social) */}
              <label
                htmlFor="co-quiere-factura"
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2b3d63] bg-[#0b1628] px-4 py-3.5"
              >
                <input
                  id="co-quiere-factura"
                  type="checkbox"
                  disabled={enviando}
                  className="mt-0.5 h-4 w-4 accent-[#d4af37]"
                  {...form.register("quiere_factura")}
                />
                <span>
                  <span className="block font-semibold text-sm text-white">Deseo factura con mis datos</span>
                  <span className="block text-white/50 text-xs">
                    Opcional. A nombre propio o razón social, con Cédula de Identidad o NIT.
                  </span>
                </span>
              </label>

              {quiereFactura && (
                <div className="flex flex-col gap-4 rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/5 p-4">
                  <div>
                    <label htmlFor="co-razon" className={claseLabel}>
                      A nombre de (nombre completo o razón social)
                    </label>
                    <input
                      id="co-razon"
                      type="text"
                      placeholder="Ej. Estudio Jurídico Pérez S.R.L."
                      disabled={enviando}
                      className={claseInput}
                      {...form.register("nombre_o_razon_social")}
                    />
                    <CampoError mensaje={errores.nombre_o_razon_social?.message} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="co-tipo-doc" className={claseLabel}>
                        Documento
                      </label>
                      <select
                        id="co-tipo-doc"
                        disabled={enviando}
                        className={claseInput}
                        {...form.register("tipo_documento")}
                      >
                        <option value="ci">Cédula (CI)</option>
                        <option value="nit">NIT</option>
                      </select>
                      <CampoError mensaje={errores.tipo_documento?.message} />
                    </div>
                    <div className={tipoDocumento === "ci" ? "sm:col-span-1" : "sm:col-span-2"}>
                      <label htmlFor="co-numero-doc" className={claseLabel}>
                        Número
                      </label>
                      <input
                        id="co-numero-doc"
                        type="text"
                        inputMode="numeric"
                        placeholder="Ej. 4567890"
                        disabled={enviando}
                        className={claseInput}
                        {...form.register("numero_documento")}
                      />
                      <CampoError mensaje={errores.numero_documento?.message} />
                    </div>
                    {tipoDocumento === "ci" && (
                      <div>
                        <label htmlFor="co-complemento" className={claseLabel}>
                          Complemento
                        </label>
                        <input
                          id="co-complemento"
                          type="text"
                          placeholder="Ej. LP"
                          maxLength={5}
                          disabled={enviando}
                          className={claseInput}
                          {...form.register("complemento")}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resumen del pedido */}
              <div className="rounded-xl border border-[#2b3d63] bg-[#0b1628] p-4">
                <p className="mb-3 font-semibold text-white/80 text-xs uppercase tracking-wider">Resumen del pedido</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">
                    Plan {plan.nombre} · {precioActual.etiqueta} · {plan.dispositivos}
                  </span>
                  <span className="font-bold text-white">Bs {precioActual.precio}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-[#1c2a47] border-t pt-3">
                  <span className="font-semibold text-sm text-white">Total a pagar</span>
                  <span className="lj-font-heading font-black text-2xl text-[#d4af37]">Bs {precioActual.precio}</span>
                </div>
              </div>

              {errorEnvio && (
                <div className="flex items-start gap-2.5 rounded-xl border border-[#ff8f8f]/30 bg-[#ff8f8f]/10 px-4 py-3 text-[#ffb4b4] text-sm">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorEnvio}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  disabled={enviando}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#2b3d63] bg-[#111f3b] px-4 py-3.5 font-semibold text-sm text-white transition-colors hover:border-[#d4af37]/50 disabled:opacity-50"
                >
                  <ArrowLeft size={15} /> Atrás
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="lj-font-heading flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-b from-[#e2c04d] to-[#c19c30] py-3.5 text-center font-black text-[#081020] text-sm uppercase tracking-wider shadow-[0_0_24px_rgba(212,175,55,0.35)] transition-all hover:shadow-[0_0_36px_rgba(212,175,55,0.55)] disabled:opacity-60"
                >
                  {enviando ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Conectando con la pasarela…
                    </>
                  ) : (
                    <>
                      <Lock size={14} /> Pagar Bs {precioActual.precio}
                    </>
                  )}
                </button>
              </div>

              <p className="flex items-center justify-center gap-1.5 text-center text-white/40 text-xs">
                <ShieldCheck size={13} className="text-[#d4af37]" />
                Pago seguro procesado por Libélula: QR, tarjeta o banca en línea.
              </p>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function extraerMensajeError(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const registro = payload as Record<string, unknown>;
    for (const clave of ["detail", "plan", "periodicidad", "cliente", "facturacion", "non_field_errors"]) {
      const valor = registro[clave];
      if (typeof valor === "string") return valor;
      if (Array.isArray(valor) && typeof valor[0] === "string") return valor[0];
    }
  }
  return "No se pudo iniciar el pago. Inténtalo de nuevo en unos minutos.";
}
