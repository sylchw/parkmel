import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import ResultsList from "../../src/components/map/ResultsList";
import type {EvaluatedSection} from "../../src/components/map/ResultsList";
import {evidenceAge} from "../../src/components/map/SectionSheet";
const section:EvaluatedSection={signedRules:[],sectionId:"fixture",geometryVersion:1,streetName:"Invented street",side:"left",startDescription:"Fixture A",endDescription:"Fixture B",geometry:{type:"LineString",coordinates:[]},parkingDisplay:{category:"untimed",payment:"free",maxDurationMinutes:null,stayExceeded:false},eligibility:"eligible_free",reasonCodes:["allowed"],explanation:"Entire stay is free",earliestTransition:null,confidenceLevel:3,lastVerifiedAt:"2026-10-07T00:00:00Z",sourceDates:[{observedAt:"2026-10-06T00:00:00Z",sourceDate:"2026-10-01",evidenceKind:"field"}]};
const render=(sections:EvaluatedSection[],selectedId:string|null)=>renderToStaticMarkup(createElement(ResultsList,{sections,selectedId,onSelect:()=>{},evaluatedAt:"2026-10-07T00:00:00Z"}));
describe("accessible evaluated section details",()=>{
 it("shows textual category, endpoints, reason, confidence and source age",()=>{
  const html=render([section],"fixture");
  for(const text of ["Free for the selected stay","Fixture A to Fixture B","Entire stay is free","Confidence: 3/5","6 days old at evaluation","Space occupancy is unknown"]) expect(html).toContain(text);
  expect(html).toContain('aria-pressed="true"');expect(html).toContain('aria-label="Selected section details"');
 });
 it("keeps missing selection explicit rather than replacing it",()=>{expect(render([],"fixture")).toContain("Your selection is retained");});
 it("uses oldest image/observation date and fails closed for invalid/future age",()=>{
  expect(evidenceAge("2026-10-06T00:00:00Z","2026-10-01","2026-10-07T00:00:00Z")).toBe("6 days old at evaluation");
  expect(evidenceAge("bad",null,"bad")).toBe("Age unknown");
  expect(evidenceAge("2027-01-01T00:00:00Z",null,"2026-10-07T00:00:00Z")).toBe("Age unknown");
 });
});
