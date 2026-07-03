import { ApiError, apiRequest } from "./client";

export type CatalogoKey = "materias" | "tiposNorma" | "efectos" | "entidades";
export type CatalogoIdentifier = "codigo" | "sigla";

export type Catalogo = {
  id: number;
  codigo?: string;
  sigla?: string;
  nombre: string;
  descripcion: string;
  sitio_web?: string;
  slug?: string;
  carpeta_destino?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type CatalogoPayload = {
  codigo?: string;
  sigla?: string;
  nombre: string;
  descripcion: string;
  sitio_web?: string;
  activo: boolean;
};

export type CatalogoDefinition = {
  title: string;
  singular: string;
  description: string;
  endpoint: string;
  identifier: CatalogoIdentifier;
  identifierLabel: string;
  identifierPlaceholder: string;
  identifierMaxLength: number;
  hasWebsite: boolean;
};

export const catalogoDefinitions: Record<CatalogoKey, CatalogoDefinition> = {
  materias: {
    title: "Materias jurídicas",
    singular: "materia jurídica",
    description: "Administra las áreas del derecho utilizadas para clasificar normas y expedientes.",
    endpoint: "catalogos/materias",
    identifier: "codigo",
    identifierLabel: "Código",
    identifierPlaceholder: "Ej. TRIB",
    identifierMaxLength: 20,
    hasWebsite: false,
  },
  tiposNorma: {
    title: "Tipos de norma",
    singular: "tipo de norma",
    description: "Gestiona la nomenclatura oficial de leyes, decretos, resoluciones y otras normas.",
    endpoint: "catalogos/tipos-norma",
    identifier: "codigo",
    identifierLabel: "Código",
    identifierPlaceholder: "Ej. DS",
    identifierMaxLength: 10,
    hasWebsite: false,
  },
  efectos: {
    title: "Efectos normativos",
    singular: "efecto normativo",
    description: "Define los efectos que una disposición produce sobre otras normas jurídicas.",
    endpoint: "catalogos/efectos-normativos",
    identifier: "codigo",
    identifierLabel: "Código",
    identifierPlaceholder: "Ej. D",
    identifierMaxLength: 2,
    hasWebsite: false,
  },
  entidades: {
    title: "Entidades emisoras",
    singular: "entidad emisora",
    description: "Administra las instituciones responsables de emitir normas y resoluciones.",
    endpoint: "catalogos/entidades-emisoras",
    identifier: "sigla",
    identifierLabel: "Sigla",
    identifierPlaceholder: "Ej. TCP",
    identifierMaxLength: 20,
    hasWebsite: true,
  },
};

export { ApiError as CatalogoApiError };

export async function listarCatalogos(definition: CatalogoDefinition) {
  const response = await apiRequest<Catalogo[] | { results: Catalogo[] }>(`${definition.endpoint}/?activo=todos`);
  return Array.isArray(response) ? response : response.results;
}

export function crearCatalogo(definition: CatalogoDefinition, payload: CatalogoPayload) {
  return apiRequest<Catalogo>(`${definition.endpoint}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function actualizarCatalogo(definition: CatalogoDefinition, id: number, payload: Partial<CatalogoPayload>) {
  return apiRequest<Catalogo>(`${definition.endpoint}/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
