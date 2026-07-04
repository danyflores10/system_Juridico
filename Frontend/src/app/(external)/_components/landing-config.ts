/**
 * Datos de contacto y enlaces de la landing de Consultor Jurídico.
 * Número local: 62323499 — se asume código de país +591 (Bolivia).
 * Si el país es otro, basta con cambiar WHATSAPP_NUMBER aquí.
 */
export const WHATSAPP_LOCAL = "62323499";
export const WHATSAPP_NUMBER = "59162323499";
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

export const LOGIN_URL = "/auth/v2/login";

export function whatsappMessageLink(message: string): string {
  return `${WHATSAPP_LINK}?text=${encodeURIComponent(message)}`;
}
