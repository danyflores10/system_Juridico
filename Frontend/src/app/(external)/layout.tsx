import type { ReactNode } from "react";

import type { Metadata } from "next";

import "./landing.css";

export const metadata: Metadata = {
  title: "Consultor Jurídico — Consultoría y gestión legal profesional",
  description:
    "Consultoría jurídica integral para personas y empresas: gestión de clientes, casos jurídicos, documentos legales, citas, asesorías y reportes en una plataforma segura.",
  keywords: [
    "consultor jurídico",
    "asesoría legal",
    "abogados",
    "gestión de casos",
    "documentos legales",
    "consultoría jurídica",
  ],
  openGraph: {
    title: "Consultor Jurídico | Consultoría y gestión legal profesional",
    description:
      "Protegemos sus derechos con excelencia. Asesoría legal y gestión de casos con tecnología y confidencialidad.",
    type: "website",
  },
};

export default function ExternalLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="lj-landing">{children}</div>;
}
