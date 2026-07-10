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
          <Avatar className="size-20 rounded-full">
            <AvatarImage src={user.avatar || undefined} alt={user.name} className="rounded-full object-cover" />
            <AvatarFallback className="rounded-full bg-[#1279fd]/10 font-semibold text-[#0e63e0] text-lg dark:text-[#6fb0ff]">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {/* Indicador de conexión animado */}
          <span className="absolute right-1 bottom-1 flex size-3.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400/80" />
            <span className="relative inline-flex size-3.5 rounded-full border-2 border-sidebar bg-green-500" />
          </span>
        </div>
        <div className="space-y-0.5">
          <p className="font-semibold text-sm leading-none">{user.name}</p>
          <p className="text-muted-foreground text-xs capitalize">{user.role}</p>
        </div>
      </div>

      {/* Avatar compacto (menú minimizado) */}
      <div className="hidden justify-center py-2 group-data-[collapsible=icon]:flex">
        <div className="relative">
          <Avatar className="size-8 rounded-full">
            <AvatarImage src={user.avatar || undefined} alt={user.name} className="rounded-full object-cover" />
            <AvatarFallback className="rounded-full bg-[#1279fd]/10 font-semibold text-[#0e63e0] text-xs dark:text-[#6fb0ff]">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute right-0 bottom-0 flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400/80" />
            <span className="relative inline-flex size-2.5 rounded-full border-2 border-sidebar bg-green-500" />
          </span>
        </div>
      </div>
    </>
  );
}
