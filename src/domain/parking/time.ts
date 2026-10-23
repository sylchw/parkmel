import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const MELBOURNE_TZ = "Australia/Melbourne";
export type FoldDisambiguation = "earlier" | "later";
const LOCAL_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";
const DAY_MS = 86_400_000;

/** Find actual occurrences by round trip; never trust the library's fold default. */
function occurrences(localTime: string): Date[] {
  if (!LOCAL_TIME_RE.test(localTime)) return [];
  const wall = new Date(`${localTime}Z`);
  if (!Number.isFinite(wall.getTime()) ||
      wall.toISOString().slice(0, 19) !== localTime) return [];
  const seed = fromZonedTime(localTime, MELBOURNE_TZ);
  if (!Number.isFinite(seed.getTime())) return [];

  // Sample both sides of a transition to discover offsets from timezone data.
  const candidates = new Set<number>();
  for (const delta of [-DAY_MS, 0, DAY_MS]) {
    const sample = new Date(seed.getTime() + delta);
    const sampleWall = new Date(`${instantToMelbourneLocal(sample)}Z`).getTime();
    const offset = sampleWall - sample.getTime();
    const candidate = wall.getTime() - offset;
    if (instantToMelbourneLocal(new Date(candidate)) === localTime) {
      candidates.add(candidate);
    }
  }
  return [...candidates].sort((a, b) => a - b).map((value) => new Date(value));
}

/** Strict local seconds input. Invalid dates/gaps and unresolved folds return null. */
export function melbourneLocalToInstant(
  localTime: string,
  disambiguation?: FoldDisambiguation,
): Date | null {
  if (disambiguation !== undefined && disambiguation !== "earlier" &&
      disambiguation !== "later") return null;
  const matches = occurrences(localTime);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  if (disambiguation === undefined) return null;
  return disambiguation === "earlier" ? matches[0] : matches[matches.length - 1];
}

/** Format an instant as Melbourne wall-clock seconds (without an offset). */
export function instantToMelbourneLocal(instant: Date): string {
  return formatInTimeZone(instant, MELBOURNE_TZ, LOCAL_FORMAT);
}

export function isAmbiguousMelbourneLocal(localTime: string): boolean {
  return occurrences(localTime).length > 1;
}

/** Compatibility helper; the occurrence must now be selected explicitly. */
export function disambiguateMelbourneFold(localTime: string, later: boolean): Date | null {
  if (typeof later !== "boolean") return null;
  return melbourneLocalToInstant(localTime, later ? "later" : "earlier");
}
