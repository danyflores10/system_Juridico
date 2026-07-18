"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { colorAvatar, inicialesAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  /** Nombre completo mostrado (para iniciales, color y alt). */
  readonly nombre: string;
  /** Correo, usado como respaldo cuando no hay nombre. */
  readonly email?: string;
  /** URL de la foto. Si falta, se muestran las iniciales de color. */
  readonly src?: string | null;
  readonly className?: string;
  readonly fallbackClassName?: string;
}

/**
 * Avatar de usuario: muestra la foto si existe; si no, dibuja las iniciales
 * sobre un color sólido determinista por nombre (estilo Google).
 */
export function UserAvatar({ nombre, email = "", src, className, fallbackClassName }: UserAvatarProps) {
  const semilla = nombre.trim() || email;
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={nombre || email} className="object-cover" /> : null}
      <AvatarFallback
        style={{ backgroundColor: colorAvatar(semilla) }}
        className={cn("font-semibold text-white", fallbackClassName)}
      >
        {inicialesAvatar(nombre, email)}
      </AvatarFallback>
    </Avatar>
  );
}
