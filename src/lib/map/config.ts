export interface MapEnvironment {
  NEXT_PUBLIC_MAP_MODE?: string;
  NEXT_PUBLIC_MAP_PROVIDER_ENABLED?: string;
  NEXT_PUBLIC_MAP_STYLE_URL?: string;
  NEXT_PUBLIC_MAP_PROVIDER_CREDIT?: string;
  NEXT_PUBLIC_MAP_FREE_PLAN_CONFIRMED?: string;
}
export const OSM_ATTRIBUTION = '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>';
export type MapConfiguration = {
  renderer: "maplibre";
  pitch: 0;
  terrain: false;
  automaticPaidUpgrade: false;
  fallback: "coverage_list";
} & ({ mode: "schematic"; label: string; styleUrl: null; attribution: string }
  | { mode: "live"; label: string; styleUrl: string; attribution: string });
/** Pure configuration only. Operators supply licensed free-plan styles at integration. */
export function mapConfiguration(env: MapEnvironment = {}): MapConfiguration {
  const common = { renderer: "maplibre" as const, pitch: 0 as const,
    terrain: false as const, automaticPaidUpgrade: false as const, fallback: "coverage_list" as const };
  if (!env.NEXT_PUBLIC_MAP_MODE || env.NEXT_PUBLIC_MAP_MODE === "schematic" ||
      env.NEXT_PUBLIC_MAP_PROVIDER_ENABLED !== "true") {
    return { ...common, mode: "schematic", label: "Invented schematic fixture — not surveyed parking",
      styleUrl: null, attribution: "ParkMel synthetic fixture" };
  }
  if (env.NEXT_PUBLIC_MAP_MODE !== "live") throw new Error("Unsupported map mode");
  if (env.NEXT_PUBLIC_MAP_FREE_PLAN_CONFIRMED !== "true") {
    throw new Error("Operator must confirm a licensed free plan with quota stop");
  }
  const url = new URL(env.NEXT_PUBLIC_MAP_STYLE_URL ?? "");
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Map style requires HTTPS without embedded credentials");
  }
  const credit = env.NEXT_PUBLIC_MAP_PROVIDER_CREDIT?.trim();
  if (!credit || /[<>&]/.test(credit)) throw new Error("Provider credit must be plain text");
  return { ...common, mode: "live", label: "OpenStreetMap base map — parking is a separate overlay",
    styleUrl: url.href, attribution: `${OSM_ATTRIBUTION} · ${credit}` };
}
