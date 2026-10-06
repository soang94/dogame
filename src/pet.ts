export type Pet = {
  fullness: number;
  happiness: number;
  energy: number;
  sleeping: boolean;
};
export type Face = {
  uri: string;
  width: number;
  height: number;
  zoom: number;
  x: number;
  y: number;
  mode?: "circle" | "cutout";
  bottom?: number;
};
export const initialPet: Pet = {
  fullness: 80,
  happiness: 80,
  energy: 80,
  sleeping: false,
};
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function tick(p: Pet, seconds: number): Pet {
  const minutes = Math.max(0, seconds) / 60;
  return {
    ...p,
    fullness: clamp(p.fullness - minutes * 2),
    happiness: clamp(p.happiness - minutes),
    energy: clamp(p.energy + minutes * (p.sleeping ? 12 : -2)),
  };
}
export function act(p: Pet, action: "feed" | "pet" | "sleep"): Pet {
  if (action === "sleep") return { ...p, sleeping: !p.sleeping };
  if (p.sleeping) return p;
  return action === "feed"
    ? { ...p, fullness: clamp(p.fullness + 18) }
    : { ...p, happiness: clamp(p.happiness + 12) };
}
export function readPet(value: unknown): Pet {
  if (!value || typeof value !== "object") return { ...initialPet };
  const p = value as Record<string, unknown>;
  return {
    fullness: valid(p.fullness, 80),
    happiness: valid(p.happiness, 80),
    energy: valid(p.energy, 80),
    sleeping: p.sleeping === true,
  };
}
function valid(n: unknown, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? clamp(n) : fallback;
}
export function readFace(value: unknown): Face | null {
  if (!value || typeof value !== "object") return null;
  const f = value as Face;
  return typeof f.uri === "string" &&
    [f.width, f.height, f.zoom, f.x, f.y].every(Number.isFinite) &&
    f.width > 0 &&
    f.height > 0 &&
    f.zoom >= (f.mode === "cutout" ? 0.5 : 1) &&
    f.zoom <= 3
    ? constrainFace({
        ...f,
        mode: f.mode === "cutout" ? "cutout" : "circle",
        bottom: validBottom(f.bottom),
      })
    : null;
}
function validBottom(n: unknown) {
  return typeof n === "number" && Number.isFinite(n)
    ? Math.max(0.45, Math.min(1, n))
    : 0.85;
}
export function constrainFace(f: Face): Face {
  if (f.mode === "cutout")
    return {
      ...f,
      bottom: validBottom(f.bottom),
      x: Math.max(-220, Math.min(220, f.x)),
      y: Math.max(-220, Math.min(220, f.y)),
    };
  const scale = Math.max(220 / f.width, 220 / f.height) * f.zoom;
  const mx = (f.width * scale - 220) / 2,
    my = (f.height * scale - 220) / 2;
  return {
    ...f,
    x: Math.max(-mx, Math.min(mx, f.x)),
    y: Math.max(-my, Math.min(my, f.y)),
  };
}
