import { z } from "zod";

export const documentoUploadSchema = z
  .custom<File>((value) => value instanceof File, "Seleccione un archivo PDF.")
  .refine((file) => file.name.toLowerCase().endsWith(".pdf"), "El archivo debe tener extensión .pdf.")
  .refine((file) => file.size > 0, "El archivo está vacío.")
  .refine((file) => file.size <= 100 * 1024 * 1024, "El PDF no puede superar 100 MB.");
