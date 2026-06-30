import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Consultor Jurídico",
  version: packageJson.version,
  copyright: `© ${currentYear}, Consultor Jurídico.`,
  meta: {
    title: "Consultor Jurídico - Sistema integral para gestión legal",
    description:
      "Consultor Jurídico es una plataforma full stack para gestionar clientes, expedientes, audiencias, documentos, tareas y honorarios desde un panel profesional.",
  },
};
