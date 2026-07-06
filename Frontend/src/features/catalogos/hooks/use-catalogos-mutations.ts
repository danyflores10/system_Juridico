import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCatalogo, setCatalogoStatus, updateCatalogo } from "../api/catalogos-api";
import type { CatalogoDefinition } from "../types/catalogos.types";
import { catalogosQueryKey } from "./use-catalogos";

export function useCatalogoMutations(definition: CatalogoDefinition) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: catalogosQueryKey });

  const save = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Record<string, unknown> }) =>
      id ? updateCatalogo(definition, id, payload) : createCatalogo(definition, payload),
    onSuccess: invalidate,
  });

  const status = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => setCatalogoStatus(definition, id, active),
    onSuccess: invalidate,
  });

  return { save, status };
}
