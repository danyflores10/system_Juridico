"use client";

import * as React from "react";

import Image from "next/image";

import { Printer } from "lucide-react";
import { createPortal } from "react-dom";

import { INVOICE_PAPER_HEIGHT, INVOICE_PAPER_WIDTH } from "@/app/(main)/dashboard/invoice/_components/data";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/* Datos que el comprobante necesita (subset del estado del pago)      */
/* ------------------------------------------------------------------ */

export interface DatosComprobante {
  identificador: string;
  monto: string;
  forma_pago: string;
  pagado_en: string | null;
  plan: string;
  periodicidad: string;
  factura_url: string | null;
  recibo: {
    numero: string;
    cliente: { nombre_completo: string; email: string; whatsapp: string };
    facturacion: {
      nombre_o_razon_social: string;
      tipo_documento: string;
      numero_documento: string;
      complemento: string;
    } | null;
  };
  suscripcion: {
    fecha_inicio: string | null;
    fecha_fin: string | null;
    dispositivos: number;
  };
}

const ETIQUETA_PERIODICIDAD: Record<string, string> = {
  mensual: "mensual",
  semestral: "semestral",
  anual: "anual",
};

function formatearBs(valor: string | number) {
  const numero = typeof valor === "string" ? Number.parseFloat(valor) : valor;
  return `Bs ${Number.isNaN(numero) ? valor : numero.toLocaleString("es-BO", { minimumFractionDigits: 2 })}`;
}

