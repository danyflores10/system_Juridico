import { useMutation, useQueryClient } from "@tanstack/react-query";

import { aprobarRevisionJuridica, devolverRevisionJuridica, iniciarRevisionJuridica } from "../api/revision-api";
import type { AprobarRevisionPayload } from "../types/revision.types";
import { revisionQueryKey } from "./use-revision";

export function useRevisionMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: revisionQueryKey });
  const start = useMutation({ mutationFn: iniciarRevisionJuridica, onSuccess: invalidate });
  const approve = useMutation({ mutationFn: ({ uuid, payload }: { uuid: string; payload: AprobarRevisionPayload }) => aprobarRevisionJuridica(uuid, payload), onSuccess: invalidate });
  const returnDocument = useMutation({ mutationFn: ({ uuid, motivo }: { uuid: string; motivo: string }) => devolverRevisionJuridica(uuid, motivo), onSuccess: invalidate });
  return { start, approve, returnDocument };
}
