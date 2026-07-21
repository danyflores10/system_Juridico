/**
 * Vanta.js no publica tipos. Se declaran solo los efectos que usamos, con las
 * opciones documentadas en vantajs.com.
 */
declare module "vanta/dist/vanta.clouds2.min" {
  const CLOUDS2: (opciones: import("./vanta-comun").OpcionesVantaCrudas) => import("./vanta-comun").InstanciaVanta;
  export default CLOUDS2;
}

declare module "vanta/dist/vanta.fog.min" {
  const FOG: (opciones: import("./vanta-comun").OpcionesVantaCrudas) => import("./vanta-comun").InstanciaVanta;
  export default FOG;
}
