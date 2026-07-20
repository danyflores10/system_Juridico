"use client";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

export type CredencialesLogin = {
  email: string;
  password: string;
  remember?: boolean;
};

export type DatosRegistro = {
  nombre: string;
  email: string;
  password: string;
};

/** Busca en la respuesta del backend el primer mensaje de error legible. */
function extraerMensajeError(payload: unknown, claves: readonly string[], respaldo: string): string {
  if (payload && typeof payload === "object") {
    const registro = payload as Record<string, unknown>;
    for (const clave of claves) {
      const valor = registro[clave];
      if (typeof valor === "string") return valor;
      if (Array.isArray(valor) && typeof valor[0] === "string") return valor[0];
    }
  }
  return respaldo;
}

/** Envía las credenciales al BFF, avisa del resultado y entra al panel. */
export function useLoginSubmit() {
  const router = useRouter();

  return async (valores: CredencialesLogin) => {
    const respuesta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    }).catch(() => null);

    if (!respuesta) {
      toast.error("Sin conexión", { description: "No se pudo contactar al servidor." });
      return;
    }

    const datos: unknown = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      toast.error("No se pudo iniciar sesión", {
        description: extraerMensajeError(
          datos,
          ["detail", "non_field_errors", "email", "password"],
          "No se pudo iniciar sesión. Inténtalo de nuevo.",
        ),
      });
      return;
    }

    const usuario = (datos as { usuario?: { nombre?: string } }).usuario;
    toast.success(`¡Bienvenido${usuario?.nombre ? `, ${usuario.nombre}` : ""}!`, {
      description: "Ingresando al panel principal.",
    });
    router.replace("/dashboard/default");
    router.refresh();
  };
}

/** Crea la cuenta en el BFF (separa nombre y apellido) y entra al panel. */
export function useRegisterSubmit() {
  const router = useRouter();

  return async (valores: DatosRegistro) => {
    // Separa el nombre completo en nombre y apellido para el backend.
    const [nombre, ...resto] = valores.nombre.trim().split(/\s+/);
    const respuesta = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        apellido: resto.join(" "),
        email: valores.email,
        password: valores.password,
      }),
    }).catch(() => null);

    if (!respuesta) {
      toast.error("Sin conexión", { description: "No se pudo contactar al servidor." });
      return;
    }

    const datos: unknown = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      toast.error("No se pudo registrar", {
        description: extraerMensajeError(
          datos,
          ["detail", "non_field_errors", "email", "password", "nombre"],
          "No se pudo completar el registro. Inténtalo de nuevo.",
        ),
      });
      return;
    }

    toast.success("Registro correcto", { description: "Ingresando al panel principal." });
    router.replace("/dashboard/default");
    router.refresh();
  };
}
