import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import StreetMap,{sectionOverlay,SYNTHETIC_SECTIONS} from "../../src/components/map/StreetMap";
import {mapConfiguration} from "../../src/lib/map/config";
describe("offline labelled map overlay",()=>{
 it("keeps distinct street-side geometries and category/confidence labels",()=>{
  const data=sectionOverlay(SYNTHETIC_SECTIONS);
  expect(data.features.map(f=>f.properties?.side)).toEqual(["left","right"]);
  expect(data.features[0].geometry.coordinates).not.toEqual(data.features[1].geometry.coordinates);
  expect(data.features.map(f=>f.properties?.category)).toEqual(["untimed","prohibited"]);
 });
 it("renders accessible labels, attribution and explicit invented fixture status",()=>{
  const html=renderToStaticMarkup(createElement(StreetMap));
  expect(html).toContain("Invented schematic fixture");expect(html).toContain("ParkMel synthetic fixture");
  expect(html).toContain("level 1/5");expect(html).toContain("left");expect(html).toContain("right");
 });
 it("uses no remote resources in the default configuration",()=>{
  expect(mapConfiguration().styleUrl).toBeNull();
 });
 it("rejects invalid geometry without claiming a usable section",()=>{
  expect(()=>sectionOverlay([{...SYNTHETIC_SECTIONS[0],coordinates:[[200,0],[201,0]]}])).toThrow();
 });
});
