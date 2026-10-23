import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect} from "vitest";
import StreetPopupContent,{annotationReturnPath} from "../../src/components/map/StreetPopupContent";
import type {StreetPopupInfo} from "../../src/components/map/StreetPopupContent";
const info:StreetPopupInfo={key:"fixture",streetName:"Invented road",ruleLabel:"2P · Metered / paid",unknown:false,longitude:145.056,latitude:-37.886};
const render=(patch:Partial<StreetPopupInfo>,guest=true)=>renderToStaticMarkup(createElement(StreetPopupContent,{info:{...info,...patch},guest,onDetails:()=>{},onContribute:()=>{}}));
describe("street parking popup",()=>{
 it("shows the street name and exact rule without a sign-in prompt for known rules",()=>{
  const html=render({});expect(html).toContain("Invented road");expect(html).toContain("2P · Metered / paid");expect(html).toContain("View section details");expect(html).not.toContain("Sign in to contribute");
 });
 it("shows unknown streets with sign-in and a coordinate Street View link",()=>{
  const html=render({unknown:true});expect(html).toContain("Sign in to contribute parking details");expect(html).toContain("map_action=pano");expect(html).toContain("viewpoint=-37.886%2C145.056");expect(html).toContain('rel="noopener noreferrer"');expect(html).not.toContain("View section details");
 });
 it("offers contribution directly to signed-in users",()=>{const html=render({unknown:true},false);expect(html).toContain('href="#annotations"');expect(html).not.toContain("Sign in to contribute");});
 it("escapes names and rules instead of interpreting them as HTML",()=>{const html=render({streetName:"<img src=x onerror=alert(1)>",ruleLabel:"<script>bad</script>"});expect(html).toContain("&lt;img");expect(html).not.toContain("<script>");});
 it("keeps the chosen coordinates in the sign-in return destination",()=>expect(annotationReturnPath(145.056,-37.886)).toBe("/?longitude=145.056&latitude=-37.886#annotations"));
 it("rejects invalid hyperlink coordinates",()=>expect(()=>annotationReturnPath(NaN,100)).toThrow());
});
