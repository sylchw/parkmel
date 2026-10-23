import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {streetViewUrl} from "../../src/lib/map/street-view-url";
import StreetViewLink from "../../src/components/map/StreetViewLink";
describe("external coordinate Street View link",()=>{
 it("encodes latitude first with api=1 and panorama action",()=>{
  const url=new URL(streetViewUrl(145.056,-37.886));
  expect(url.origin).toBe("https://www.google.com");expect(url.searchParams.get("api")).toBe("1");
  expect(url.searchParams.get("map_action")).toBe("pano");expect(url.searchParams.get("viewpoint")).toBe("-37.886,145.056");
 });
 it("rejects nonfinite and out-of-world coordinates",()=>{
  for(const [lng,lat] of [[NaN,0],[0,Infinity],[181,0],[0,-91]]) expect(()=>streetViewUrl(lng,lat)).toThrow();
 });
 it("opens a protected new tab and explains draft retention and source age",()=>{
  const html=renderToStaticMarkup(createElement(StreetViewLink,{longitude:145.056,latitude:-37.886}));
  expect(html).toContain('target="_blank"');expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain("Imagery may be old");expect(html).toContain("draft remain in this tab");
  expect(html).not.toMatch(/<iframe|<script|draft=/);
 });
 it("shows explicit unavailable text for invalid geometry",()=>{
  expect(renderToStaticMarkup(createElement(StreetViewLink,{longitude:NaN,latitude:0}))).toContain("coordinates unknown");
 });
});
