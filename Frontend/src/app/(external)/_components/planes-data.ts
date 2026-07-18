/**
 * Planes y suscripciones del sistema Consultor Jurídico (Módulo 3).
 *
 * Los textos y precios reflejan los requerimientos del módulo de pagos y el
 * catálogo sembrado en el backend (apps/suscripciones). El precio que se
 * cobra SIEMPRE lo resuelve el servidor desde la base de datos: estos datos
 * son solo de presentación.
 */

export type Periodicidad = "mensual" | "semestral" | "anual";

export interface PrecioPlan {
  periodicidad: Periodicidad;
  precio: number;
  etiqueta: string;
  /** Texto corto del período para mostrar junto al precio. */
  sufijo: string;
}

export interface PlanSuscripcion {
  codigo: "gratuito" | "estudiantil" | "profesional" | "consultora" | "empresarial";
  nombre: string;
  descripcion: string;
  dispositivos: string;
  beneficios: string[];
  destacado: boolean;
  tipo: "gratuito" | "pago" | "variable";
  precios: PrecioPlan[];
}

export const PLANES: PlanSuscripcion[] = [
  {
    codigo: "gratuito",
    nombre: "Gratuito",
    descripcion: "Para conocer el sistema: acceso básico a la Biblioteca Jurídica en 1 dispositivo.",
    dispositivos: "1 dispositivo",
    tipo: "gratuito",
    destacado: false,
    beneficios: [
      "Acceso básico a la Biblioteca Jurídica",
      "1 dispositivo (celular, tablet o computadora)",
      "Sin acceso a la Biblioteca Doctrinal de autoría propia (SENAPI)",
    ],
    precios: [],
  },
  {
    codigo: "estudiantil",
    nombre: "Estudiantil",
    descripcion: "Para estudiantes de derecho: doctrina de autoría propia ilimitada a precio accesible.",
    dispositivos: "1 dispositivo",
    tipo: "pago",
    destacado: false,
    beneficios: [
      "Acceso limitado a la Biblioteca Jurídica",
      "Acceso ilimitado a la Biblioteca Doctrinal de autoría propia registrada en SENAPI",
      "1 dispositivo (celular, tablet o computadora)",
    ],
    precios: [
      { periodicidad: "mensual", precio: 20, etiqueta: "Mensual", sufijo: "/ mes" },
      { periodicidad: "semestral", precio: 100, etiqueta: "Semestral", sufijo: "/ semestre" },
    ],
  },
  {
    codigo: "profesional",
    nombre: "Profesional",
    descripcion: "Para abogados en ejercicio: Biblioteca Jurídica Actualizada y doctrina propia, sin límites.",
    dispositivos: "1 dispositivo",
    tipo: "pago",
    destacado: true,
    beneficios: [
      "Acceso ilimitado a la Biblioteca Jurídica Actualizada",
      "Acceso ilimitado a la Biblioteca Doctrinal de autoría propia registrada en SENAPI",
      "1 dispositivo (celular, tablet o computadora)",
    ],
    precios: [
      { periodicidad: "mensual", precio: 30, etiqueta: "Mensual", sufijo: "/ mes" },
      { periodicidad: "anual", precio: 300, etiqueta: "Anual", sufijo: "/ año" },
    ],
  },
  {
    codigo: "consultora",
    nombre: "Consultora",
    descripcion: "Para estudios y consultoras jurídicas: acceso total en hasta 3 dispositivos.",
    dispositivos: "3 dispositivos",
    tipo: "pago",
    destacado: false,
    beneficios: [
      "Acceso ilimitado a la Biblioteca Jurídica",
      "Acceso ilimitado a la Biblioteca Doctrinal de autoría propia registrada en SENAPI",
      "3 dispositivos (celular, tablet o computadora)",
    ],
    precios: [
      { periodicidad: "mensual", precio: 50, etiqueta: "Mensual", sufijo: "/ mes" },
      { periodicidad: "anual", precio: 500, etiqueta: "Anual", sufijo: "/ año" },
    ],
  },
  {
    codigo: "empresarial",
    nombre: "Empresarial",
    descripcion: "Para instituciones y empresas: acceso total en la cantidad de dispositivos que su equipo necesite.",
    dispositivos: "N dispositivos",
    tipo: "variable",
    destacado: false,
    beneficios: [
      "Acceso ilimitado a la Biblioteca Jurídica",
      "Acceso ilimitado a la Biblioteca Doctrinal de autoría propia registrada en SENAPI",
      "N dispositivos (celular, tablet o computadora)",
      "Costo variable según el número de dispositivos",
    ],
    precios: [],
  },
];

/** Ahorro frente a pagar mes a mes durante el mismo período. */
export function ahorroPeriodo(plan: PlanSuscripcion, precio: PrecioPlan): number {
  const mensual = plan.precios.find((p) => p.periodicidad === "mensual");
  if (!mensual || precio.periodicidad === "mensual") return 0;
  const meses = precio.periodicidad === "semestral" ? 6 : 12;
  return mensual.precio * meses - precio.precio;
}
