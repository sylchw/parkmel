import {it,expect} from 'vitest';
import {signedRuleSummaries} from '../../src/lib/map/signed-rule-summary';
import type {ParkingRule} from '../../src/domain/parking/types';
const rule:ParkingRule={id:'private-rule',type:'time_limit',maxDurationMinutes:120,periods:[1,2,3,4,5].map(dayOfWeek=>({dayOfWeek,startTime:480,endTime:1080})),feeStatus:'unknown',permitCondition:'none',holidayPolicy:'excluded',source:{type:'community',identifier:'private-source',evidenceKind:'field',observedAt:'2026-10-07T00:00:00Z',submittedAt:'2026-10-07T00:00:00Z',sourceDate:null}};
function visit(day:string,hour=10){return {arrival:`${day}T${String(hour).padStart(2,'0')}:00:00+11:00`,departure:`${day}T${String(hour).padStart(2,'0')}:15:00+11:00`};}
it('summarizes the sign while distinguishing Saturday, Monday and outside hours',()=>{
 expect(signedRuleSummaries([rule],visit('2026-10-10'))).toEqual([{label:'2P · Mon–Fri only · 8am–6pm · except public holidays',active:false}]);
 expect(signedRuleSummaries([rule],visit('2026-10-12'))[0].active).toBe(true);
 expect(signedRuleSummaries([rule],visit('2026-10-12',20))[0].active).toBe(false);
 expect(JSON.stringify(signedRuleSummaries([rule],visit('2026-10-12')))).not.toMatch(/private/);
});
it('honours holidays and overlap anywhere in a visit, with exclusive end times',()=>{
 expect(signedRuleSummaries([rule],visit('2026-11-03'))[0].active).toBe(false);
 expect(signedRuleSummaries([rule],{arrival:'2026-10-12T07:55:00+11:00',departure:'2026-10-12T08:10:00+11:00'})[0].active).toBe(true);
 expect(signedRuleSummaries([rule],visit('2026-10-12',18))[0].active).toBe(false);
 expect(signedRuleSummaries([{...rule,holidayPolicy:'unknown'}],visit('2026-10-12'))[0].active).toBeNull();
});
