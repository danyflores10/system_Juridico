import {
  Banknote,
  Calendar,
  ChartBar,
  CheckSquare,
  Fingerprint,
  Forklift,
  Gauge,
  GraduationCap,
  Kanban,
  LayoutDashboard,
  ListTodo,
  Lock,
  type LucideIcon,
  Mail,
  MessageSquare,
  ReceiptText,
  Scale,
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
        id: "buscador",
        title: "Buscador jurídico",
        url: "/dashboard/buscador",
        icon: Scale,
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
    id: 3,
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
    id: 4,
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
