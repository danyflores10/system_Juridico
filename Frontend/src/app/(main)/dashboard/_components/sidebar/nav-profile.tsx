"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

export function NavProfile({
  user,
}: {
  readonly user: {
    readonly name: string;
    readonly avatar: string;
    readonly role: string;
  };
}) {
  return (
    <>
      {/* Perfil completo (menú expandido) */}
      <div className="flex flex-col items-center gap-2.5 px-2 py-4 text-center group-data-[collapsible=icon]:hidden">
        <div className="relative">
          <Avatar className="size-20 border-2 border-sidebar-border shadow-md ring-2 ring-primary/10 ring-offset-2 ring-offset-sidebar">
            <AvatarImage src={user.avatar || undefined} alt={user.name} />
            <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          {/* Indicador de conexión */}
          <span className="absolute right-1.5 bottom-1.5 size-3.5 rounded-full border-2 border-sidebar bg-green-500" />
        </div>
        <div className="space-y-0.5">
          <p className="font-semibold text-sm leading-none">{user.name}</p>
          <p className="text-muted-foreground text-xs capitalize">{user.role}</p>
        </div>
      </div>

      {/* Avatar compacto (menú minimizado) */}
      <div className="hidden justify-center py-2 group-data-[collapsible=icon]:flex">
        <div className="relative">
          <Avatar className="size-8 border border-sidebar-border ring-2 ring-primary/10 ring-offset-1 ring-offset-sidebar">
            <AvatarImage src={user.avatar || undefined} alt={user.name} />
            <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-sidebar bg-green-500" />
        </div>
      </div>
    </>
  );
}
