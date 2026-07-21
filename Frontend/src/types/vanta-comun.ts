/** Tipos compartidos por las declaraciones de los efectos de Vanta.js. */

export interface InstanciaVanta {
  destroy: () => void;
  resize: () => void;
}

/** Opciones que se pasan al constructor del efecto (unión de CLOUDS2 y FOG). */
export interface OpcionesVantaCrudas {
  el: HTMLElement;
  THREE: unknown;
  mouseControls?: boolean;
  touchControls?: boolean;
  gyroControls?: boolean;
  minHeight?: number;
  minWidth?: number;
  scale?: number;
  scaleMobile?: number;
  speed?: number;
  texturePath?: string;
  // CLOUDS2
  skyColor?: number;
  cloudColor?: number;
  lightColor?: number;
  backgroundColor?: number;
  // FOG
  highlightColor?: number;
  midtoneColor?: number;
  lowlightColor?: number;
  baseColor?: number;
  blurFactor?: number;
  zoom?: number;
}
