"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, BookUp, CircleAlert, CloudUpload, FileText, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  ANIO_MINIMO_LIBRO,
  anioMaximoLibro,
  esExtensionPermitida,
  extensionDeArchivo,
  formatearTamano,
  MATERIAS_LIBRO,
  TAMANO_MAXIMO_LIBRO,
} from "@/data/libros-catalogo";
import { cn } from "@/lib/utils";

/** Valor del selector cuando la materia se escribe a mano. */
const MATERIA_OTRA = "__otra__";

interface Ficha {
  titulo: string;
  autor: string;
  editorial: string;
  anioPublicacion: string;
  edicion: string;
  isbn: string;
  descripcion: string;
}

const FICHA_VACIA: Ficha = {
  titulo: "",
  autor: "",
  editorial: "",
  anioPublicacion: "",
  edicion: "",
  isbn: "",
  descripcion: "",
};

/**
 * Deriva un título legible del nombre del archivo, para no obligar a escribirlo
 * de cero: quita la extensión, los guiones bajos y los espacios repetidos.
 */
function tituloDesdeArchivo(nombre: string): string {
  const sinExtension = nombre.replace(/\.[^.]+$/, "");
  return sinExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Renderiza la primera página del PDF en un lienzo y la devuelve como PNG,
 * para usarla de portada en el catálogo. Si algo falla, el libro se sube igual
 * y el catálogo dibuja una carátula con el título.
 */
async function generarPortada(archivo: File): Promise<{ blob: Blob; url: string; paginas: number } | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const tarea = pdfjs.getDocument({ data: await archivo.arrayBuffer() });
    const documento = await tarea.promise;
    try {
      const paginas = documento.numPages;
      const primera = await documento.getPage(1);
      const vistaBase = primera.getViewport({ scale: 1 });
      // Ancho fijo: portadas homogéneas y livianas en el catálogo.
      const escala = 620 / vistaBase.width;
      const vista = primera.getViewport({ scale: escala });

      const lienzo = document.createElement("canvas");
      lienzo.width = Math.floor(vista.width);
      lienzo.height = Math.floor(vista.height);
      const contexto = lienzo.getContext("2d");
      if (!contexto) return null;

      // Fondo blanco: los PDF sin fondo propio saldrían transparentes en PNG.
      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, lienzo.width, lienzo.height);

      await primera.render({ canvas: lienzo, viewport: vista }).promise;

      const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, "image/png"));
      if (!blob) return null;

      return { blob, url: lienzo.toDataURL("image/png"), paginas };
    } finally {
      // Liberar la tarea de carga cierra también el documento y su worker.
      await tarea.destroy();
    }
  } catch (error) {
    console.error("No fue posible generar la portada del libro:", error);
    return null;
  }
}

