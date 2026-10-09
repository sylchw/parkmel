import type {QuickEntry} from "./quick-entry";
import type { ParkingSchedule } from "../parking/types";
import { validateParkingSchedule } from "../parking/validation";
import { canonicalPayload } from "./canonicalize";
export interface AnnotationPanel {
  id: string; text: string; arrow: "left" | "right" | "both" | "none" | "unknown"; ruleIds: string[];
}
export interface AnnotationDraft {
  quickEntry?: QuickEntry;
  schemaVersion: 1; sectionId: string; geometryVersion: number;
  side: "left" | "right" | "unknown"; startDescription: string; endDescription: string;
  allPanelsAndBoundariesChecked: boolean; panels: AnnotationPanel[]; schedule: unknown;
}
export interface DraftValidation {
  validDraft: boolean; publishable: boolean; errors: string[]; canonical: string | null;
}
const obj = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
/** Incomplete form values can be saved. Publication always validates the complete schedule. */
export function validateAnnotationDraft(input: unknown,
  section: { sectionId: string; geometryVersion: number }, approvedSourceIds: readonly string[] = []): DraftValidation {
  const bad = (errors: string[]): DraftValidation => ({ validDraft: false, publishable: false, errors, canonical: null });
  if (!obj(input) || input.schemaVersion !== 1 || !text(input.sectionId) || !input.sectionId.trim() ||
      !Number.isSafeInteger(input.geometryVersion) || (input.geometryVersion as number) < 1 ||
      !["left", "right", "unknown"].includes(input.side as string) || !text(input.startDescription) ||
      !text(input.endDescription) || typeof input.allPanelsAndBoundariesChecked !== "boolean" || !Array.isArray(input.panels)) {
    return bad(["Invalid draft envelope"]);
  }
  if (!input.panels.every(panel => obj(panel) && text(panel.id) && panel.id.trim() && text(panel.text) &&
      ["left", "right", "both", "none", "unknown"].includes(panel.arrow as string) &&
      Array.isArray(panel.ruleIds) && panel.ruleIds.every(id => text(id) && id.trim()))) return bad(["Invalid sign panel"]);
  const draft = input as unknown as AnnotationDraft;
  if (new Set(draft.panels.map(p => p.id)).size !== draft.panels.length) return bad(["Duplicate panel IDs"]);
  const errors: string[] = [];
  if (draft.sectionId !== section.sectionId || draft.geometryVersion !== section.geometryVersion) errors.push("Section geometry changed; review the retained draft");
  if (draft.side === "unknown" || !draft.startDescription.trim() || !draft.endDescription.trim()) errors.push("Street side and both endpoints must be known");
  if (!draft.allPanelsAndBoundariesChecked) errors.push("All panels and boundaries must be deliberately checked");
  if (!draft.panels.length || draft.panels.some(p => !p.text.trim() || p.arrow === "unknown" || !p.ruleIds.length)) errors.push("Every sign panel needs text, extent and interpreted rules");
  const checked = validateParkingSchedule(draft.schedule);
  errors.push(...checked.errors);
  let canonical: string | null = null;
  if (checked.valid) {
    const schedule = draft.schedule as ParkingSchedule;
    // Whole-section prohibitions cannot also explicitly permit parking at the same time.
    const permission=schedule.rules.filter(rule=>['free','fee','time_limit'].includes(rule.type));
    const restrictions=schedule.rules.filter(rule=>['no_stopping','no_parking','towaway','clearway'].includes(rule.type)&&(!rule.extent||rule.extent.start===0&&rule.extent.end===1));
    if(permission.some(rule=>restrictions.some(cut=>!(rule.holidayPolicy==='applies'&&cut.holidayPolicy==='excluded')&&rule.periods.some(p=>cut.periods.some(q=>p.dayOfWeek===q.dayOfWeek&&p.startTime<q.endTime&&q.startTime<p.endTime)))))errors.push('Parking permission conflicts with a whole-section restriction. Adjust overlapping days or hours.');
    if (schedule.sectionId !== draft.sectionId || schedule.geometryVersion !== draft.geometryVersion) errors.push("Schedule identity differs from draft");
    if (schedule.completeness !== "complete" || schedule.coverage !== "full_schedule") errors.push("Schedule is not complete");
    const ids = new Set(schedule.rules.map(rule => rule.id));
    const panelIds = new Set(draft.panels.flatMap(panel => panel.ruleIds));
    if ([...ids].some(id => !panelIds.has(id)) || [...panelIds].some(id => !ids.has(id))) errors.push("Every panel rule must match the complete schedule");
    for (const rule of schedule.rules) {
      if (rule.source.evidenceKind === "unknown" || (!["field","community_entry"].includes(rule.source.evidenceKind) && !approvedSourceIds.includes(rule.source.identifier))) {
        errors.push("Non-field source needs explicit reuse approval");
      }
    }
    if (!errors.length) canonical = canonicalPayload(schedule);
  }
  return { validDraft: true, publishable: errors.length === 0, errors, canonical };
}
