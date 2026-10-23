import {describe,it,expect} from "vitest";
import {houseNumber,addressSearchUrl,addressResults} from "../../src/lib/map/address-search";
const feature=(number="123",coordinates=[145.056,-37.886])=>({geometry:{type:"Point",coordinates},properties:{housenumber:number,street:"Example Road",district:"Carnegie",city:"Melbourne",countrycode:"AU"}});
describe("numbered address search",()=>{
 it("keeps house numbers, suffixes and units in the query",()=>{expect(houseNumber("123 Example Road")).toBe("123");expect(houseNumber("12A Koornang Road")).toBe("12A");expect(houseNumber("2/123 Example Road")).toBe("2/123");expect(houseNumber("Example Road")).toBeNull();const url=new URL(addressSearchUrl("123 Example Road"));expect(url.searchParams.get("q")).toBe("123 Example Road");expect(url.searchParams.get("countrycode")).toBe("AU");expect(url.searchParams.get("bbox")).toBe("144.4,-38.5,146,-37.3");expect(()=>addressSearchUrl("a".repeat(101))).toThrow();});
 it("uses supplied coordinates and distinguishes the locality",()=>{expect(addressResults({features:[feature(),feature()]},"123 Example Road")).toEqual([{label:"123 Example Road, Carnegie, Melbourne",center:[145.056,-37.886]}]);});
 it("never substitutes a road centre or a different number for an address",()=>{expect(addressResults({features:[feature("1102"),{geometry:{type:"Point",coordinates:[145.05,-37.88]},properties:{street:"Example Road",countrycode:"AU"}},feature("123",[0,0]),feature("123",[NaN,-37.88])]},"123 Example Road")).toEqual([]);expect(()=>addressResults({},"123 Example Road")).toThrow();});
});
