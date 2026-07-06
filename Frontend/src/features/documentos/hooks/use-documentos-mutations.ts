import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cargarDocumento,
  descartarDocumento,
  procesarDocumento,
  reintentarProcesamiento,
  extraerDatosJuridicos,
  reintentarExtraccion,
  ejecutarControlCalidad,
  reintentarControlCalidad,
  convertirDocumentoWord,
  reintentarConversionWord,
} from "../api/documentos-api";
import { documentosQueryKey } from "./use-documentos";

export function useDocumentoMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: documentosQueryKey });
  const upload = useMutation({ mutationFn: cargarDocumento, onSuccess: invalidate });
  const discard = useMutation({ mutationFn: descartarDocumento, onSuccess: invalidate });
  const process = useMutation({ mutationFn: procesarDocumento, onSuccess: invalidate });
  const retry = useMutation({ mutationFn: reintentarProcesamiento, onSuccess: invalidate });
  const extract = useMutation({ mutationFn: extraerDatosJuridicos, onSuccess: invalidate });
  const retryExtraction = useMutation({ mutationFn: reintentarExtraccion, onSuccess: invalidate });
  const quality = useMutation({ mutationFn: ejecutarControlCalidad, onSuccess: invalidate });
  const retryQuality = useMutation({ mutationFn: reintentarControlCalidad, onSuccess: invalidate });
  const convert = useMutation({ mutationFn: convertirDocumentoWord, onSuccess: invalidate });
  const retryConversion = useMutation({ mutationFn: reintentarConversionWord, onSuccess: invalidate });
  return { upload, discard, process, retry, extract, retryExtraction, quality, retryQuality, convert, retryConversion };
}
