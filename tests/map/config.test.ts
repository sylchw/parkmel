import { describe, expect, it } from "vitest";
import { mapConfiguration, OSM_ATTRIBUTION } from "../../src/lib/map/config";
const live = { NEXT_PUBLIC_MAP_MODE: "live", NEXT_PUBLIC_MAP_PROVIDER_ENABLED: "true",
  NEXT_PUBLIC_MAP_FREE_PLAN_CONFIRMED: "true", NEXT_PUBLIC_MAP_STYLE_URL: "https://tiles.example/style.json",
  NEXT_PUBLIC_MAP_PROVIDER_CREDIT: "Example licensed provider" };
describe("map configuration", () => {
  it("needs no credentials and no external resources for the default fixture", () => {
    const config = mapConfiguration();
    expect(config.mode).toBe("schematic");
    expect(config.styleUrl).toBeNull();
    expect(config.label).toContain("Invented");
    expect(config.pitch).toBe(0);
    expect(config.terrain).toBe(false);
    expect(config.automaticPaidUpgrade).toBe(false);
  });
  it("uses schematic mode when the provider is disabled even with broken live settings", () => {
    expect(mapConfiguration({ NEXT_PUBLIC_MAP_MODE: "live" }).mode).toBe("schematic");
  });
  it("keeps live provider replaceable and attribution linked", () => {
    const config = mapConfiguration(live);
    expect(config.mode).toBe("live");
    expect(config.styleUrl).toBe(live.NEXT_PUBLIC_MAP_STYLE_URL);
    expect(config.attribution).toContain(OSM_ATTRIBUTION);
    expect(config.attribution).toContain(live.NEXT_PUBLIC_MAP_PROVIDER_CREDIT);
    expect(config.fallback).toBe("coverage_list");
  });
  it("requires explicit free-plan confirmation", () => {
    expect(() => mapConfiguration({ ...live, NEXT_PUBLIC_MAP_FREE_PLAN_CONFIRMED: "false" })).toThrow();
  });
  it.each(["http://tiles.example/style.json", "https://user:pass@tiles.example/style.json", "javascript:alert(1)", ""])(
    "rejects unsafe or missing style URL %s", (url) => {
      expect(() => mapConfiguration({ ...live, NEXT_PUBLIC_MAP_STYLE_URL: url })).toThrow();
    },
  );
  it("rejects missing credit or markup", () => {
    for (const credit of ["", "<script>alert(1)</script>"]) {
      expect(() => mapConfiguration({ ...live, NEXT_PUBLIC_MAP_PROVIDER_CREDIT: credit })).toThrow();
    }
  });
});
