import {describe,it,expect} from 'vitest';
import {COVERAGE_REGIONS,coverageAt,regionContains} from '../../src/lib/map/coverage';
import {registeredStreetSide} from '../../src/lib/server/street-registry';
import legacy from '../../public/carnegie-sections.json';
import all from '../../data/coverage-sections.json';
describe('multi-suburb coverage',()=>{
 it('includes every requested suburb and keeps valid interior centres',()=>{expect(COVERAGE_REGIONS.map(region=>region.name)).toEqual(['Carnegie','Chadstone','Bentleigh','Brighton','Malvern','Oakleigh','Clayton','Springvale','Mulgrave','Clayton South','Moorabbin','Hampton','St Kilda','Glen Waverley','Malvern East','Oakleigh South','Hawthorn']);for(const region of COVERAGE_REGIONS)expect(regionContains(region,region.center)).toBe(true);expect(coverageAt([151.2,-33.86])).toBeUndefined();expect(coverageAt([NaN,-37.88])).toBeUndefined();});
 it('preserves existing Carnegie sections byte-for-byte',()=>{const registry=new Map(all.features.map(feature=>[feature.id,feature]));for(const feature of legacy.features)expect(registry.get(feature.id)).toEqual(feature);expect(new Set(all.features.map(feature=>feature.id)).size).toBe(all.features.length);});
 it('resolves new sides on the trusted server registry',()=>{const old=new Set(legacy.features.map(feature=>feature.id));const side=all.features.find(feature=>!old.has(feature.id))!;expect(registeredStreetSide(side.id)).toEqual(side);expect(registeredStreetSide('not-registered')).toBeUndefined();});
 it('has both sides for every imported segment',()=>{const pairs=new Map<string,Set<string>>();for(const feature of all.features){const sides=pairs.get(feature.properties.segmentId)??new Set<string>();sides.add(feature.properties.side);pairs.set(feature.properties.segmentId,sides);}for(const sides of pairs.values())expect([...sides].sort()).toEqual(['left','right']);});
});
