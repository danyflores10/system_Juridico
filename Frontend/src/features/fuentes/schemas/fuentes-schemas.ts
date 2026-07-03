import { z } from "zod";

const codigoSchema = z
  .string()
  .trim()
  .min(1, "El código es obligatorio.")
  .max(30, "Máximo 30 caracteres.")
  .regex(/^[A-Z0-9_-]+$/, "Use mayúsculas, números, guion o guion bajo.")
  .refine((value) => !value.includes(";"), "El código no puede contener punto y coma.");

const urlHttp = z
  .url("Ingrese una URL válida.")
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), "La URL debe usar http o https.");

const urlOpcional = z.union([z.literal(""), urlHttp]);

export const fuenteSchema = z
  .object({
    codigo: z.union([z.literal(""), codigoSchema]),
    nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(150),
    descripcion: z.string().trim().default(""),
    url_base: urlOpcional,
    url_consulta_principal: urlHttp,
    tipo_fuente: z.enum(["PORTAL_WEB", "API", "RSS", "REPOSITORIO"]),
    motor_consulta: z.enum(["HTTPX", "PLAYWRIGHT"]),
    requiere_javascript: z.boolean(),
    requiere_autenticacion: z.boolean(),
    frecuencia_consulta: z.enum(["MANUAL", "DIARIA", "SEMANAL"]),
    materia_predeterminada: z.coerce.number().int().nonnegative(),
    entidad_emisora_predeterminada: z.coerce.number().int().nonnegative(),
    max_documentos_por_ejecucion: z.coerce.number().int().min(1).max(500),
    patron_incluir: z.string().max(500).default(""),
    patron_excluir: z.string().max(500).default(""),
    esperar_selector: z.string().max(300).default(""),
    esperar_ms: z.coerce.number().int().min(0).max(10000),
    orden: z.coerce.number().int().min(0, "El orden no puede ser negativo."),
    activa: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.requiere_javascript && value.motor_consulta !== "PLAYWRIGHT") {
      context.addIssue({
        code: "custom",
        path: ["motor_consulta"],
        message: "Las fuentes con JavaScript deben usar Playwright.",
      });
    }
  });

export const fuenteSeccionSchema = z.object({
  codigo: codigoSchema,
  nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(150),
  descripcion: z.string().trim().default(""),
  url_listado: urlHttp,
  url_busqueda: urlOpcional,
  materia_predeterminada: z.coerce.number().int().nonnegative(),
  orden: z.coerce.number().int().min(0),
  activa: z.boolean(),
});

export type FuenteFormValues = z.infer<typeof fuenteSchema>;
export type FuenteSeccionFormValues = z.infer<typeof fuenteSeccionSchema>;
