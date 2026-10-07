import { PackId } from "../../remotion/types";

export interface DerivedPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  textColor: string;
}

// Convert hex to HSL
function hexToHsl(hex: string): [number, number, number] {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function derivePalette(
  dominantColors: string[],
  pack: PackId,
  recentPalettes: string[] = [],
  rng: () => number = Math.random
): DerivedPalette {
  const baseColor = dominantColors[0] || "#38BDF8";
  const [h, s, l] = hexToHsl(baseColor);

  const strategies = ["complementary", "analogous", "triadic", "mono-accent"];
  const strategy = strategies[Math.floor(rng() * strategies.length)];

  let bgHue = h;
  let accentHue = (h + 180) % 360;

  switch (strategy) {
    case "complementary":
      bgHue = (h + 180) % 360;
      accentHue = (h + 30) % 360;
      break;
    case "analogous":
      bgHue = (h + 40) % 360;
      accentHue = (h - 40 + 360) % 360;
      break;
    case "triadic":
      bgHue = (h + 120) % 360;
      accentHue = (h + 240) % 360;
      break;
    case "mono-accent":
    default:
      bgHue = h;
      accentHue = (h + 180) % 360;
      break;
  }

  // Generate light, pleasing paper backgrounds (l: 85-92%) to guarantee 7:1 contrast with dark ink
  const bg = hslToHex(bgHue, Math.min(s, 35), 88);
  const primary = hslToHex(h, Math.max(s, 70), 50);
  const secondary = hslToHex((h + 60) % 360, 85, 55);
  const accent = hslToHex(accentHue, 90, 52);

  return {
    id: `${pack}-${strategy}-${Math.round(h)}`,
    name: `${strategy} (${Math.round(h)}°)`,
    primary,
    secondary,
    accent,
    bg,
    textColor: "#1B1B1B",
  };
}
