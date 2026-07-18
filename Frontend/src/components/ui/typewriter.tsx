"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface TypewriterProps {
  /** Palabras que se escriben y borran en bucle. */
  words: string[];
  className?: string;
  /** Clases para el cursor (por defecto hereda el color del texto). */
  caretClassName?: string;
  /** Milisegundos por carácter al escribir. */
  typingSpeed?: number;
  /** Milisegundos por carácter al borrar. */
  deletingSpeed?: number;
  /** Pausa (ms) cuando una palabra queda completa. */
  pauseMs?: number;
}

/** Efecto máquina de escribir: escribe cada palabra, la borra y pasa a la siguiente. */
export function Typewriter({
  words,
  className,
  caretClassName,
  typingSpeed = 85,
  deletingSpeed = 40,
  pauseMs = 1500,
}: TypewriterProps) {
  const [index, setIndex] = useState(0);
  const [sub, setSub] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const current = words[index] ?? "";

  useEffect(() => {
    if (words.length === 0) return;

    // Palabra completa → pausa y luego empieza a borrar.
    if (!deleting && sub === current.length) {
      const t = setTimeout(() => setDeleting(true), pauseMs);
      return () => clearTimeout(t);
    }

    // Palabra borrada → pasa a la siguiente.
    if (deleting && sub === 0) {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }

    const t = setTimeout(
      () => setSub((s) => s + (deleting ? -1 : 1)),
      deleting ? deletingSpeed : typingSpeed,
    );
    return () => clearTimeout(t);
  }, [sub, deleting, current, words.length, typingSpeed, deletingSpeed, pauseMs]);

  return (
    <span className={className} aria-label={words.join(" · ")}>
      <span aria-hidden>{current.slice(0, sub)}</span>
      <span
        aria-hidden
        className={cn("ml-1 inline-block h-[1em] w-[3px] translate-y-[0.12em] rounded-[1px] bg-current", caretClassName)}
        style={{ animation: "caret-blink 1.06s infinite" }}
      />
    </span>
  );
}
