-- ============================================================================
-- Módulo de Libros — Biblioteca de libros jurídicos
-- Base de datos: systemJuridico (PostgreSQL 18)
--
-- Depende de las extensiones y de la función quitar_tildes() que crea
-- schema-biblioteca.sql, por lo que ese archivo debe ejecutarse primero.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.libros (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo            TEXT        NOT NULL,
  autor             TEXT        NOT NULL,
  editorial         TEXT        NOT NULL DEFAULT '',
  anio_publicacion  INTEGER,
  edicion           TEXT        NOT NULL DEFAULT '',
  isbn              TEXT        NOT NULL DEFAULT '',
  materia           TEXT        NOT NULL,
  descripcion       TEXT        NOT NULL DEFAULT '',
  paginas           INTEGER,
  nombre_archivo    TEXT        NOT NULL,
  extension         TEXT        NOT NULL,
  mime_type         TEXT        NOT NULL,
  tamano_bytes      BIGINT      NOT NULL DEFAULT 0,
  contenido_texto   TEXT        NOT NULL DEFAULT '',
  archivo           BYTEA       NOT NULL,
  -- Portada generada en el navegador a partir de la primera página del PDF.
  portada           BYTEA,
  portada_mime      TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un libro se identifica por su título y autor, no por el nombre del archivo:
-- dos obras distintas pueden venir en archivos llamados igual ("tomo1.pdf").
ALTER TABLE public.libros DROP CONSTRAINT IF EXISTS libros_archivo_unico;

CREATE UNIQUE INDEX IF NOT EXISTS libros_titulo_autor_unico
  ON public.libros (lower(titulo), lower(autor));

-- Vector de búsqueda en español y sin tildes: el título pesa más que el autor
-- y la materia, y estos más que la descripción y el contenido del libro.
ALTER TABLE public.libros
  ADD COLUMN IF NOT EXISTS busqueda tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', public.quitar_tildes(coalesce(titulo, ''))), 'A') ||
    setweight(to_tsvector('spanish', public.quitar_tildes(coalesce(autor, '') || ' ' || coalesce(materia, ''))), 'B') ||
    setweight(to_tsvector('spanish', public.quitar_tildes(coalesce(descripcion, '') || ' ' || coalesce(editorial, ''))), 'C') ||
    setweight(to_tsvector('spanish', public.quitar_tildes(left(coalesce(contenido_texto, ''), 500000))), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_libros_busqueda ON public.libros USING GIN (busqueda);
CREATE INDEX IF NOT EXISTS idx_libros_materia  ON public.libros (materia);
CREATE INDEX IF NOT EXISTS idx_libros_autor    ON public.libros (autor);
CREATE INDEX IF NOT EXISTS idx_libros_creado   ON public.libros (creado_en DESC);
