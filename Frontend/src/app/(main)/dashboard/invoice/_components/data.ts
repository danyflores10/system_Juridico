import { addDays, format } from "date-fns";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTaxOption {
  id: string;
  name: string;
  rate: number;
}

export type InvoiceDiscountType = "fixed" | "percent";

export const INVOICE_PAPER_WIDTH = 816;
export const INVOICE_PAPER_HEIGHT = 1056;
export const INVOICE_PAPER_SCALE = 0.6;

export interface InvoiceFromDetails {
  name: string;
  email: string;
  phone: string;
  website: string;
  addressLines: string[];
  taxId: string;
  paymentAccountName: string;
  routingNumber: string;
  issuerName: string;
}

export interface InvoiceToDetails {
  id: string;
  name: string;
  email: string;
  addressLines: string[];
  taxId: string;
}

export interface InvoiceFormValues {
  referenceNumber: string;
  issuedDate: string;
  paymentDueDate: string;
  from: InvoiceFromDetails;
  to: InvoiceToDetails;
  taxId: string;
  discountType: InvoiceDiscountType;
  discountValue: number;
  items: InvoiceLineItem[];
}

const today = new Date();

export const defaultInvoiceValues: InvoiceFormValues = {
  referenceNumber: "FL-0425",
  issuedDate: format(today, "yyyy-MM-dd"),
  paymentDueDate: format(addDays(today, 14), "yyyy-MM-dd"),
  from: {
    name: "Consultor Jurídico",
    email: "contacto@consultorjuridico.local",
    phone: "+591 700 00000",
    website: "consultorjuridico.local",
    addressLines: ["Oficina central", "La Paz, Bolivia"],
    taxId: "NIT-1029384756",
    paymentAccountName: "Cuenta profesional",
    routingNumber: "000-123456789",
    issuerName: "Daniel Wilson Flores",
  },
  to: {
    id: "grupo-altura",
    name: "Grupo Altura S.R.L.",
    email: "administracion@grupoaltura.bo",
    addressLines: ["Av. Arce 2450", "La Paz, Bolivia"],
    taxId: "NIT-4829102018",
  },
  taxId: "vat",
  discountType: "fixed",
  discountValue: 40,
  items: [
    {
      id: "asesoria",
      description: "Asesoría jurídica mensual",
      quantity: 1,
      unitPrice: 3500,
    },
    {
      id: "documentos",
      description: "Elaboración y revisión de documentos legales",
      quantity: 2,
      unitPrice: 750,
    },
    {
      id: "representacion",
      description: "Representación y seguimiento procesal",
      quantity: 1,
      unitPrice: 400,
    },
  ],
};

export const invoiceTaxOptions: InvoiceTaxOption[] = [
  {
    id: "gst",
    name: "IVA",
    rate: 18,
  },
  {
    id: "vat",
    name: "IVA reducido",
    rate: 12,
  },
  {
    id: "service-tax",
    name: "Impuesto al servicio",
    rate: 10,
  },
  {
    id: "none",
    name: "Sin impuesto",
    rate: 0,
  },
];

export const invoiceClients: InvoiceToDetails[] = [
  {
    id: "constructora-horizonte",
    name: "Constructora Horizonte S.A.",
    email: "contabilidad@horizonte.bo",
    addressLines: ["Av. Ballivián 1820", "La Paz, Bolivia"],
    taxId: "NIT-842938475",
  },
  defaultInvoiceValues.to,
  {
    id: "inversiones-andinas",
    name: "Inversiones Andinas Ltda.",
    email: "finanzas@inversionesandinas.bo",
    addressLines: ["Calle 21 de Calacoto 780", "La Paz, Bolivia"],
    taxId: "NIT-219384756",
  },
];

export function getLineAmount(item?: InvoiceLineItem) {
  if (!item) return 0;

  const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
  const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;

  return quantity * unitPrice;
}

export function getInvoiceItems(invoice: InvoiceFormValues) {
  return invoice.items;
}

export function getInvoiceSubtotal(invoice: InvoiceFormValues) {
  return getInvoiceItems(invoice).reduce((subtotal, item) => subtotal + getLineAmount(item), 0);
}

export function getInvoiceTaxOption(invoice: InvoiceFormValues) {
  return invoiceTaxOptions.find((taxOption) => taxOption.id === invoice.taxId) ?? invoiceTaxOptions[0];
}

export function getInvoiceTax(invoice: InvoiceFormValues) {
  const taxRate = getInvoiceTaxOption(invoice).rate;

  return Math.max(getInvoiceSubtotal(invoice) - getInvoiceDiscount(invoice), 0) * (taxRate / 100);
}

export function getInvoiceDiscount(invoice: InvoiceFormValues) {
  const subtotal = getInvoiceSubtotal(invoice);
  const discountValue = Number.isFinite(invoice.discountValue) ? invoice.discountValue : 0;
  const discount = invoice.discountType === "percent" ? subtotal * (discountValue / 100) : discountValue;

  return Math.min(Math.max(discount, 0), subtotal);
}

export function getInvoiceTotal(invoice: InvoiceFormValues) {
  return Math.max(getInvoiceSubtotal(invoice) - getInvoiceDiscount(invoice), 0) + getInvoiceTax(invoice);
}
