import {
  Banknote,
  Calendar,
  ChartBar,
  CheckSquare,
  ClipboardCheck,
  FileDiff,
  FileText,
  Fingerprint,
  Forklift,
  Gauge,
  Globe2,
  GraduationCap,
  Kanban,
  LayoutDashboard,
  LibraryBig,
  ListTodo,
  Lock,
  type LucideIcon,
  Mail,
  MessageSquare,
  ReceiptText,
  Search,
  Server,
  ShoppingBag,
  SquareArrowUpRight,
  Users,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Gestión jurídica",
    items: [
      {
        id: "default",
        title: "Resumen jurídico",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        id: "legal-documents",
        title: "Documentos jurídicos",
        url: "/dashboard/documentos",
        icon: FileText,
      },
      {
        id: "legal-review",
        title: "Revisión jurídica",
        url: "/dashboard/revision-juridica",
        icon: ClipboardCheck,
      },
      {
        id: "web-sources",
        title: "Cargador jurídico",
        url: "/dashboard/fuentes",
        icon: Globe2,
      },
      {
        id: "legal-catalogs",
        title: "Catálogos jurídicos",
        icon: LibraryBig,
        subItems: [
          { id: "catalog-overview", title: "Administrar catálogos", url: "/dashboard/catalogos" },
          { id: "catalog-matters", title: "Materias", url: "/dashboard/catalogos/materias" },
          { id: "catalog-rule-types", title: "Tipos de norma", url: "/dashboard/catalogos/tipos-norma" },
          { id: "catalog-effects", title: "Efectos normativos", url: "/dashboard/catalogos/efectos" },
          { id: "catalog-entities", title: "Entidades emisoras", url: "/dashboard/catalogos/entidades" },
        ],
      },
      {
        id: "modificador",
        title: "Modificador jurídico",
        url: "/dashboard/modificador",
        icon: FileDiff,
        badge: "new",
      },
      {
        id: "buscador",
        title: "Buscador jurídico",
        url: "/dashboard/buscador",
        icon: Search,
        badge: "new",
      },
      {
        id: "crm",
        title: "Clientes y casos",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
      {
        id: "finance",
        title: "Honorarios",
        url: "/dashboard/finance",
        icon: Banknote,
      },
      {
        id: "analytics",
        title: "Indicadores",
        url: "/dashboard/analytics",
        icon: Gauge,
      },
      {
        id: "productivity",
        title: "Productividad",
        url: "/dashboard/productivity",
        icon: ListTodo,
      },
      {
        id: "ecommerce",
        title: "Servicios",
        url: "/dashboard/ecommerce",
        icon: ShoppingBag,
      },
      {
        id: "academy",
        title: "Capacitación",
        url: "/dashboard/academy",
        icon: GraduationCap,
      },
      {
        id: "logistics",
        title: "Seguimiento",
        url: "/dashboard/logistics",
        icon: Forklift,
      },
      {
        id: "infrastructure",
        title: "Infraestructura",
        url: "/dashboard/infrastructure",
        icon: Server,
        badge: "new",
      },
    ],
  },
  {
    id: 2,
    label: "Operación",
    items: [
      {
        id: "email",
        title: "Correos",
        url: "/dashboard/mail",
        icon: Mail,
      },
      {
        id: "chat",
        title: "Mensajes",
        url: "/dashboard/chat",
        icon: MessageSquare,
      },
      {
        id: "calendar",
        title: "Agenda",
        url: "/dashboard/calendar",
        icon: Calendar,
      },
      {
        id: "kanban",
        title: "Flujo de casos",
        url: "/dashboard/kanban",
        icon: Kanban,
      },
      {
        id: "tasks",
        title: "Tareas",
        url: "/dashboard/tasks",
        icon: CheckSquare,
        badge: "new",
      },
      {
        id: "invoice",
        title: "Facturación",
        url: "/dashboard/invoice",
        icon: ReceiptText,
      },
      {
        id: "users",
        title: "Usuarios",
        url: "/dashboard/users",
        icon: Users,
      },
      {
        id: "roles",
        title: "Roles",
        url: "/dashboard/roles",
        icon: Lock,
      },
      {
        id: "authentication",
        title: "Acceso",
        icon: Fingerprint,
        subItems: [
          { id: "auth-login-v1", title: "Inicio de sesión v1", url: "/auth/v1/login", newTab: true },
          { id: "auth-login-v2", title: "Inicio de sesión v2", url: "/auth/v2/login", newTab: true },
          { id: "auth-register-v1", title: "Registro v1", url: "/auth/v1/register", newTab: true },
          { id: "auth-register-v2", title: "Registro v2", url: "/auth/v2/register", newTab: true },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "Vistas anteriores",
    items: [
      {
        id: "legacy-dashboards",
        title: "Paneles",
        subItems: [
          { id: "legacy-default", title: "Resumen V1", url: "/dashboard/default-v1" },
          { id: "legacy-crm", title: "Casos V1", url: "/dashboard/crm-v1" },
          { id: "legacy-finance", title: "Honorarios V1", url: "/dashboard/finance-v1" },
          { id: "legacy-analytics", title: "Indicadores V1", url: "/dashboard/analytics-v1" },
        ],
      },
    ],
  },
  {
    id: 5,
    label: "Otros",
    items: [
      {
        id: "others",
        title: "Próximamente",
        url: "/dashboard/coming-soon",
        icon: SquareArrowUpRight,
        badge: "soon",
        disabled: true,
      },
    ],
  },
];
