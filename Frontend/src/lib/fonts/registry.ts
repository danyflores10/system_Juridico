type FontDefinition = {
  variable: string;
};

const font = (variable: string): FontDefinition => ({ variable });

export const fontRegistry = {
  geist: {
    label: "Geist",
    font: font("--font-geist"),
  },
  inter: {
    label: "Inter",
    font: font("--font-inter"),
  },
  notoSans: {
    label: "Noto Sans",
    font: font("--font-noto-sans"),
  },
  nunitoSans: {
    label: "Nunito Sans",
    font: font("--font-nunito-sans"),
  },
  figtree: {
    label: "Figtree",
    font: font("--font-figtree"),
  },
  roboto: {
    label: "Roboto",
    font: font("--font-roboto"),
  },
  raleway: {
    label: "Raleway",
    font: font("--font-raleway"),
  },
  dmSans: {
    label: "DM Sans",
    font: font("--font-dm-sans"),
  },
  publicSans: {
    label: "Public Sans",
    font: font("--font-public-sans"),
  },
  outfit: {
    label: "Outfit",
    font: font("--font-outfit"),
  },
  geistMono: {
    label: "Geist Mono",
    font: font("--font-geist-mono"),
  },
  geistPixelSquare: {
    label: "Geist Pixel Square",
    font: font("--font-geist-pixel-square"),
  },
  jetBrainsMono: {
    label: "JetBrains Mono",
    font: font("--font-jetbrains-mono"),
  },
  notoSerif: {
    label: "Noto Serif",
    font: font("--font-noto-serif"),
  },
  robotoSlab: {
    label: "Roboto Slab",
    font: font("--font-roboto-slab"),
  },
  merriweather: {
    label: "Merriweather",
    font: font("--font-merriweather"),
  },
  lora: {
    label: "Lora",
    font: font("--font-lora"),
  },
  playfairDisplay: {
    label: "Playfair Display",
    font: font("--font-playfair-display"),
  },
} as const;

export type FontKey = keyof typeof fontRegistry;

export const fontVars = "";

export const fontOptions = (Object.entries(fontRegistry) as Array<[FontKey, (typeof fontRegistry)[FontKey]]>).map(
  ([key, f]) => ({
    key,
    label: f.label,
    variable: f.font.variable,
  }),
);
