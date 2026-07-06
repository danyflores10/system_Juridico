"use client";

import Image from "next/image";
import Link from "next/link";

import { CircleHelp, ClipboardList, Database, File, Scale, Search, Settings } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { rootUser } from "@/data/users";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavProfile } from "./nav-profile";
import { NavUser } from "./nav-user";
import { SidebarSupportCard } from "./sidebar-support-card";

const _data = {
  navSecondary: [
    {
      title: "Configuración",
      url: "#",
      icon: Settings,
    },
    {
      title: "Obtener ayuda",
      url: "#",
      icon: CircleHelp,
    },
    {
      title: "Buscar",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Biblioteca jurídica",
      url: "#",
      icon: Database,
    },
    {
      name: "Informes",
      url: "#",
      icon: ClipboardList,
    },
    {
      name: "Asistente documental",
      url: "#",
      icon: File,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.sidebarVariant,
      sidebarCollapsible: s.sidebarCollapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-auto justify-center py-3 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:py-2"
            >
              <Link prefetch={false} href="/dashboard/default">
                {/* Logo completo (menú expandido) */}
                <Image
                  src="/logo-consultor-juridico.png"
                  alt={APP_CONFIG.name}
                  width={432}
                  height={144}
                  priority
                  className="h-12 w-auto object-contain group-data-[collapsible=icon]:hidden"
                />
                {/* Emblema compacto (menú minimizado) */}
                <Scale className="hidden text-primary group-data-[collapsible=icon]:block" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavProfile user={rootUser} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <SidebarSupportCard />
        <NavUser user={rootUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
