import { describe, expect, it } from "vitest";
import { validateAnnotationDraft } from "../../src/domain/community/draft";
import type { AnnotationDraft } from "../../src/domain/community/draft";
import type { ParkingSchedule } from "../../src/domain/parking/types";
const section = { sectionId: "synthetic", geometryVersion: 1 };
function fixture(): AnnotationDraft {
  const schedule: ParkingSchedule = { schemaVersion: 1, ...section, completeness: "complete", coverage: "full_schedule",
    verification: "unverified", confidenceLevel: 1, lastVerifiedAt: null, changeState: "none",
    rules: [{ id: "r", type: "free", feeStatus: "free", permitCondition: "none", holidayPolicy: "applies",
      periods: [{ dayOfWeek: 1, startTime: 0, endTime: 1440 }], source: { type: "community", identifier: "field",
        evidenceKind: "field", observedAt: "2026-10-01T00:00:00Z", submittedAt: "2026-10-07T00:00:00Z", sourceDate: null } }] };
  return { schemaVersion: 1, ...section, side: "left", startDescription: "Fixture A", endDescription: "Fixture B",
    allPanelsAndBoundariesChecked: true, panels: [{ id: "p", text: "Synthetic free panel", arrow: "both", ruleIds: ["r"] }], schedule };
}
describe("annotation draft and publication validation", () => {
  it("accepts complete independently observed panels and returns canonical schedule", () => {
    const result = validateAnnotationDraft(fixture(), section);
    expect(result.publishable).toBe(true); expect(result.canonical).toContain('"sectionId":"synthetic"');
  });
  it("retains incomplete drafts without publishing", () => {
    const draft = { ...fixture(), side: "unknown", panels: [], schedule: null, allPanelsAndBoundariesChecked: false };
    const result = validateAnnotationDraft(draft, section);
    expect(result.validDraft).toBe(true); expect(result.publishable).toBe(false);
  });
  it.each(["text", "extent", "declaration", "missing-rule", "extra-rule", "stale-geometry"])("rejects publication with %s", missing => {
    const draft = fixture();
    if (missing === "text") draft.panels[0].text = "";
    if (missing === "extent") draft.panels[0].arrow = "unknown";
    if (missing === "declaration") draft.allPanelsAndBoundariesChecked = false;
    if (missing === "missing-rule") draft.panels[0].ruleIds = [];
    if (missing === "extra-rule") draft.panels[0].ruleIds.push("absent");
    const result = validateAnnotationDraft(draft, missing === "stale-geometry" ? { ...section, geometryVersion: 2 } : section);
    expect(result.validDraft).toBe(true); expect(result.publishable).toBe(false);
  });
  it("preserves old imagery dates and requires explicit source reuse approval", () => {
    const draft = fixture(); const source = (draft.schedule as ParkingSchedule).rules[0].source;
    source.evidenceKind = "street_view"; source.identifier = "image"; source.sourceDate = "2020-01-01";
    expect(validateAnnotationDraft(draft, section).publishable).toBe(false);
    expect(validateAnnotationDraft(draft, section, ["image"]).publishable).toBe(true);
    expect(source.sourceDate).toBe("2020-01-01"); expect(source.evidenceKind).toBe("street_view");
  });
  it.each([null, {}, { ...fixture(), panels: [null] }, { ...fixture(), panels: [fixture().panels[0], fixture().panels[0]] }])(
    "rejects malformed JSON or duplicate panel IDs", input => {
      expect(validateAnnotationDraft(input, section).validDraft).toBe(false);
    },
  );
});
