import { Archive, CircleHelp, File, Inbox, Keyboard, type LucideIcon, Send, Star, Trash2 } from "lucide-react";
import { type siFigma, siGoogledocs, siGooglephotos } from "simple-icons";

const consultorJuridico = {
  name: "Daniel Wilson Flores",
  email: "daniel@consultorjuridico.local",
};

const equipoJuridico = {
  name: "Equipo Consultor Jurídico",
  email: "contacto@consultorjuridico.local",
};

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const hoursAgo = (hours: number) => minutesAgo(hours * 60);
const daysAgo = (days: number) => hoursAgo(days * 24);

export type Recipient = {
  name: string;
  email: string;
};

export type Attachment = {
  id: string;
  name: string;
  size: string;
  icon: typeof siFigma;
};

export type Mail = {
  id: string;
  accountId: number;
  from: Recipient;
  to: Recipient[];
  cc?: Recipient[];
  subject: string;
  body: string;
  receivedAt: string;
  folder: "inbox" | "drafts" | "sent" | "archive" | "trash";
  isRead: boolean;
  isPinned: boolean;
  isPriority: boolean;
  labels: string[];
  attachments?: Attachment[];
  messageCount?: number;
};

export type MailNavItem = {
  id: string;
  title: string;
  label?: string;
  icon: LucideIcon;
  isActive: boolean;
};

type MailNavigation = {
  navMain: MailNavItem[];
  folders: MailNavItem[];
  navFooter: MailNavItem[];
};

