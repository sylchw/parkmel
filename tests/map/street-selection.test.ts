import {it,expect} from 'vitest';
import {matchingStreetSections,streetSelectionError,hasLocalExtent,MAX_STREET_SELECTION} from '../../src/lib/map/street-selection';
import {streetSelectionOutline} from '../../src/lib/map/street-selection-outline';
import type {StreetSide} from '../../src/lib/map/street-index';
const side=(id:string,name='Test Road',edge:'left'|'right'='left'):StreetSide=>({id,properties:{sectionId:id,segmentId:'segment',geometryVersion:1,name,side:edge,startDescription:'A',endDescription:'B',direction:'A towards B'},geometry:{type:'LineString',coordinates:[[145,-38],[145,-37.999]]}});
const a=side('a'),b=side('b','Test Road','right'),c=side('c','Other Road'),lookup=(id:unknown)=>[a,b,c].find(s=>s.id===id);
it('finds both sides of the same named street, without treating all unnamed roads as one street',()=>{expect(matchingStreetSections(a,[a,b,c]).map(s=>s.id)).toEqual(['a','b']);const unnamed=side('u','Unnamed road');expect(matchingStreetSections(unnamed,[unnamed,side('v','Unnamed road')])).toEqual([unnamed]);});
it('rejects unknown, duplicate, mixed-street, missing-source and oversized selections',()=>{expect(streetSelectionError(a,['a','b'],lookup)).toBeNull();for(const ids of [null,[],['b'],['a','a'],['a','missing'],['a','c'],Array(MAX_STREET_SELECTION+1).fill('a')])expect(streetSelectionError(a,ids,lookup)).not.toBeNull();});
it('identifies local extents without treating a whole-section extent as local',()=>{expect(hasLocalExtent({rules:[{extent:{start:0,end:.1}}]})).toBe(true);expect(hasLocalExtent({rules:[{extent:{start:0,end:1}},{}]})).toBe(false);expect(hasLocalExtent(null)).toBe(false);});
it('puts both sides in one tile viewport, separated correctly, without connecting independent sections',()=>{const view=streetSelectionOutline([a,b]);expect(view.tiles.length).toBeLessThanOrEqual(6);expect(view.lines).toHaveLength(2);expect(view.lines[0].points).toHaveLength(2);expect(view.lines[0].points[0][0]).toBeLessThan(view.lines[1].points[0][0]);expect(view.lines[0].points[0][1]).toBeCloseTo(view.lines[1].points[0][1]);});

it('enforces the batch cap even when every target is unique, registered and on the same street',()=>{const ids=['a',...Array.from({length:MAX_STREET_SELECTION},(_,i)=>`extra-${i}`)];expect(streetSelectionError(a,ids,id=>side(String(id)))).not.toBeNull();});
