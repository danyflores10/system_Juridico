import type { z } from "zod";

export type CatalogoTabKey = "tipos-norma" | "efectos-normativos" | "materias" | "entidades-emisoras";
export type ReglaTabKey = "patrones-tipo-norma" | "palabras-clave-materia" | "reglas-efecto-normativo";
export type CatalogoDefinitionKey = CatalogoTabKey | ReglaTabKey;
export type StatusFilter = "todos" | "true" | "false";

export type CatalogoRecord = {
  id: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type CatalogoQuery = {
  q?: string;
  activo?: StatusFilter;
  ordering?: string;
  page?: number;
};

export type ColumnKind = "text" | "boolean" | "status" | "date" | "link";

export type CatalogoColumn = {
  key: string;
  label: string;
  kind?: ColumnKind;
  className?: string;
};

export type SelectOption = { value: string; label: string };

export type FormFieldDefinition = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "switch" | "select" | "relation";
  placeholder?: string;
  help?: string;
  options?: SelectOption[];
  relationDefinition?: CatalogoDefinitionKey;
  relationLabelKey?: string;
  maxLength?: number;
  className?: string;
};

export type CatalogoDefinition = {
  key: CatalogoDefinitionKey;
  endpoint: string;
  title: string;
  singular: string;
  description: string;
  columns: CatalogoColumn[];
  fields: FormFieldDefinition[];
  schema: z.ZodType;
  defaultValues: Record<string, unknown>;
  ordering: string;
  successCreated: string;
  successUpdated: string;
};
