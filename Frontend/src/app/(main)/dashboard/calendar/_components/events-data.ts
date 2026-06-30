import { setDate, setHours, setMinutes, startOfMonth } from "date-fns";

const monthStart = startOfMonth(new Date());
const currentYear = new Date().getFullYear();
const d = (day: number) => setDate(monthStart, day);
const dt = (day: number, hour: number, min = 0) => setMinutes(setHours(setDate(monthStart, day), hour), min);

export const demoEvents = [
  { title: "Planificación mensual", start: dt(1, 9, 30), end: dt(1, 10, 30) },
  { title: "Revisión de expedientes", start: dt(3, 11), end: dt(3, 12) },
  { title: "Reunión con cliente", start: dt(4, 15), end: dt(4, 15, 45) },
  { title: "Preparación de demanda", start: d(7), end: d(9), allDay: true },
  { groupId: "standup", title: "Coordinación del equipo", start: dt(9, 10) },
  { title: "Revisión de honorarios", start: dt(10, 14, 30), end: dt(10, 15) },
  { title: "Redacción jurídica", start: dt(12, 9), end: dt(12, 12), display: "background" },
  { title: "Preparación de audiencia", start: dt(15, 9, 30), end: dt(15, 11) },
  { groupId: "standup", title: "Coordinación del equipo", start: dt(16, 10) },
  { title: "Entrega de documentación", start: dt(18, 16), end: dt(18, 16, 45) },
  { title: "Vencimiento de informe trimestral", start: d(24), allDay: true },
  { title: "Control de plazos procesales", start: d(28), allDay: true },
  { title: "Aniversario del estudio", start: new Date(currentYear, 8, 6), allDay: true },
];
