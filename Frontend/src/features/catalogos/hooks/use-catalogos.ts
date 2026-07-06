import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getCatalogos } from "../api/catalogos-api";
import type { CatalogoDefinition, CatalogoQuery } from "../types/catalogos.types";

export const catalogosQueryKey = ["catalogos"] as const;

export function useCatalogos(definition: CatalogoDefinition, query: CatalogoQuery) {
  return useQuery({
    queryKey: [...catalogosQueryKey, definition.key, query],
    queryFn: () => getCatalogos(definition, query),
    placeholderData: keepPreviousData,
  });
}
