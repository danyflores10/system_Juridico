"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  KeyRound,
  Loader2,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

import { LOGIN_URL } from "../../../_components/landing-config";
import { ComprobanteDialog, type DatosComprobante } from "./comprobante-pago";

interface CredencialHabilitada {
  usuario: string;
  password: string;
}

interface DatosPago {
  identificador: string;
  estado: "pendiente" | "pagado" | "expirado" | "error";
  monto: string;
  moneda: string;
  forma_pago: string;
  pagado_en: string | null;
  factura_url: string | null;
  url_pasarela_pagos: string | null;
  plan: string;
  periodicidad: string;
  recibo: DatosComprobante["recibo"];
  credenciales?: CredencialHabilitada[];
  suscripcion: {
    estado: string;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    dispositivos: number;
  };
}

const INTERVALO_SONDEO_MS = 5000;
const MAX_INTENTOS_SONDEO = 24; // ~2 minutos de espera activa

const ETIQUETA_PERIODICIDAD: Record<string, string> = {
  mensual: "Mensual",
  semestral: "Semestral",
  anual: "Anual",
};

function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-BO", { day: "2-digit", month: "long", year: "numeric" });
}

export function EstadoPago({ identificador }: { identificador: string }) {
  const [pago, setPago] = useState<DatosPago | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const intentos = useRef(0);

  const consultar = useCallback(async (): Promise<DatosPago | null> => {
    const respuesta = await fetch(`/api/pagos/estado/${identificador}`, { cache: "no-store" }).catch(() => null);
    if (!respuesta) return null;
    if (!respuesta.ok) {
      if (respuesta.status === 404) setErrorCarga("No encontramos este pago. Verifica el enlace.");
      return null;
    }
    return (await respuesta.json().catch(() => null)) as DatosPago | null;
  }, [identificador]);

  useEffect(() => {
    let activo = true;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    const ciclo = async () => {
      const datos = await consultar();
      if (!activo) return;
      if (datos) {
        setPago(datos);
        setErrorCarga(null);
        // Mientras siga pendiente, se sigue sondeando (el backend re-verifica
        // contra Libélula en cada consulta).
        if (datos.estado === "pendiente" && intentos.current < MAX_INTENTOS_SONDEO) {
          intentos.current += 1;
          temporizador = setTimeout(ciclo, INTERVALO_SONDEO_MS);
        }
      } else if (intentos.current < MAX_INTENTOS_SONDEO) {
        intentos.current += 1;
        temporizador = setTimeout(ciclo, INTERVALO_SONDEO_MS);
      }
    };

    void ciclo();
    return () => {
      activo = false;
      if (temporizador) clearTimeout(temporizador);
    };
  }, [consultar]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#081020] px-5 py-16">
      <Link href="/" className="mb-10 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-lg">
          <Image src="/logo-cj-icon.png" alt="Consultor Jurídico" width={40} height={40} />
        </span>
        <span className="lj-font-heading font-black text-lg text-white">Consultor Jurídico</span>
      </Link>

      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-[#1c2a47] bg-[#0d1830] shadow-[0_0_60px_rgba(212,175,55,0.08)]">
        <ResultadoPago pago={pago} errorCarga={errorCarga} />
      </section>

      <p className="mt-6 flex items-center gap-1.5 text-white/35 text-xs">
        <ShieldCheck size={13} className="text-[#d4af37]" />
        Pago procesado de forma segura por Libélula.
      </p>

      <Link
        href="/#planes"
        className="mt-3 flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-[#d4af37]"
      >
        <ArrowLeft size={14} /> Volver a los planes
      </Link>
    </main>
  );
}

/** Cuerpo de la tarjeta según el estado del pago (carga, pagado, pendiente, error). */
function ResultadoPago({ pago, errorCarga }: { pago: DatosPago | null; errorCarga: string | null }) {
  const [verComprobante, setVerComprobante] = useState(false);

  if (errorCarga) {
    return (
      <Contenido
        icono={<AlertTriangle size={40} className="text-[#ff8f8f]" />}
        titulo="Pago no encontrado"
        detalle={errorCarga}
      />
    );
  }

  if (!pago) {
    return (
      <Contenido
        icono={<Loader2 size={40} className="animate-spin text-[#d4af37]" />}
        titulo="Verificando tu pago…"
        detalle="Estamos consultando el estado de tu transacción con la pasarela de pagos. Esto toma solo unos segundos."
      />
    );
  }

  if (pago.estado === "pagado") {
    return (
      <>
        <div className="border-[#1c2a47] border-b bg-[#10241a] px-7 py-6 text-center">
          <CheckCircle2 size={44} className="mx-auto mb-3 text-[#5ad18f]" />
          <h1 className="lj-font-heading font-black text-2xl text-white">¡Pago confirmado!</h1>
          <p className="mt-1 text-sm text-white/60">Tu suscripción quedó activada. Gracias por tu confianza.</p>
        </div>
        <div className="px-7 py-6">
          <dl className="space-y-3 text-sm">
            <FilaResumen
              etiqueta="Plan"
              valor={`${pago.plan} · ${ETIQUETA_PERIODICIDAD[pago.periodicidad] ?? pago.periodicidad}`}
            />
            <FilaResumen etiqueta="Monto pagado" valor={`Bs ${pago.monto}`} destacado />
            {pago.forma_pago && <FilaResumen etiqueta="Forma de pago" valor={pago.forma_pago} />}
            <FilaResumen etiqueta="Dispositivos" valor={String(pago.suscripcion.dispositivos)} />
            <FilaResumen etiqueta="Vigencia" valor={`hasta el ${formatearFecha(pago.suscripcion.fecha_fin)}`} />
          </dl>

          {/* Comprobante de pago en modal (papel reutilizado del módulo Facturación) */}
          <button
            type="button"
            onClick={() => setVerComprobante(true)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 py-3 font-semibold text-[#d4af37] text-sm transition-colors hover:border-[#d4af37]/70 hover:bg-[#d4af37]/15"
          >
            <ReceiptText size={15} /> Ver comprobante de pago
          </button>

          {pago.factura_url && (
            <a
              href={pago.factura_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#2b3d63] bg-[#111f3b] py-3 font-semibold text-sm text-white transition-colors hover:border-[#d4af37]/50 hover:text-[#d4af37]"
            >
              Ver mi factura oficial <ExternalLink size={14} />
            </a>
          )}

          <ComprobanteDialog pago={pago} abierto={verComprobante} onClose={() => setVerComprobante(false)} />

          {pago.credenciales && pago.credenciales.length > 0 ? (
            <div className="mt-5 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4">
              <p className="mb-1 flex items-center gap-1.5 font-bold text-[#d4af37] text-xs uppercase tracking-wider">
                <KeyRound size={13} /> Tus accesos al sistema
              </p>
              <p className="mb-3 text-white/50 text-xs leading-relaxed">
                Guárdalos ahora: la contraseña se muestra solo hasta tu primer inicio de sesión.
              </p>
              <div className="space-y-2">
                {pago.credenciales.map((credencial, indice) => (
                  <div
                    key={credencial.usuario}
                    className="rounded-lg border border-[#2b3d63] bg-[#0b1628] px-3.5 py-2.5"
                  >
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">
                      {pago.credenciales && pago.credenciales.length > 1 ? `Acceso ${indice + 1}` : "Acceso"}
                    </p>
                    <p className="break-all font-semibold text-sm text-white">{credencial.usuario}</p>
                    <p className="font-mono text-[#d4af37] text-sm tracking-wide">{credencial.password}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-5 rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/5 px-4 py-3 text-white/60 text-xs leading-relaxed">
            Importante: cada usuario y contraseña habilita 1 solo dispositivo — quedará vinculado al primer equipo en el
            que inicies sesión y no podrá usarse en otro.
          </p>

          <Link
            href={LOGIN_URL}
            className="lj-font-heading mt-5 block w-full rounded-xl bg-linear-to-b from-[#e2c04d] to-[#c19c30] py-3.5 text-center font-black text-[#081020] text-sm uppercase tracking-wider shadow-[0_0_24px_rgba(212,175,55,0.35)] transition-all hover:shadow-[0_0_36px_rgba(212,175,55,0.55)]"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </>
    );
  }

  if (pago.estado === "pendiente") {
    return (
      <>
        <Contenido
          icono={<Clock3 size={40} className="text-[#d4af37]" />}
          titulo="Pago en proceso"
          detalle="Aún no recibimos la confirmación de la pasarela. Si ya pagaste, esta página se actualizará automáticamente en unos segundos; algunos métodos (depósito, banca) pueden tardar más."
        />
        {pago.url_pasarela_pagos && (
          <div className="px-7 pb-7">
            <a
              href={pago.url_pasarela_pagos}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2b3d63] bg-[#111f3b] py-3 font-semibold text-sm text-white transition-colors hover:border-[#d4af37]/50 hover:text-[#d4af37]"
            >
              Volver a la pasarela de pago <ExternalLink size={14} />
            </a>
          </div>
        )}
      </>
    );
  }

  return (
    <Contenido
      icono={<AlertTriangle size={40} className="text-[#ff8f8f]" />}
      titulo={pago.estado === "expirado" ? "El pago expiró" : "Hubo un problema con el pago"}
      detalle="No se completó el pago de tu suscripción. Puedes volver a la sección de planes e intentarlo nuevamente; si el problema persiste, contáctanos por WhatsApp."
    />
  );
}

function Contenido({ icono, titulo, detalle }: { icono: React.ReactNode; titulo: string; detalle: string }) {
  return (
    <div className="px-7 py-10 text-center">
      <div className="mb-4 flex justify-center">{icono}</div>
      <h1 className="lj-font-heading font-black text-2xl text-white">{titulo}</h1>
      <p className="mt-2 text-sm text-white/55 leading-relaxed">{detalle}</p>
    </div>
  );
}

function FilaResumen({ etiqueta, valor, destacado = false }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-white/50">{etiqueta}</dt>
      <dd className={destacado ? "lj-font-heading font-black text-[#d4af37] text-lg" : "font-semibold text-white"}>
        {valor}
      </dd>
    </div>
  );
}