export function FormularioLibro() {
  const router = useRouter();

  const [archivo, setArchivo] = React.useState<File | null>(null);
  const [ficha, setFicha] = React.useState<Ficha>(FICHA_VACIA);
  // Sin materia por defecto: elegirla es una decisión del usuario, y un valor
  // preseleccionado terminaría etiquetando libros con una materia que nadie revisó.
  const [materiaElegida, setMateriaElegida] = React.useState("");
  const [materiaLibre, setMateriaLibre] = React.useState("");
  const [arrastrando, setArrastrando] = React.useState(false);
  const [errorArchivo, setErrorArchivo] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  // Portada generada desde el PDF: vista previa + blob que viaja con el envío.
  const [portada, setPortada] = React.useState<{ blob: Blob; url: string } | null>(null);
  const [generandoPortada, setGenerandoPortada] = React.useState(false);
  /** Total de páginas leído del propio PDF; viaja como dato de la ficha. */
  const [paginas, setPaginas] = React.useState("");

  const entradaRef = React.useRef<HTMLInputElement | null>(null);

  const materia = materiaElegida === MATERIA_OTRA ? materiaLibre.trim() : materiaElegida;
  const anioMaximo = anioMaximoLibro();

  const errores = React.useMemo(() => {
    const lista: string[] = [];
    if (ficha.titulo.trim() === "") lista.push("Escriba el título del libro.");
    if (ficha.autor.trim() === "") lista.push("Escriba el autor del libro.");
    if (materia === "") lista.push("Indique la materia del libro.");
    if (ficha.anioPublicacion !== "") {
      const anio = Number(ficha.anioPublicacion);
      if (!Number.isInteger(anio) || anio < ANIO_MINIMO_LIBRO || anio > anioMaximo) {
        lista.push(`El año debe estar entre ${ANIO_MINIMO_LIBRO} y ${anioMaximo}.`);
      }
    }
    return lista;
  }, [ficha, materia, anioMaximo]);

  const listoParaEnviar = archivo !== null && errores.length === 0 && !enviando;

  function actualizar<Campo extends keyof Ficha>(campo: Campo, valor: string) {
    setFicha((actual) => ({ ...actual, [campo]: valor }));
  }

  async function tomarArchivo(seleccionado: File) {
    const extension = extensionDeArchivo(seleccionado.name);

    if (!esExtensionPermitida(extension)) {
      setErrorArchivo("Solo se admiten archivos PDF, DOCX o TXT.");
      return;
    }
    if (seleccionado.size === 0) {
      setErrorArchivo("El archivo está vacío.");
      return;
    }
    if (seleccionado.size > TAMANO_MAXIMO_LIBRO) {
      setErrorArchivo(`El archivo supera el máximo de ${Math.round(TAMANO_MAXIMO_LIBRO / (1024 * 1024))} MB.`);
      return;
    }

    setErrorArchivo("");
    setArchivo(seleccionado);
    setPortada(null);

    // Propone el título a partir del nombre del archivo si aún está vacío.
    setFicha((actual) =>
      actual.titulo.trim() === "" ? { ...actual, titulo: tituloDesdeArchivo(seleccionado.name) } : actual,
    );

    if (extension !== "pdf") {
      setPaginas("");
      return;
    }

    setGenerandoPortada(true);
    const generada = await generarPortada(seleccionado);
    setGenerandoPortada(false);
    if (generada) {
      setPortada({ blob: generada.blob, url: generada.url });
      setPaginas(generada.paginas.toString());
    }
  }

  function quitarArchivo() {
    setArchivo(null);
    setPortada(null);
    setPaginas("");
    setErrorArchivo("");
    if (entradaRef.current) entradaRef.current.value = "";
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!archivo || errores.length > 0) return;

    setEnviando(true);
    try {
      const formulario = new FormData();
      formulario.append("archivo", archivo);
      formulario.append("titulo", ficha.titulo.trim());
      formulario.append("autor", ficha.autor.trim());
      formulario.append("editorial", ficha.editorial.trim());
      formulario.append("anioPublicacion", ficha.anioPublicacion.trim());
      formulario.append("edicion", ficha.edicion.trim());
      formulario.append("isbn", ficha.isbn.trim());
      formulario.append("materia", materia);
      formulario.append("descripcion", ficha.descripcion.trim());
      formulario.append("paginas", paginas);
      if (portada) formulario.append("portada", portada.blob, "portada.png");

      const respuesta = await fetch("/api/biblioteca/libros", { method: "POST", body: formulario });
      const datos: { error?: string; detalles?: string[] } = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        toast.error(datos.error ?? "No fue posible subir el libro.", { description: datos.detalles?.join(" ") });
        return;
      }

      toast.success("Libro incorporado al catálogo.", { description: ficha.titulo.trim() });
      router.push("/dashboard/libros");
      router.refresh();
    } catch {
      toast.error("No fue posible comunicarse con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 font-semibold text-2xl tracking-tight">
            <BookUp className="size-6 text-primary" />
            Subir libro
          </h1>
          <p className="text-muted-foreground text-sm">
            Adjunte el archivo y complete la ficha. Del contenido se extrae el texto para poder buscar dentro del libro.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/libros">
            <ArrowLeft className="size-4" />
            Volver al catálogo
          </Link>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Columna izquierda: archivo y portada */}
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <div>
            <h2 className="font-medium text-sm">Archivo del libro</h2>
            <p className="text-muted-foreground text-xs">
              PDF, DOCX o TXT — máximo {Math.round(TAMANO_MAXIMO_LIBRO / (1024 * 1024))} MB.
            </p>
          </div>

          {archivo === null ? (
            /* biome-ignore lint/a11y/noStaticElementInteractions: la zona delega en el input de archivo */
            <div
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
                arrastrando ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              )}
              onClick={() => entradaRef.current?.click()}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" || evento.key === " ") entradaRef.current?.click();
              }}
              onDragOver={(evento) => {
                evento.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(evento) => {
                evento.preventDefault();
                setArrastrando(false);
                const soltado = evento.dataTransfer.files.item(0);
                if (soltado) void tomarArchivo(soltado);
              }}
            >
              <CloudUpload className="size-8 text-muted-foreground" />
              <p className="font-medium text-sm">Arrastre el libro aquí o haga clic para seleccionarlo</p>
              <p className="text-muted-foreground text-xs">La portada se genera sola desde la primera página</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/50">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-all font-medium text-sm leading-snug">{archivo.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatearTamano(archivo.size)}
                    {paginas !== "" ? ` · ${paginas} páginas` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label="Quitar archivo"
                  onClick={quitarArchivo}
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="self-start font-medium text-muted-foreground text-xs">Portada</span>
                <div className="flex aspect-3/4 w-44 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {generandoPortada ? <Spinner className="size-5 text-muted-foreground" /> : null}
                  {!generandoPortada && portada ? (
                    // Vista previa local (data URL) generada en el navegador.
                    // biome-ignore lint/performance/noImgElement: vista previa temporal en memoria
                    <img src={portada.url} alt="Vista previa de la portada" className="size-full object-cover" />
                  ) : null}
                  {!generandoPortada && !portada ? (
                    <span className="px-3 text-center text-muted-foreground text-xs">
                      Se generará una carátula con el título
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {errorArchivo !== "" ? (
            <p className="flex items-start gap-1.5 text-destructive text-xs">
              <CircleAlert className="mt-px size-3.5 shrink-0" />
              {errorArchivo}
            </p>
          ) : null}

          <input
            ref={entradaRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(evento) => {
              const seleccionado = evento.target.files?.item(0);
              if (seleccionado) void tomarArchivo(seleccionado);
            }}
          />
        </section>

        {/* Columna derecha: ficha del libro */}
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="font-medium text-sm">Ficha del libro</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="libro-titulo">Título *</Label>
              <Input
                id="libro-titulo"
                value={ficha.titulo}
                onChange={(evento) => actualizar("titulo", evento.target.value)}
                placeholder="Ej. Derecho Procesal Civil Boliviano"
                disabled={enviando}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="libro-autor">Autor *</Label>
              <Input
                id="libro-autor"
                value={ficha.autor}
                onChange={(evento) => actualizar("autor", evento.target.value)}
                placeholder="Ej. Juan Pérez Vargas"
                disabled={enviando}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="libro-editorial">Editorial</Label>
              <Input
                id="libro-editorial"
                value={ficha.editorial}
                onChange={(evento) => actualizar("editorial", evento.target.value)}
                placeholder="Ej. Editorial Jurídica Temis"
                disabled={enviando}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="libro-materia">Materia *</Label>
              <Select value={materiaElegida} onValueChange={setMateriaElegida} disabled={enviando}>
                <SelectTrigger id="libro-materia" className="w-full">
                  <SelectValue placeholder="Seleccione la materia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MATERIAS_LIBRO.map((opcion) => (
                      <SelectItem key={opcion} value={opcion}>
                        {opcion}
                      </SelectItem>
                    ))}
                    <SelectItem value={MATERIA_OTRA}>Otra materia…</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {materiaElegida === MATERIA_OTRA ? (
                <Input
                  value={materiaLibre}
                  onChange={(evento) => setMateriaLibre(evento.target.value)}
                  placeholder="Escriba la materia"
                  aria-label="Materia del libro"
                  disabled={enviando}
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="libro-anio">Año de publicación</Label>
              <Input
                id="libro-anio"
                type="number"
                inputMode="numeric"
                min={ANIO_MINIMO_LIBRO}
                max={anioMaximo}
                value={ficha.anioPublicacion}
                onChange={(evento) => actualizar("anioPublicacion", evento.target.value)}
                placeholder="Ej. 2021"
                disabled={enviando}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="libro-edicion">Edición</Label>
              <Input
                id="libro-edicion"
                value={ficha.edicion}
                onChange={(evento) => actualizar("edicion", evento.target.value)}
                placeholder="Ej. 3.ª edición"
                disabled={enviando}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="libro-isbn">ISBN</Label>
              <Input
                id="libro-isbn"
                value={ficha.isbn}
                onChange={(evento) => actualizar("isbn", evento.target.value)}
                placeholder="Ej. 978-99954-0-000-0"
                disabled={enviando}
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="libro-descripcion">Descripción</Label>
              <Textarea
                id="libro-descripcion"
                value={ficha.descripcion}
                onChange={(evento) => actualizar("descripcion", evento.target.value)}
                placeholder="Resumen breve del contenido del libro."
                rows={4}
                disabled={enviando}
              />
            </div>
          </div>

          {archivo !== null && errores.length > 0 ? (
            <div className="flex flex-col gap-1 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              {errores.map((error) => (
                <p key={error} className="flex items-start gap-1.5 text-destructive text-xs">
                  <CircleAlert className="mt-px size-3.5 shrink-0" />
                  {error}
                </p>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <Button asChild type="button" variant="outline" disabled={enviando}>
              <Link href="/dashboard/libros">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={!listoParaEnviar}>
              {enviando ? <Spinner className="size-4" /> : <BookUp className="size-4" />}
              Agregar al catálogo
            </Button>
          </div>
        </section>
      </div>
    </form>
  );
}
