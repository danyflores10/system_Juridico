"use client";

import { useEffect, useState } from "react";

import { Bell, CalendarClock, FileText, Mail, Maximize, Minimize, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const messages = [
  { id: 1, title: "María Gutiérrez", desc: "Consulta sobre el estado de su expediente.", time: "hace 5 min" },
  { id: 2, title: "Estudio Jurídico Andino", desc: "Propuesta de colaboración recibida.", time: "hace 1 h" },
];

const notifications = [
  {
    id: 1,
    icon: CalendarClock,
    title: "Audiencia programada",
    desc: "Mañana a las 09:00 — CJ-2026-0042",
    time: "hace 10 min",
  },
  { id: 2, icon: FileText, title: "Nuevo documento", desc: "Se subió un archivo a CJ-2026-0038", time: "hace 2 h" },
  { id: 3, icon: Scale, title: "Vencimiento de plazo", desc: "Quedan 3 días en CJ-2026-0051", time: "ayer" },
];

/** Botón de mensajes con indicador rojo de no leídos. */
export function MessagesMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="relative text-muted-foreground" aria-label="Mensajes">
          <Mail />
          <span className="absolute top-1.5 right-1.5 flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-red-500 ring-2 ring-background" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Mensajes</span>
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-500 text-xs">
            {messages.length} nuevos
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {messages.map((msg) => (
          <DropdownMenuItem key={msg.id} className="flex flex-col items-start gap-0.5 py-2">
            <div className="flex w-full items-center justify-between">
              <span className="font-medium text-sm">{msg.title}</span>
              <span className="text-muted-foreground text-xs">{msg.time}</span>
            </div>
            <span className="text-muted-foreground text-xs">{msg.desc}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-muted-foreground text-xs">
          Ver todos los mensajes
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Botón de notificaciones con indicador verde. */
export function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="relative text-muted-foreground" aria-label="Notificaciones">
          <Bell />
          <span className="absolute top-1.5 right-1.5 flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500 ring-2 ring-background" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          <span className="rounded-full bg-green-500/10 px-2 py-0.5 font-medium text-green-600 text-xs">
            {notifications.length}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.map((note) => (
          <DropdownMenuItem key={note.id} className="flex items-start gap-3 py-2">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <note.icon className="size-4" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{note.title}</span>
              <span className="text-muted-foreground text-xs">{note.desc}</span>
              <span className="text-muted-foreground/70 text-xs">{note.time}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-muted-foreground text-xs">
          Ver todas las notificaciones
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Botón para alternar pantalla completa. */
export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      className="text-muted-foreground"
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
    >
      {isFullscreen ? <Minimize /> : <Maximize />}
    </Button>
  );
}
