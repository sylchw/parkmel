import {describe,it,expect} from "vitest";
import index from "../../public/carnegie-sections.json";
import {searchStreetSides,searchStreets,sectionCenter,type StreetSide} from "../../src/lib/map/street-index";
import {sliceStreetLine} from "../../src/lib/map/street-geometry";
const sides=index.features as StreetSide[];
describe("junction street-side index",()=>{
 it("searches unannotated streets case-insensitively",()=>{const matches=searchStreetSides(sides,"  WOORAYL ");expect(matches.length).toBeGreaterThan(1);expect(searchStreets(sides,"  WOORAYL ").map(street=>street.name)).toEqual(["Woorayl Street"]);expect(matches.every(side=>side.properties.name.toLowerCase().includes("woorayl"))).toBe(true);expect(searchStreetSides(sides,"no such fictional street")).toEqual([]);});
 it("has one left and right identity for every junction section",()=>{const segments=new Map<string,StreetSide[]>();for(const side of sides)segments.set(side.properties.segmentId,[...(segments.get(side.properties.segmentId)??[]),side]);expect(new Set(sides.map(side=>side.id)).size).toBe(sides.length);for(const pair of segments.values()){expect(pair.map(side=>side.properties.side).sort()).toEqual(["left","right"]);expect(pair[0].geometry).toEqual(pair[1].geometry);expect(pair[0].id).not.toBe(pair[1].id);expect(sectionCenter(pair[0]).every(Number.isFinite)).toBe(true);}});
 it("splits a continuing named street into independently selectable sections",()=>{expect(new Set(searchStreetSides(sides,"Woorayl").map(side=>side.properties.segmentId)).size).toBeGreaterThan(1);});
 it("slices localized geometry by length",()=>{expect(sliceStreetLine([[0,0],[0,1],[0,3]],.25,.5)).toEqual([[0,.75],[0,1],[0,1.5]]);expect(()=>sliceStreetLine([[0,0],[0,1]],.8,.2)).toThrow();});
});
