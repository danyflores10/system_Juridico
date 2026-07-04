/**
 * Siembra la BIBLIOTECA del Módulo 3 con normativa boliviana de ejemplo.
 * Genera archivos PDF reales (con la nomenclatura oficial en el nombre)
 * y los inserta en las carpetas NORMATIVA EMITIDA y NORMATIVA ACTUALIZADA.
 *
 * Uso: npm run db:seed
 */
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import pg from "pg";

const cadenaConexion = process.env.DATABASE_URL ?? "postgresql://postgres:123456789@localhost:5432/systemJuridico";

const NORMAS = [
  {
    carpeta: "EMITIDA",
    efecto: "V",
    tipo: "L",
    numero: "2492",
    fecha: "02-08-2003",
    titulo: "Código Tributario Boliviano",
    objeto: "Sistema Tributario Boliviano",
    materia: "Derecho Tributario",
    cuerpo: [
      "ARTICULO 1. (Ambito de Aplicación). Las disposiciones de este Código establecen los principios, instituciones, procedimientos y las normas fundamentales que regulan el régimen jurídico del sistema tributario boliviano y son aplicables a todos los tributos de carácter nacional, departamental, municipal y universitario.",
      "ARTICULO 2. (Ambito Espacial). Las normas tributarias tienen aplicación en el ámbito territorial sometido a la facultad normativa del órgano competente para dictarlas, salvo que en ellas se establezcan límites territoriales más restringidos.",
      "ARTICULO 3. (Vigencia). Las normas tributarias regirán a partir de su publicación oficial o desde la fecha que ellas determinen, siempre que hubiera publicación previa.",
      "ARTICULO 4. (Plazos y Términos). Los plazos relativos a las normas tributarias son perentorios y se computarán en la forma establecida por el presente Código.",
      "ARTICULO 5. (Fuente, Prelación Normativa y Derecho Supletorio). Con carácter limitativo, son fuente del Derecho Tributario con la siguiente prelación normativa: la Constitución Política del Estado, los convenios y tratados internacionales aprobados por el Poder Legislativo, el presente Código, las leyes, los decretos supremos, las resoluciones supremas y las demás disposiciones de carácter general dictadas por los órganos administrativos facultados al efecto.",
      "ARTICULO 6. (Principio de Legalidad o Reserva de Ley). Solo la Ley puede crear, modificar y suprimir tributos, definir el hecho generador de la obligación tributaria, fijar la base imponible y alícuota, designar al sujeto pasivo y otorgar exenciones tributarias.",
    ],
  },
  {
    carpeta: "ACTUALIZADA",
    efecto: "M",
    tipo: "L",
    numero: "2492",
    fecha: "02-08-2003",
    titulo: "Código Tributario Boliviano Texto Ordenado",
    objeto: "Sistema Tributario Boliviano actualizado con modificaciones vigentes",
    materia: "Derecho Tributario",
    cuerpo: [
      "TEXTO ORDENADO, CONCORDADO Y ACTUALIZADO AL 2024. Incluye las modificaciones introducidas por la Ley 812 de 30 de junio de 2016 y disposiciones conexas.",
      "ARTICULO 1. (Ambito de Aplicación). Las disposiciones de este Código establecen los principios, instituciones, procedimientos y las normas fundamentales que regulan el régimen jurídico del sistema tributario boliviano.",
      "ARTICULO 47. (Componentes de la Deuda Tributaria). Modificado por la Ley 812. La deuda tributaria es el tributo omitido expresado en Unidades de Fomento de Vivienda más intereses, que debe pagar el sujeto pasivo después de vencido el plazo para el cumplimiento de la obligación tributaria.",
      "ARTICULO 59. (Prescripción). Modificado por la Ley 812. Las acciones de la Administración Tributaria prescribirán a los ocho años para controlar, investigar, verificar, comprobar y fiscalizar tributos, determinar la deuda tributaria e imponer sanciones administrativas.",
      "NOTA DEL EDITOR: Esta versión actualizada incorpora la jurisprudencia constitucional relevante y las resoluciones normativas de directorio emitidas por el Servicio de Impuestos Nacionales.",
    ],
  },
  {
    carpeta: "EMITIDA",
    efecto: "M",
    tipo: "L",
    numero: "843",
    fecha: "20-05-1986",
    titulo: "Ley de Reforma Tributaria",
    objeto: "Creación del Impuesto al Valor Agregado y régimen tributario nacional",
    materia: "Derecho Tributario",
    cuerpo: [
      "ARTICULO 1. Créase en todo el territorio nacional un impuesto que se denominará Impuesto al Valor Agregado (IVA) que se aplicará sobre las ventas de bienes muebles situados o colocados en el territorio del país, los contratos de obras, de prestación de servicios y toda otra prestación cualquiera fuere su naturaleza, y las importaciones definitivas.",
      "ARTICULO 5. Constituye la base imponible el precio neto de la venta de bienes muebles, de los contratos de obras y de prestación de servicios y de toda otra prestación, cualquiera fuere su naturaleza, consignado en la factura, nota fiscal o documento equivalente.",
      "ARTICULO 15. La alícuota general única del impuesto será del 13 por ciento.",
      "ARTICULO 36. Créase un Impuesto sobre las Utilidades de las Empresas, que se aplicará en todo el territorio nacional sobre las utilidades resultantes de los estados financieros de las mismas al cierre de cada gestión anual.",
      "ARTICULO 71. Créase un impuesto sobre los ingresos de las personas naturales y sucesiones indivisas, provenientes de la inversión de capital, del trabajo o de la aplicación conjunta de ambos factores, que se denominará Régimen Complementario al Impuesto al Valor Agregado (RC-IVA).",
    ],
  },
  {
    carpeta: "ACTUALIZADA",
    efecto: "M",
    tipo: "L",
    numero: "843",
    fecha: "20-05-1986",
    titulo: "Ley de Reforma Tributaria Texto Ordenado",
    objeto: "Texto ordenado del régimen tributario nacional con todas sus modificaciones",
    materia: "Derecho Tributario",
    cuerpo: [
      "TEXTO ORDENADO VIGENTE. Compilación oficial que incorpora las modificaciones de la Ley 1606, la Ley 2493 y la normativa reglamentaria conexa del Impuesto al Valor Agregado, el Régimen Complementario, el Impuesto sobre las Utilidades de las Empresas y el Impuesto a las Transacciones.",
      "ARTICULO 1. Objeto del Impuesto al Valor Agregado: ventas habituales de bienes muebles, alquiler de bienes muebles e inmuebles, servicios en general, importaciones definitivas y arrendamiento financiero con bienes muebles.",
      "ARTICULO 15. La alícuota general única del impuesto será del 13 por ciento, aplicable sobre el precio neto de venta consignado en la factura.",
      "ANEXO: cuadro comparativo de alícuotas vigentes por impuesto, actualizado por la administración tributaria.",
    ],
  },
  {
    carpeta: "EMITIDA",
    efecto: "V",
    tipo: "DS",
    numero: "27310",
    fecha: "09-01-2004",
    titulo: "Reglamento al Código Tributario Boliviano",
    objeto: "Reglamentación de la Ley 2492 Código Tributario Boliviano",
    materia: "Derecho Tributario",
    cuerpo: [
      "ARTICULO 1. (Objeto). El presente Decreto Supremo tiene por objeto reglamentar la Ley 2492 de 2 de agosto de 2003, Código Tributario Boliviano.",
      "ARTICULO 5. (Realización del Hecho Generador). El sujeto pasivo o tercero responsable deberá demostrar documentalmente la realización o no realización del hecho generador.",
      "ARTICULO 8. (Determinación y Composición de la Deuda Tributaria). La deuda tributaria se configura al día siguiente de la fecha del vencimiento del plazo para el pago de la obligación tributaria.",
      "ARTICULO 21. (Procedimiento Determinativo en Casos Especiales). La Administración Tributaria establecerá los medios y procedimientos para la determinación de oficio de la obligación tributaria.",
    ],
  },
  {
    carpeta: "EMITIDA",
    efecto: "V",
    tipo: "L",
    numero: "1178",
    fecha: "20-07-1990",
    titulo: "Ley de Administración y Control Gubernamentales SAFCO",
    objeto: "Sistemas de administración y control de los recursos del Estado",
    materia: "Derecho Administrativo",
    cuerpo: [
      "ARTICULO 1. La presente Ley regula los sistemas de Administración y de Control de los recursos del Estado y su relación con los sistemas nacionales de Planificación e Inversión Pública, con el objeto de programar, organizar, ejecutar y controlar la captación y el uso eficaz y eficiente de los recursos públicos.",
      "ARTICULO 3. Los sistemas de Administración y de Control se aplicarán en todas las entidades del Sector Público, sin excepción.",
      "ARTICULO 13. El Control Gubernamental tendrá por objetivo mejorar la eficiencia en la captación y uso de los recursos públicos y en las operaciones del Estado, la confiabilidad de la información que se genere sobre los mismos, los procedimientos para que toda autoridad y ejecutivo rinda cuenta oportuna de los resultados de su gestión y la capacidad administrativa para impedir o identificar y comprobar el manejo inadecuado de los recursos del Estado.",
      "ARTICULO 28. Todo servidor público responderá de los resultados emergentes del desempeño de las funciones, deberes y atribuciones asignados a su cargo. La responsabilidad administrativa, ejecutiva, civil y penal se determinará tomando en cuenta los resultados de la acción u omisión.",
    ],
  },
  {
    carpeta: "EMITIDA",
    efecto: "V",
    tipo: "L",
    numero: "025",
    fecha: "24-06-2010",
    titulo: "Ley del Organo Judicial",
    objeto: "Estructura organización y funcionamiento del Organo Judicial",
    materia: "Derecho Constitucional",
    cuerpo: [
      "ARTICULO 1. (Objeto). La presente Ley tiene por objeto regular la estructura, organización y funcionamiento del Organo Judicial.",
      "ARTICULO 2. (Naturaleza). El Organo Judicial es un órgano del poder público, se funda en la pluralidad y el pluralismo jurídico, tiene igual jerarquía constitucional que los Organos Legislativo, Ejecutivo y Electoral y se relaciona con estos sobre la base de independencia, separación, coordinación y cooperación.",
      "ARTICULO 11. (Gratuidad). El acceso a la administración de justicia es gratuito, sin costo alguno para el pueblo boliviano, siendo esta la condición para hacer realidad el acceso a la justicia en condiciones de igualdad.",
      "ARTICULO 38. (Atribuciones de las Salas Especializadas). Las Salas Especializadas del Tribunal Supremo de Justicia, de acuerdo a las materias de su competencia, conocen y resuelven los recursos de casación y los recursos de nulidad.",
    ],
  },
  {
    carpeta: "ACTUALIZADA",
    efecto: "M",
    tipo: "L",
    numero: "025",
    fecha: "24-06-2010",
    titulo: "Ley del Organo Judicial Texto Actualizado",
    objeto: "Estructura del Organo Judicial con reformas de la Ley 929 y jurisprudencia",
    materia: "Derecho Constitucional",
    cuerpo: [
      "TEXTO ACTUALIZADO que incorpora las modificaciones de la Ley 929 de 27 de abril de 2017 sobre la conformación de las Salas del Tribunal Supremo de Justicia y del Consejo de la Magistratura.",
      "ARTICULO 1. (Objeto). La presente Ley tiene por objeto regular la estructura, organización y funcionamiento del Organo Judicial.",
      "ARTICULO 33. Modificado. El Tribunal Supremo de Justicia está conformado por nueve Magistradas o Magistrados titulares y nueve suplentes, elegidos mediante sufragio universal.",
      "CONCORDANCIAS: Sentencias Constitucionales Plurinacionales 2170/2013 y 0084/2017 sobre independencia judicial y carrera judicial.",
    ],
  },
  {
    carpeta: "EMITIDA",
    efecto: "V",
    tipo: "L",
    numero: "348",
    fecha: "09-03-2013",
    titulo: "Ley Integral para Garantizar a las Mujeres una Vida Libre de Violencia",
    objeto: "Prevención atención protección y reparación a mujeres en situación de violencia",
    materia: "Derecho Penal",
    cuerpo: [
      "ARTICULO 1. (Marco Constitucional). La presente Ley se funda en el mandato constitucional y en los Instrumentos, Tratados y Convenios Internacionales de Derechos Humanos ratificados por Bolivia, que garantizan a todas las personas, en particular a las mujeres, el derecho a no sufrir violencia física, sexual y psicológica.",
      "ARTICULO 2. (Objeto y Finalidad). La presente Ley tiene por objeto establecer mecanismos, medidas y políticas integrales de prevención, atención, protección y reparación a las mujeres en situación de violencia, así como la persecución y sanción a los agresores.",
      "ARTICULO 7. (Tipos de Violencia contra las Mujeres). Se reconocen dieciséis tipos de violencia: física, feminicida, psicológica, mediática, simbólica, contra la dignidad, sexual, contra los derechos reproductivos, en servicios de salud, patrimonial y económica, laboral, en el sistema educativo, en el ejercicio político, institucional, en la familia y contra los derechos y la libertad sexual.",
      "ARTICULO 84. (Nuevos Tipos Penales). Se incorpora al Código Penal el tipo penal de feminicidio, sancionado con pena de presidio de treinta años sin derecho a indulto.",
    ],
  },
  {
    carpeta: "EMITIDA",
    efecto: "A",
    tipo: "DS",
    numero: "21060",
    fecha: "29-08-1985",
    titulo: "Nueva Política Económica",
    objeto: "Estabilización económica libre contratación y régimen cambiario",
    materia: "Derecho Laboral",
    cuerpo: [
      "ARTICULO 1. Se establece un régimen de tipo de cambio único, real y flexible del peso boliviano frente al dólar estadounidense, cuyo valor será fijado en subasta pública por el Banco Central de Bolivia.",
      "ARTICULO 55. Las empresas y entidades del sector público y privado podrán libremente convenir o rescindir contratos de trabajo con estricta sujeción a la Ley General del Trabajo y su Decreto Reglamentario.",
      "NOTA HISTORICA: Este Decreto Supremo marcó el fin del modelo de capitalismo de Estado en Bolivia y fue posteriormente abrogado. Se conserva en la biblioteca por su relevancia histórica y jurisprudencial en materia laboral, especialmente respecto a la libre contratación.",
    ],
  },
  {
    carpeta: "EMITIDA",
    efecto: "A",
    tipo: "RND",
    numero: "10-0016-07",
    fecha: "18-05-2007",
    titulo: "Nuevo Sistema de Facturación",
    objeto: "Modalidades de facturación y registro de operaciones ante el SIN",
    materia: "Derecho Tributario",
    cuerpo: [
      "ARTICULO 1. (Objeto). Reglamentar las modalidades de facturación, los procedimientos y requisitos para la emisión de facturas, notas fiscales y documentos equivalentes, así como los registros que deben llevar los sujetos pasivos del IVA.",
      "ARTICULO 4. (Modalidades de Facturación). Se establecen las modalidades de facturación manual, prevalorada, computarizada, oficina virtual, electrónica web y electrónica por ciclos.",
      "ARTICULO 41. (Validez de las Facturas). Las facturas, notas fiscales o documentos equivalentes generarán crédito fiscal para los sujetos pasivos del IVA cuando cumplan los requisitos establecidos en la presente Resolución.",
      "NOTA: Resolución posteriormente sustituida por el Sistema de Facturación Electrónica; se conserva por su valor de consulta histórica.",
    ],
  },
  {
    carpeta: "EMITIDA",
    efecto: "V",
    tipo: "SC",
    numero: "0084-2017",
    fecha: "28-11-2017",
    titulo: "Sentencia Constitucional Plurinacional sobre Aplicación Preferente",
    objeto: "Control de constitucionalidad y aplicación preferente de derechos politicos",
    materia: "Derecho Constitucional",
    cuerpo: [
      "SENTENCIA CONSTITUCIONAL PLURINACIONAL 0084/2017. Sucre, 28 de noviembre de 2017. Accion de inconstitucionalidad abstracta.",
      "III.3. El Tribunal Constitucional Plurinacional ejerce el control de constitucionalidad y precautela el respeto y la vigencia de los derechos y las garantías constitucionales, teniendo entre sus atribuciones conocer y resolver las acciones de inconstitucionalidad.",
      "POR TANTO: El Tribunal Constitucional Plurinacional, en su Sala Plena, resuelve declarar la APLICACION PREFERENTE de las normas invocadas conforme a los fundamentos jurídicos constitucionales desarrollados en la presente Sentencia.",
      "Los efectos de la presente Sentencia Constitucional Plurinacional son vinculantes y de cumplimiento obligatorio conforme al artículo 203 de la Constitución Política del Estado.",
    ],
  },
  {
    carpeta: "EMITIDA",
    efecto: "V",
    tipo: "AS",
    numero: "123-2019",
    fecha: "15-04-2019",
    titulo: "Auto Supremo sobre Despido Injustificado y Reincorporación",
    objeto: "Estabilidad laboral despido injustificado y derecho a la reincorporación",
    materia: "Derecho Laboral",
    cuerpo: [
      "AUTO SUPREMO 123/2019. Sala Contenciosa y Contenciosa Administrativa, Social y Administrativa. Sucre, 15 de abril de 2019.",
      "VISTOS: El recurso de casación interpuesto contra el Auto de Vista pronunciado por la Sala Social del Tribunal Departamental de Justicia, dentro del proceso laboral de reincorporación seguido por el trabajador contra la empresa demandada.",
      "CONSIDERANDO: Que el principio de estabilidad laboral consagrado en el artículo 46 de la Constitución Política del Estado protege al trabajador contra el despido injustificado, correspondiendo la reincorporación al mismo puesto de trabajo con el pago de los salarios devengados cuando el despido no obedezca a causal legal justificada.",
      "POR TANTO: Se declara INFUNDADO el recurso de casación, manteniendo firme la orden de reincorporación del trabajador con el pago de sueldos devengados y demás derechos sociales.",
    ],
  },
  {
    carpeta: "EMITIDA",
    efecto: "V",
    tipo: "DL",
    numero: "14379",
    fecha: "25-02-1977",
    titulo: "Código de Comercio",
    objeto: "Regulación de las relaciones jurídicas derivadas de la actividad comercial",
    materia: "Derecho Comercial",
    cuerpo: [
      "ARTICULO 1. (Alcance de la Ley). El Código de Comercio regula las relaciones jurídicas derivadas de la actividad comercial. En los casos no regulados expresamente, se aplicarán por analogía las normas de este Código y, en su defecto, las del Código Civil.",
      "ARTICULO 4. (Concepto de Comerciante). Comerciante es la persona habitualmente dedicada a realizar cualquier actividad comercial, con fines de lucro.",
      "ARTICULO 125. (Sociedades Comerciales). Las sociedades comerciales podrán constituirse como sociedad colectiva, sociedad en comandita simple, sociedad de responsabilidad limitada, sociedad anónima, sociedad en comandita por acciones y asociación accidental o de cuentas en participación.",
      "ARTICULO 786. (Contrato de Seguro). Por el contrato de seguro el asegurador se obliga a indemnizar un daño o a cumplir la prestación convenida al producirse la eventualidad prevista.",
    ],
  },
  {
    carpeta: "ACTUALIZADA",
    efecto: "M",
    tipo: "DL",
    numero: "14379",
    fecha: "25-02-1977",
    titulo: "Código de Comercio Texto Ordenado",
    objeto: "Código de Comercio concordado con la Ley de Empresas Sociales y normativa registral",
    materia: "Derecho Comercial",
    cuerpo: [
      "TEXTO ORDENADO Y CONCORDADO. Incluye las modificaciones sobre el registro de comercio, la Ley 1055 de Empresas Sociales y las disposiciones del Organo de Gobernanza del Registro de Comercio.",
      "ARTICULO 1. (Alcance de la Ley). El Código de Comercio regula las relaciones jurídicas derivadas de la actividad comercial.",
      "ARTICULO 29. Modificado. La inscripción en el Registro de Comercio se realiza ante la entidad pública competente conforme al procedimiento simplificado vigente.",
      "CONCORDANCIAS: Ley 779, Ley 1055, Decreto Supremo 4596 sobre el registro de comercio administrado por el Estado.",
    ],
  },
  {
    carpeta: "EMITIDA",
    efecto: "V",
    tipo: "RARJ",
    numero: "AGIT-RJ-0234-2020",
    fecha: "10-02-2020",
    titulo: "Resolución de Recurso Jerárquico sobre Determinación Tributaria",
    objeto: "Recurso jerárquico contra resolución determinativa por IVA e IT",
    materia: "Derecho Tributario",
    cuerpo: [
      "RESOLUCION DE RECURSO JERARQUICO AGIT-RJ 0234/2020. La Paz, 10 de febrero de 2020. Autoridad General de Impugnación Tributaria.",
      "VISTOS: El Recurso Jerárquico interpuesto por el contribuyente contra la Resolución del Recurso de Alzada, emitida por la Autoridad Regional de Impugnación Tributaria, relativa a la Resolución Determinativa por el Impuesto al Valor Agregado y el Impuesto a las Transacciones.",
      "CONSIDERANDO: Que la Administración Tributaria estableció reparos por depuración de crédito fiscal IVA al evidenciar que las facturas observadas no cuentan con respaldo de medios fehacientes de pago conforme al artículo 37 del Decreto Supremo 27310.",
      "POR TANTO: La Autoridad General de Impugnación Tributaria resuelve CONFIRMAR la Resolución del Recurso de Alzada, manteniendo firme y subsistente la Resolución Determinativa de la Administración Tributaria.",
    ],
  },
];

