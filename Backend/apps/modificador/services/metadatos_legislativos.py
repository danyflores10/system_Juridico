"""Parser de convención de nombres: [TIPO]; [NORMA]; [FECHA]; [DESCRIPCIÓN]; [ÁMBITO]; [RAMA]."""

import re
from dataclasses import asdict, dataclass

PATRON_NOMBRE = re.compile(
    r"^(?P<tipo>O|DD|SC)\s*;\s*"
    r"(?P<norma>[^;]+)\s*;\s*"
    r"(?P<fecha>\d{2}-\d{2}-\d{4})\s*;\s*"
    r"(?P<descripcion>[^;]+)\s*;\s*"
    r"(?P<ambito>[^;]+)\s*;\s*"
    r"(?P<rama>[^.;]+)",
    re.IGNORECASE,
)

PATRON_CODIGO_NORMA = re.compile(r"(?:L|LEY|SC|DD|D\.?)\s*(\d{2,8})", re.IGNORECASE)


@dataclass
class MetadatosArchivo:
    tipo: str
    norma: str
    codigo_norma: str
    fecha: str
    fecha_iso: str
    descripcion: str
    ambito: str
    rama: str
    nombre_original: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @property
    def es_original(self) -> bool:
        return self.tipo.upper() == "O"

    @property
    def es_modificatorio(self) -> bool:
        return self.tipo.upper() in ("DD", "SC")


def _fecha_a_iso(fecha: str) -> str:
    m = re.match(r"(\d{2})-(\d{2})-(\d{4})", fecha.strip())
    if not m:
        return fecha
    d, mo, y = m.groups()
    return f"{y}-{mo}-{d}"


def extraer_codigo_norma(norma: str) -> str:
    m = PATRON_CODIGO_NORMA.search(norma.replace("_", " "))
    if not m:
        return ""
    return str(int(m.group(1)))


def parsear_nombre_archivo(nombre: str) -> MetadatosArchivo | None:
    stem = nombre.rsplit(".", 1)[0].strip()
    m = PATRON_NOMBRE.match(stem)
    if not m:
        return None
    g = m.groupdict()
    norma = g["norma"].strip()
    codigo = extraer_codigo_norma(norma)
    fecha = g["fecha"].strip()
    return MetadatosArchivo(
        tipo=g["tipo"].upper(),
        norma=norma,
        codigo_norma=codigo,
        fecha=fecha,
        fecha_iso=_fecha_a_iso(fecha),
        descripcion=g["descripcion"].strip(),
        ambito=g["ambito"].strip(),
        rama=g["rama"].strip(),
        nombre_original=nombre,
    )


def titulo_desde_metadatos(meta: MetadatosArchivo) -> str:
    if meta.descripcion:
        return meta.descripcion
    return f"{meta.norma} — {meta.fecha}"
