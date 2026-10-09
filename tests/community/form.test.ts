import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import AnnotationForm from "../../src/components/community/AnnotationForm";
import type {AnnotationDraft} from "../../src/domain/community/draft";
const section={sectionId:"fixture",geometryVersion:1};
const draft:AnnotationDraft={schemaVersion:1,...section,side:"unknown",startDescription:"",endDescription:"",allPanelsAndBoundariesChecked:false,panels:[],schedule:null};
describe("bounded annotation draft form",()=>{
 it.each(["guest","unverified"] as const)("hides annotation controls for %s",sessionKind=>{
  const html=renderToStaticMarkup(createElement(AnnotationForm,{sessionKind,section,initialDraft:draft,onSave:async()=>{},onSubmit:async()=>{}}));
  expect(html).toContain("Anonymous contributions are disabled");expect(html).not.toContain("Save incomplete draft");expect(html).not.toContain("Exact sign text");
 });
 it("allows an admin to start an incomplete annotation without treating it as approved",()=>{
  const html=renderToStaticMarkup(createElement(AnnotationForm,{sessionKind:"admin",section,initialDraft:draft,onSave:async()=>{},onSubmit:async()=>{}}));
  expect(html).toContain("Save incomplete draft");expect(html).toMatch(/disabled="">Submit complete annotation/);
 });
 it("retains incomplete input and disables publication without inventing a free schedule",()=>{
  const html=renderToStaticMarkup(createElement(AnnotationForm,{sessionKind:"eligible",section,initialDraft:draft,onSave:async()=>{},onSubmit:async()=>{}}));
  expect(html).toContain("No free parking permission can be inferred");
  expect(html).toMatch(/disabled="">Submit complete annotation/);expect(html).toContain("Save incomplete draft");
  expect(html).toContain("Structured rule editing is not connected yet");
 });
 it("does not crash or present malformed unknown schedule JSON as rules",()=>{
  const html=renderToStaticMarkup(createElement(AnnotationForm,{sessionKind:"eligible",section,initialDraft:{...draft,schedule:{rules:[null]}},onSave:async()=>{},onSubmit:async()=>{}}));
  expect(html).toContain("Schedule incomplete");
 });
 it("makes text fields and panel completeness explicit",()=>{
  const html=renderToStaticMarkup(createElement(AnnotationForm,{sessionKind:"eligible",section,initialDraft:{...draft,panels:[{id:"p",text:"Invented incomplete text",arrow:"unknown",ruleIds:[]}]},onSave:async()=>{},onSubmit:async()=>{}}));
  expect(html).toContain("Invented incomplete text");expect(html).toContain("Exact sign text");expect(html).toContain("All visible panels and relevant boundaries checked");
 });
});