function fechaAIso(fecha) {
  const [dia, mes, anio] = fecha.split("-");
  return `${anio}-${mes}-${dia}`;
}

function nombreArchivo(norma) {
  const { efecto, tipo, numero, fecha, titulo, objeto, materia } = norma;
  return `${efecto}; ${tipo}; ${numero}; ${fecha}; ${titulo}; ${objeto}; ${materia}.pdf`;
}

function ajustarLineas(texto, fuente, tamano, anchoMaximo) {
  const palabras = texto.split(" ");
  const lineas = [];
  let lineaActual = "";

  for (const palabra of palabras) {
    const tentativa = lineaActual === "" ? palabra : `${lineaActual} ${palabra}`;
    if (fuente.widthOfTextAtSize(tentativa, tamano) <= anchoMaximo) {
      lineaActual = tentativa;
    } else {
      if (lineaActual !== "") lineas.push(lineaActual);
      lineaActual = palabra;
    }
  }
  if (lineaActual !== "") lineas.push(lineaActual);

  return lineas;
}

async function generarPdf(norma) {
  const documento = await PDFDocument.create();
  const fuente = await documento.embedFont(StandardFonts.TimesRoman);
  const fuenteNegrita = await documento.embedFont(StandardFonts.TimesRomanBold);

  const anchoPagina = 595.28;
  const altoPagina = 841.89;
  const margen = 64;
  const anchoUtil = anchoPagina - margen * 2;

  let pagina = documento.addPage([anchoPagina, altoPagina]);
  let y = altoPagina - margen;

  const centrar = (texto, tam, tipoFuente) => (anchoPagina - tipoFuente.widthOfTextAtSize(texto, tam)) / 2;

  const encabezado = "ESTADO PLURINACIONAL DE BOLIVIA";
  pagina.drawText(encabezado, {
    x: centrar(encabezado, 12, fuenteNegrita),
    y,
    size: 12,
    font: fuenteNegrita,
    color: rgb(0.1, 0.1, 0.25),
  });
  y -= 22;

  const subtitulo = `${norma.tipo} ${norma.numero} de ${norma.fecha.replaceAll("-", "/")}`;
  pagina.drawText(subtitulo, {
    x: centrar(subtitulo, 11, fuente),
    y,
    size: 11,
    font: fuente,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 30;

  for (const linea of ajustarLineas(norma.titulo.toUpperCase(), fuenteNegrita, 15, anchoUtil)) {
    pagina.drawText(linea, { x: centrar(linea, 15, fuenteNegrita), y, size: 15, font: fuenteNegrita });
    y -= 20;
  }

  y -= 4;
  pagina.drawLine({
    start: { x: margen, y },
    end: { x: anchoPagina - margen, y },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 26;

  for (const parrafo of norma.cuerpo) {
    const lineas = ajustarLineas(parrafo, fuente, 11, anchoUtil);
    for (const linea of lineas) {
      if (y < margen + 20) {
        pagina = documento.addPage([anchoPagina, altoPagina]);
        y = altoPagina - margen;
      }
      pagina.drawText(linea, { x: margen, y, size: 11, font: fuente, lineHeight: 15 });
      y -= 15;
    }
    y -= 10;
  }

  return documento.save();
}

async function principal() {
  const cliente = new pg.Client({ connectionString: cadenaConexion });
  await cliente.connect();

  let insertados = 0;
  let omitidos = 0;

  try {
    for (const norma of NORMAS) {
      const nombre = nombreArchivo(norma);
      const pdf = Buffer.from(await generarPdf(norma));
      const contenidoTexto = `${norma.titulo}\n\n${norma.cuerpo.join("\n\n")}`;

      const { rowCount } = await cliente.query(
        `
        INSERT INTO public.normativas (
          carpeta, efecto, tipo_norma, numero, fecha_promulgacion, titulo,
          objeto_resumido, materia, nombre_archivo, extension, mime_type,
          tamano_bytes, contenido_texto, archivo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pdf', 'application/pdf', $10, $11, $12)
        ON CONFLICT ON CONSTRAINT normativas_archivo_unico DO NOTHING
        `,
        [
          norma.carpeta,
          norma.efecto,
          norma.tipo,
          norma.numero,
          fechaAIso(norma.fecha),
          norma.titulo,
          norma.objeto,
          norma.materia,
          nombre,
          pdf.length,
          contenidoTexto,
          pdf,
        ],
      );

      if (rowCount === 1) {
        insertados += 1;
        console.log(`  + ${nombre}`);
      } else {
        omitidos += 1;
      }
    }

    console.log(`\nBiblioteca sembrada: ${insertados} documentos nuevos, ${omitidos} ya existentes.`);
  } finally {
    await cliente.end();
  }
}

principal().catch((error) => {
  console.error("Error al sembrar la biblioteca:", error.message);
  process.exitCode = 1;
});