function formatearFecha(iso: string | null) {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Papel del comprobante — reutiliza el diseño del módulo Facturación  */
/* (mismas dimensiones y data-print-paper para la impresión global).   */
/* ------------------------------------------------------------------ */

function ComprobantePaper({ pago }: { readonly pago: DatosComprobante }) {
  const recibo = pago.recibo;
  const facturacion = recibo.facturacion;
  const nombreCliente = facturacion ? facturacion.nombre_o_razon_social : recibo.cliente.nombre_completo;
  const concepto = `${pago.plan} — Suscripción ${ETIQUETA_PERIODICIDAD[pago.periodicidad] ?? pago.periodicidad}`;

  return (
    <article
      style={{ width: INVOICE_PAPER_WIDTH, height: INVOICE_PAPER_HEIGHT }}
      data-print-paper
      className="relative flex flex-col gap-20 bg-neutral-50 px-12.25 py-11 font-mono text-neutral-950"
    >
      <header className="flex flex-col gap-10">
        <div className="grid grid-cols-2 items-start gap-14">
          <div className="flex items-center gap-3">
            <Image src="/logo-cj-icon.png" alt="Consultor Jurídico" width={48} height={48} />
            <div className="text-sm leading-tight">
              <p className="font-semibold">Consultor</p>
              <p className="font-semibold">Jurídico</p>
            </div>
          </div>
          <h2 className="text-right text-3xl uppercase tracking-widest">
            Comprobante
            <br />
            de pago
          </h2>
        </div>

        <section className="grid grid-cols-2 gap-14 text-sm leading-relaxed">
          <div>
            <p>Referencia: {recibo.numero}</p>
            <p>Fecha de pago: {formatearFecha(pago.pagado_en)}</p>
            <p>Forma de pago: {pago.forma_pago || "Pasarela Libélula"}</p>
          </div>
          <div>
            <p>Estado</p>
            <p className="font-semibold uppercase">Pagado ✓</p>
            <p>Procesado por Libélula (libelula.bo)</p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-14 text-sm leading-relaxed">
          <div>
            <p className="mb-4 font-semibold uppercase">De</p>
            <p>Consultor Jurídico</p>
            <p>Biblioteca Jurídica y Doctrinal</p>
            <p>Bolivia</p>
          </div>
          <div>
            <p className="mb-4 font-semibold uppercase">Cliente</p>
            <p>{nombreCliente}</p>
            {facturacion ? (
              <p>
                {facturacion.tipo_documento}: {facturacion.numero_documento}
                {facturacion.complemento ? `-${facturacion.complemento}` : ""}
              </p>
            ) : null}
            <p>{recibo.cliente.email}</p>
            {recibo.cliente.whatsapp ? <p>WhatsApp: {recibo.cliente.whatsapp}</p> : null}
          </div>
        </section>
      </header>

      <div className="flex flex-col gap-5">
        <section className="text-sm">
          <div className="grid grid-cols-[1fr_74px_116px_116px] bg-stone-200 px-3 py-3 font-semibold uppercase">
            <span>Descripción</span>
            <span className="text-right">Cant.</span>
            <span className="text-right">P. unitario</span>
            <span className="text-right">Total</span>
          </div>
          <div className="grid grid-cols-[1fr_74px_116px_116px] border-[oklch(0.86_0_0)] border-b px-3 py-4">
            <span>{concepto}</span>
            <span className="text-right">1</span>
            <span className="text-right">{formatearBs(pago.monto)}</span>
            <span className="text-right">{formatearBs(pago.monto)}</span>
          </div>
          <div className="grid grid-cols-[1fr_74px_116px_116px] border-[oklch(0.86_0_0)] border-b px-3 py-4 text-neutral-500">
            <span>
              Vigencia: del {formatearFecha(pago.suscripcion.fecha_inicio)} al{" "}
              {formatearFecha(pago.suscripcion.fecha_fin)} · {pago.suscripcion.dispositivos}{" "}
              {pago.suscripcion.dispositivos === 1 ? "dispositivo" : "dispositivos"}
            </span>
            <span />
            <span />
            <span />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-14 text-sm leading-relaxed">
          <section className="col-start-2 space-y-2">
            <div className="flex justify-between gap-8">
              <span>Subtotal</span>
              <span>{formatearBs(pago.monto)}</span>
            </div>
            <div className="border-current border-y-2 py-3">
              <div className="flex justify-between gap-8">
                <span className="font-semibold uppercase">Total pagado</span>
                <span className="font-semibold">{formatearBs(pago.monto)}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="absolute right-12.25 bottom-11 left-12.25 grid grid-cols-2 gap-14 text-neutral-500 text-sm leading-relaxed">
        <div>
          <p>Comprobante generado automáticamente</p>
          <p>por el sistema Consultor Jurídico.</p>
        </div>
        <div>
          {pago.factura_url ? (
            <p>Factura oficial disponible en línea desde su enlace de pago.</p>
          ) : (
            <p>Documento no fiscal. La factura oficial se emite a través del SIAT.</p>
          )}
          <p>ID de transacción: {pago.identificador}</p>
        </div>
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Portal de impresión (mismo patrón que el módulo Facturación)        */
/* ------------------------------------------------------------------ */

function PrintComprobante({ pago }: { readonly pago: DatosComprobante }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div data-print-root>
      <ComprobantePaper pago={pago} />
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Modal del comprobante con el papel escalado al ancho disponible     */
/* ------------------------------------------------------------------ */

export function ComprobanteDialog({
  pago,
  abierto,
  onClose,
}: {
  readonly pago: DatosComprobante;
  readonly abierto: boolean;
  readonly onClose: () => void;
}) {
  const contenedorRef = React.useRef<HTMLDivElement>(null);
  const [escala, setEscala] = React.useState(0.7);

  // Escala el papel (816px) al ancho real del modal, también en móvil.
  React.useEffect(() => {
    if (!abierto) return;
    const contenedor = contenedorRef.current;
    if (!contenedor) return;
    const ajustar = () => {
      const ancho = contenedor.clientWidth;
      if (ancho > 0) setEscala(Math.min(1, ancho / INVOICE_PAPER_WIDTH));
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(contenedor);
    return () => observador.disconnect();
  }, [abierto]);

  return (
    <Dialog open={abierto} onOpenChange={(sigueAbierto) => !sigueAbierto && onClose()}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto border-[#1c2a47] bg-[#0d1830] p-0 text-white sm:max-w-3xl">
        {abierto ? <PrintComprobante pago={pago} /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-[#1c2a47] border-b bg-[#0f1c33] px-5 py-4">
          <DialogHeader className="gap-0.5 text-left">
            <DialogTitle className="lj-font-heading font-black text-lg text-white">Comprobante de pago</DialogTitle>
            <DialogDescription className="text-white/50 text-xs">
              {pago.plan} · {formatearBs(pago.monto)} · pagado el {formatearFecha(pago.pagado_en)}
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={() => window.print()}
            className="mr-8 flex items-center gap-2 rounded-lg border border-[#2b3d63] bg-[#111f3b] px-3.5 py-2 font-semibold text-sm text-white transition-colors hover:border-[#d4af37]/50 hover:text-[#d4af37]"
          >
            <Printer size={15} /> Imprimir / Guardar PDF
          </button>
        </div>

        <div className="bg-stone-300 p-4 sm:p-6 dark:bg-stone-800">
          <div
            ref={contenedorRef}
            className="mx-auto w-full"
            style={{ maxWidth: INVOICE_PAPER_WIDTH, height: INVOICE_PAPER_HEIGHT * escala }}
          >
            <div style={{ transform: `scale(${escala})` }} className="origin-top-left shadow-xl">
              <ComprobantePaper pago={pago} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