export const mails: Mail[] = [
  {
    id: "correo-001",
    accountId: 1,
    from: { name: "María Fernanda Rojas", email: "maria.rojas@grupoaltura.bo" },
    to: [consultorJuridico],
    cc: [equipoJuridico],
    subject: "Documentación para la audiencia preliminar",
    body: "Estimado Dr. Flores:\n\nAdjunto la documentación solicitada para la audiencia preliminar. Incluí el contrato original, los comprobantes de pago y la cronología de comunicaciones con la contraparte.\n\nQuedo atenta a cualquier observación adicional.\n\nSaludos cordiales,\nMaría Fernanda Rojas",
    receivedAt: minutesAgo(18),
    folder: "inbox",
    isRead: false,
    isPinned: true,
    isPriority: true,
    labels: ["audiencia", "documentos", "urgente"],
    attachments: [
      { id: "contrato", name: "contrato-principal.pdf", size: "2.4 MB", icon: siGoogledocs },
      { id: "cronologia", name: "cronologia-del-caso.docx", size: "680 KB", icon: siGoogledocs },
    ],
  },
  {
    id: "correo-002",
    accountId: 1,
    from: { name: "Juzgado Público Civil 12", email: "notificaciones@organojudicial.bo" },
    to: [consultorJuridico],
    subject: "Notificación electrónica - Expediente EXP-2026-041",
    body: "Se comunica la emisión de una nueva providencia dentro del expediente EXP-2026-041. Revise el documento adjunto y los plazos procesales aplicables.\n\nEste mensaje fue generado automáticamente por el sistema de notificaciones.",
    receivedAt: hoursAgo(1),
    folder: "inbox",
    isRead: false,
    isPinned: true,
    isPriority: true,
    labels: ["notificación", "plazo procesal"],
    attachments: [{ id: "providencia", name: "providencia-EXP-2026-041.pdf", size: "940 KB", icon: siGoogledocs }],
  },
  {
    id: "correo-003",
    accountId: 2,
    from: { name: "Carlos Mendoza", email: "carlos.mendoza@horizonte.bo" },
    to: [equipoJuridico],
    subject: "Revisión final del contrato de obra",
    body: "Buen día:\n\nAgradeceré confirmar si la última versión del contrato ya incorpora las observaciones sobre garantías, multas por retraso y resolución anticipada.\n\nNecesitamos cerrar la revisión antes del viernes.\n\nAtentamente,\nCarlos Mendoza",
    receivedAt: hoursAgo(3),
    folder: "inbox",
    isRead: true,
    isPinned: true,
    isPriority: false,
    labels: ["contrato", "cliente"],
    messageCount: 3,
  },
  {
    id: "correo-004",
    accountId: 1,
    from: { name: "Lucía Paredes", email: "lucia.paredes@mediacion.bo" },
    to: [consultorJuridico],
    subject: "Propuesta de fecha para reunión de conciliación",
    body: "Estimado colega:\n\nLa parte contraria propone realizar la reunión de conciliación el próximo martes a horas 15:30. Por favor confirme disponibilidad o sugiera una fecha alternativa.\n\nSaludos,\nLucía Paredes",
    receivedAt: daysAgo(1),
    folder: "inbox",
    isRead: true,
    isPinned: false,
    isPriority: false,
    labels: ["conciliación", "agenda"],
  },
  {
    id: "correo-005",
    accountId: 2,
    from: { name: "Notaría de Fe Pública 24", email: "contacto@notaria24.bo" },
    to: [equipoJuridico],
    subject: "Observaciones al poder notarial",
    body: "Se remiten las observaciones encontradas en el proyecto de poder. Es necesario precisar las facultades para conciliar, transigir y sustituir antes de proceder con la protocolización.\n\nAtentamente,\nNotaría de Fe Pública 24",
    receivedAt: daysAgo(2),
    folder: "inbox",
    isRead: false,
    isPinned: false,
    isPriority: true,
    labels: ["poder", "notaría"],
    attachments: [{ id: "observaciones", name: "observaciones-poder.pdf", size: "510 KB", icon: siGoogledocs }],
  },
  {
    id: "correo-006",
    accountId: 1,
    from: { name: "Ana Belén Vargas", email: "ana.vargas@inversionesandinas.bo" },
    to: [consultorJuridico],
    subject: "Confirmación de pago de honorarios",
    body: "Estimado Dr. Flores:\n\nConfirmamos la transferencia correspondiente a los honorarios del mes. Adjunto el comprobante para su registro.\n\nMuchas gracias,\nAna Belén Vargas",
    receivedAt: daysAgo(3),
    folder: "inbox",
    isRead: true,
    isPinned: false,
    isPriority: false,
    labels: ["honorarios", "pago"],
    attachments: [{ id: "comprobante", name: "comprobante-transferencia.png", size: "320 KB", icon: siGooglephotos }],
  },
  {
    id: "correo-007",
    accountId: 2,
    from: { name: "Registro de Comercio", email: "tramites@registrocomercio.bo" },
    to: [equipoJuridico],
    subject: "Trámite observado - Actualización societaria",
    body: "El trámite de actualización societaria presenta una observación relacionada con la vigencia del poder del representante legal. Debe subsanarse dentro del plazo señalado en la plataforma.",
    receivedAt: daysAgo(4),
    folder: "inbox",
    isRead: false,
    isPinned: false,
    isPriority: true,
    labels: ["societario", "observación"],
  },
  {
    id: "correo-008",
    accountId: 1,
    from: { name: "Pedro Salinas", email: "pedro.salinas@example.com" },
    to: [consultorJuridico],
    subject: "Solicitud de consulta jurídica",
    body: "Buenas tardes:\n\nDeseo agendar una consulta sobre la resolución de un contrato de arrendamiento y la devolución de la garantía. Agradeceré indicarme horarios disponibles y el costo de la consulta.\n\nSaludos,\nPedro Salinas",
    receivedAt: daysAgo(5),
    folder: "inbox",
    isRead: true,
    isPinned: false,
    isPriority: false,
    labels: ["nuevo cliente", "consulta"],
  },
];

export const mailNavigation: MailNavigation = {
  navMain: [
    {
      id: "inbox",
      title: "Bandeja de entrada",
      label: "8",
      icon: Inbox,
      isActive: true,
    },
    {
      id: "priority",
      title: "Prioritarios",
      label: "4",
      icon: Star,
      isActive: false,
    },
  ],
  folders: [
    {
      id: "drafts",
      title: "Borradores",
      label: "2",
      icon: File,
      isActive: false,
    },
    {
      id: "sent",
      title: "Enviados",
      icon: Send,
      isActive: false,
    },
    {
      id: "archive",
      title: "Archivados",
      icon: Archive,
      isActive: false,
    },
    {
      id: "trash",
      title: "Papelera",
      icon: Trash2,
      isActive: false,
    },
  ],
  navFooter: [
    {
      id: "help-feedback",
      title: "Ayuda y comentarios",
      icon: CircleHelp,
      isActive: false,
    },
    {
      id: "keyboard-shortcuts",
      title: "Atajos de teclado",
      icon: Keyboard,
      isActive: false,
    },
  ],
};

export const accounts = [
  {
    id: 1,
    label: "Daniel Wilson Flores",
    email: "daniel@consultorjuridico.local",
  },
  {
    id: 2,
    label: "Equipo Consultor Jurídico",
    email: "contacto@consultorjuridico.local",
  },
];
