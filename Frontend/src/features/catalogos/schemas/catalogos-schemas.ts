import { z } from "zod";

const codigo = z
  .string()
  .trim()
  .min(1, "El código es obligatorio.")
  .max(30, "El código no puede superar 30 caracteres.")
  .regex(/^[A-Z0-9_-]+$/, "Use únicamente mayúsculas, números, guion o guion bajo.")
  .refine((value) => !value.includes(";"), "El código no puede contener punto y coma.");

const base = {
  codigo,
  nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(150),
  descripcion: z.string().trim().default(""),
  activo: z.boolean(),
  orden: z.coerce.number().int().min(0, "El orden no puede ser negativo."),
};

export const tipoNormaSchema = z
  .object({
    ...base,
    abreviatura_archivo: z
      .string()
      .trim()
      .min(1)
      .max(10)
      .regex(/^[A-Z0-9_-]+$/, "Use una abreviatura válida."),
    requiere_numero: z.boolean(),
    requiere_fecha: z.boolean(),
  })
  .refine((data) => data.codigo === data.abreviatura_archivo, {
    path: ["abreviatura_archivo"],
    message: "Al crear, la abreviatura debe coincidir con el código.",
  });

export const efectoNormativoSchema = z.object({
  ...base,
  codigo: z
    .string()
    .trim()
    .regex(/^[A-Z]$/, "El código debe ser una sola letra mayúscula."),
  abreviatura_archivo: z
    .string()
    .trim()
    .regex(/^[A-Z]$/, "La abreviatura debe ser una sola letra mayúscula."),
  es_efecto_final: z.boolean(),
});

export const materiaSchema = z.object({
  ...base,
  slug: z
    .string()
    .trim()
    .min(1, "El slug es obligatorio.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use minúsculas, números y guiones simples."),
  carpeta_destino: z
    .string()
    .trim()
    .min(1, "La carpeta de destino es obligatoria.")
    .max(100)
    .refine(
      (value) => !/[\\/:*?"<>|;]/.test(value) && !value.includes(".."),
      "La carpeta no puede contener barras, caracteres inválidos ni rutas relativas.",
    ),
  color_etiqueta: z.string().trim().max(20).default(""),
  requiere_revision: z.boolean(),
});

const urlOpcional = z.union([z.literal(""), z.url("Ingrese una URL válida.")]);

export const entidadEmisoraSchema = z.object({
  ...base,
  sigla: z
    .string()
    .trim()
    .min(1, "La sigla es obligatoria.")
    .max(30)
    .regex(/^[A-Z0-9_-]+$/),
  tipo_entidad: z.enum([
    "LEGISLATIVO",
    "EJECUTIVO",
    "JUDICIAL",
    "CONSTITUCIONAL",
    "TRIBUTARIO",
    "ADUANERO",
    "MINISTERIAL",
    "MUNICIPAL",
    "OTRO",
  ]),
  nivel: z.string().trim().min(1, "El nivel es obligatorio.").max(30),
  sitio_web: urlOpcional,
});

export const patronTipoNormaSchema = z.object({
  tipo_norma: z.coerce.number().int().positive("Seleccione un tipo de norma."),
  patron_regex: z
    .string()
    .trim()
    .min(1, "El patrón regex es obligatorio.")
    .refine((value) => {
      try {
        new RegExp(value);
        return true;
      } catch {
        return false;
      }
    }, "El patrón regex no es válido."),
  ejemplo_texto: z.string().trim().max(250).default(""),
  prioridad: z.coerce.number().int().min(0),
  activo: z.boolean(),
});

export const palabraClaveMateriaSchema = z.object({
  materia: z.coerce.number().int().positive("Seleccione una materia."),
  palabra_clave: z.string().trim().min(1, "La palabra clave es obligatoria.").max(150),
  peso: z.coerce.number().int().min(0),
  activo: z.boolean(),
});

export const reglaEfectoNormativoSchema = z.object({
  efecto_normativo: z.coerce.number().int().positive("Seleccione un efecto normativo."),
  expresion: z.string().trim().min(1, "La expresión es obligatoria.").max(250),
  prioridad: z.coerce.number().int().min(0),
  activo: z.boolean(),
});
