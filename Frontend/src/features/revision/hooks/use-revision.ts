import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";

import { listarBandejaRevision, obtenerRevisionJuridica } from "../api/revision-api";
import type { VistaRevision } from "../types/revision.types";

export const revisionQueryKey = ["revision-juridica"] as const;

export function useBandejaRevision(values: { vista?: VistaRevision; q?: string; page?: number }) {
  return useQuery({
    queryKey: [...revisionQueryKey, "bandeja", values],
    queryFn: () => listarBandejaRevision(values),
    placeholderData: keepPreviousData,
  });
}

export function useResumenRevision() {
  const queries = useQueries({
    queries: (["", "LISTOS", "ALERTAS", "BAJA_CONFIANZA"] as VistaRevision[]).map((vista) => ({
      queryKey: [...revisionQueryKey, "resumen", vista || "TODOS"],
      queryFn: () => listarBandejaRevision({ vista, page: 1 }),
    })),
  });
  return { values: queries.map((item) => item.data?.count ?? 0), loading: queries.some((item) => item.isLoading) };
}

export function useRevisionJuridica(uuid: string) {
  return useQuery({
    queryKey: [...revisionQueryKey, "detalle", uuid],
    queryFn: () => obtenerRevisionJuridica(uuid),
    enabled: Boolean(uuid),
  });
}
