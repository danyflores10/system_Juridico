-- ============================================================================
-- Módulo 3: Buscador Jurídico — Esquema de la biblioteca normativa
-- Base de datos: systemJuridico (PostgreSQL 18)
-- ============================================================================

-- Extensión para búsquedas insensibles a tildes (código == codigo).
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Extensión de trigramas: habilita similarity()/word_similarity() para tolerar
-- erratas en el criterio de contenido (p. ej. "financeras" ≈ "financieras").
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent() no es IMMUTABLE, por lo que no puede usarse en columnas generadas
-- ni en índices. Este envoltorio fija el diccionario y sí es inmutable.
CREATE OR REPLACE FUNCTION public.quitar_tildes(texto text)
RETURNS text AS
$$ SELECT public.unaccent('public.unaccent', texto) $$
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- ----------------------------------------------------------------------------
-- Tabla principal: un registro por archivo de la BIBLIOTECA.
-- La nomenclatura del nombre de archivo se descompone en columnas para poder
-- buscar por cada criterio del módulo:
--   Efecto ; TipoNorma ; Número ; FechaPromulgación ; Título ; Objeto ; Materia
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.normativas (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  carpeta            TEXT        NOT NULL CHECK (carpeta IN ('EMITIDA', 'ACTUALIZADA')),
  efecto             TEXT        NOT NULL,
  tipo_norma         TEXT        NOT NULL,
  numero             TEXT        NOT NULL,
  fecha_promulgacion DATE        NOT NULL,
  titulo             TEXT        NOT NULL,
  objeto_resumido    TEXT        NOT NULL,
  materia            TEXT        NOT NULL,
  nombre_archivo     TEXT        NOT NULL,
  extension          TEXT        NOT NULL,
  mime_type          TEXT        NOT NULL,
  tamano_bytes       BIGINT      NOT NULL DEFAULT 0,
  contenido_texto    TEXT        NOT NULL DEFAULT '',
  archivo            BYTEA       NOT NULL,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT normativas_archivo_unico UNIQUE (carpeta, nombre_archivo)
);

-- Vector de búsqueda en español, sin tildes y con pesos:
-- el OBJETO (criterio más importante del módulo) pesa más que el título
-- y este más que el contenido completo extraído del archivo.
ALTER TABLE public.normativas
  ADD COLUMN IF NOT EXISTS busqueda tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', public.quitar_tildes(coalesce(objeto_resumido, ''))), 'A') ||
    setweight(to_tsvector('spanish', public.quitar_tildes(coalesce(titulo, ''))), 'B') ||
    setweight(to_tsvector('spanish', public.quitar_tildes(left(coalesce(contenido_texto, ''), 500000))), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_normativas_busqueda ON public.normativas USING GIN (busqueda);
CREATE INDEX IF NOT EXISTS idx_normativas_carpeta  ON public.normativas (carpeta);
CREATE INDEX IF NOT EXISTS idx_normativas_tipo     ON public.normativas (tipo_norma);
CREATE INDEX IF NOT EXISTS idx_normativas_fecha    ON public.normativas (fecha_promulgacion);
CREATE INDEX IF NOT EXISTS idx_normativas_materia  ON public.normativas (materia);

-- ----------------------------------------------------------------------------
-- Bitácora de búsquedas (útil para estadísticas del buscador).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.busquedas_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criterios   JSONB       NOT NULL,
  resultados  INTEGER     NOT NULL DEFAULT 0,
  plan_acceso TEXT        NOT NULL DEFAULT 'gratuita',
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
