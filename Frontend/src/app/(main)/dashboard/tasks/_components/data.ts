import { ArrowDown, ArrowRight, ArrowUp, CheckCircle, Circle, CircleOff, HelpCircle, Timer } from "lucide-react";
import { z } from "zod";

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  label: z.string(),
  priority: z.string(),
});

export type Task = z.infer<typeof taskSchema>;

const tasksData = [
  {
    id: "EXP-2026-041",
    title: "Presentar memorial de apersonamiento en el proceso Flores contra Inversiones Andinas",
    status: "in progress",
    label: "actuacion",
    priority: "high",
  },
  {
    id: "EXP-2026-038",
    title: "Revisar contrato de prestación de servicios del cliente Grupo Altura",
    status: "todo",
    label: "documento",
    priority: "high",
  },
  {
    id: "EXP-2026-035",
    title: "Preparar carpeta y alegatos para audiencia preliminar",
    status: "in progress",
    label: "audiencia",
    priority: "high",
  },
  {
    id: "EXP-2026-032",
    title: "Solicitar certificado actualizado de Derechos Reales",
    status: "backlog",
    label: "actuacion",
    priority: "medium",
  },
  {
    id: "EXP-2026-029",
    title: "Enviar informe jurídico mensual a Constructora Horizonte",
    status: "todo",
    label: "documento",
    priority: "medium",
  },
  {
    id: "EXP-2026-026",
    title: "Verificar vencimiento del plazo para contestar la demanda",
    status: "done",
    label: "actuacion",
    priority: "high",
  },
  {
    id: "EXP-2026-024",
    title: "Coordinar reunión de conciliación con la parte contraria",
    status: "todo",
    label: "audiencia",
    priority: "medium",
  },
  {
    id: "EXP-2026-021",
    title: "Corregir observaciones del poder notarial",
    status: "in progress",
    label: "documento",
    priority: "medium",
  },
  {
    id: "EXP-2026-018",
    title: "Registrar comprobantes y actualizar el estado de honorarios",
    status: "backlog",
    label: "actuacion",
    priority: "low",
  },
  {
    id: "EXP-2026-015",
    title: "Preparar cuestionario para declaración de testigos",
    status: "todo",
    label: "audiencia",
    priority: "medium",
  },
  {
    id: "EXP-2026-012",
    title: "Digitalizar documentación entregada por el cliente",
    status: "done",
    label: "documento",
    priority: "low",
  },
  {
    id: "EXP-2026-009",
    title: "Solicitar señalamiento de nueva audiencia",
    status: "canceled",
    label: "audiencia",
    priority: "low",
  },
];

export const tasks = z.array(taskSchema).parse(tasksData);

export const labels = [
  {
    value: "actuacion",
    label: "Actuación",
  },
  {
    value: "documento",
    label: "Documento",
  },
  {
    value: "audiencia",
    label: "Audiencia",
  },
];

export const statuses = [
  {
    value: "backlog",
    label: "Pendiente",
    icon: HelpCircle,
  },
  {
    value: "todo",
    label: "Por hacer",
    icon: Circle,
  },
  {
    value: "in progress",
    label: "En progreso",
    icon: Timer,
  },
  {
    value: "done",
    label: "Completada",
    icon: CheckCircle,
  },
  {
    value: "canceled",
    label: "Cancelada",
    icon: CircleOff,
  },
];

export const priorities = [
  {
    label: "Baja",
    value: "low",
    icon: ArrowDown,
  },
  {
    label: "Media",
    value: "medium",
    icon: ArrowRight,
  },
  {
    label: "Alta",
    value: "high",
    icon: ArrowUp,
  },
];
