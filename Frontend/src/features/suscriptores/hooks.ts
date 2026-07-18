import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getResumenSuscriptores, getSuscriptores } from "./api";
import type { SuscriptorQuery } from "./types";

export const suscriptoresQueryKey = ["suscriptores"] as const;

export function useSuscriptores(query: SuscriptorQuery) {
  return useQuery({
    queryKey: [...suscriptoresQueryKey, query],
    queryFn: () => getSuscriptores(query),
    placeholderData: keepPreviousData,
  });
}

export function useResumenSuscriptores() {
  return useQuery({
    queryKey: [...suscriptoresQueryKey, "resumen"],
    queryFn: () => getResumenSuscriptores(),
    refetchInterval: 60_000,
  });
}
