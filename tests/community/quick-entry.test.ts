import {describe,it,expect} from 'vitest';
import {quickLimitMinutes,compileQuickDraft,newQuickRow,quickPeriods,quickEntryFrom,updateQuickRow} from '../../src/domain/community/quick-entry';
import type {QuickEntry} from '../../src/domain/community/quick-entry';
import type {AnnotationDraft} from '../../src/domain/community/draft';
import {validateAnnotationDraft} from '../../src/domain/community/draft';
import {evaluateStay} from '../../src/domain/parking/evaluate';
import {MELBOURNE_HOLIDAYS_2026 as calendar} from '../../src/domain/parking/holidays';
import type {ParkingSchedule} from '../../src/domain/parking/types';
const base:AnnotationDraft={schemaVersion:1,sectionId:'fixture',geometryVersion:1,side:'left',startDescription:'Junction A',endDescription:'Junction B',panels:[],allPanelsAndBoundariesChecked:false,schedule:null};
const parking={...newQuickRow('parking','p'),value:'2P',days:[1,2,3,4,5]};
const entry:QuickEntry={version:1,rows:[parking],holidaysApply:true};
const compile=(input=entry,confirmed=true)=>compileQuickDraft(base,input,confirmed,'2026-10-01T00:00:00Z');
describe('simple parking entry',()=>{
 it('defaults added parking periods to remaining weekdays without changing earlier rows',()=>{
  expect(newQuickRow('parking','second',[parking]).days).toEqual([6,0]);
  const weekend={...parking,days:[6,0]};expect(newQuickRow('parking','second',[weekend]).days).toEqual([1,2,3,4,5]);
  expect(newQuickRow('parking','third',[parking,weekend]).days).toEqual([]);
  expect(newQuickRow('parking','second',[{...parking,daysSpecified:false}]).days).toEqual([]);
  expect(newQuickRow('condition','condition',[parking]).days).toHaveLength(7);
  expect(parking.days).toEqual([1,2,3,4,5]);
 });
 it('starts new drafts with holiday application off and preserves saved choices',()=>{const fresh=quickEntryFrom(base);expect(fresh.holidaysApply).toBe(false);fresh.rows[0].value='2P';const result=compile(fresh);expect((result.draft.schedule as ParkingSchedule).rules[0].holidayPolicy).toBe('excluded');expect(quickEntryFrom(compile(entry).draft).holidaysApply).toBe(true);});
 it('distinguishes no printed days from all seven named weekdays',()=>{const named=newQuickRow('parking','p');expect(named.days).toHaveLength(7);expect(named.holidaysApply).toBe(false);const noDays=updateQuickRow(named,{daysSpecified:false});expect(noDays.holidaysApply).toBe(true);expect(quickPeriods({...noDays,days:[]})).toHaveLength(7);expect(updateQuickRow(noDays,{days:[1,2,3,4,5,6,0]}).holidaysApply).toBe(false);});
 it('automatically resets only the edited rule and permits explicit holiday overrides',()=>{const selected=updateQuickRow(parking,{days:[1,2,3]});expect(selected.holidaysApply).toBe(false);const explicit=updateQuickRow(selected,{holidaysApply:true});expect(explicit.holidaysApply).toBe(true);expect(updateQuickRow(explicit,{start:'08:00'}).holidaysApply).toBe(true);expect(updateQuickRow(explicit,{days:[1,2]}).holidaysApply).toBe(false);const result=compile({...entry,rows:[{...parking,holidaysApply:true},{...newQuickRow('condition','c'),days:[1],allDay:false,start:'16:00',end:'18:00'}]});expect((result.draft.schedule as ParkingSchedule).rules.map(rule=>rule.holidayPolicy)).toEqual(['applies','excluded']);});
 it('preserves older globally selected holiday choices when restoring drafts',()=>{const {daysSpecified:_days,holidaysApply:_holidays,...legacy}=parking;void _days;void _holidays;const saved={...base,quickEntry:{version:1 as const,rows:[legacy],holidaysApply:true}};expect(quickEntryFrom(saved).rows[0].holidaysApply).toBe(true);});
 it('keeps all-day permission on a holiday and applies a named-day tow-away period on ordinary days',()=>{
 const general={...updateQuickRow(newQuickRow('parking','p'),{daysSpecified:false}),value:'2P'};
 const condition={...newQuickRow('condition','c'),days:[1,2,3,4,5],allDay:false,start:'07:00',end:'09:00'};
 const result=compile({...entry,rows:[general,condition]});expect(result.errors).toEqual([]);expect(validateAnnotationDraft(result.draft,base).publishable).toBe(true);
 const schedule={...result.draft.schedule as ParkingSchedule,verification:'admin_verified' as const,confidenceLevel:3 as const,lastVerifiedAt:'2026-10-01T00:00:00Z'};
 for(const [date,expected] of [['2026-11-02','restricted'],['2026-11-03','eligible_free']]){
 const arrival=`${date}T08:00:00+11:00`,departure=`${date}T08:30:00+11:00`;
 expect(evaluateStay({schedule,stay:{arrival,departure},evaluatedAt:arrival,timezone:'Australia/Melbourne',vehicleContext:'ordinary_no_permit',publicHolidays:[...calendar.dates]},calendar).eligibility).toBe(expected);
 }
 });
 it('turns checked weekdays and 2P into a reviewable unverified contribution',()=>{const result=compile();expect(result.errors).toEqual([]);expect(validateAnnotationDraft(result.draft,base).publishable).toBe(true);const schedule=result.draft.schedule as ParkingSchedule;expect(schedule.verification).toBe('unverified');expect(schedule.rules[0].maxDurationMinutes).toBe(120);expect(schedule.rules[0].periods.map(p=>p.dayOfWeek)).toEqual([1,2,3,4,5]);expect(schedule.rules[0].source.evidenceKind).toBe('community_entry');expect(result.draft.panels[0].text).toContain('Community interpretation');});
 it('requires a deliberate check and valid days and limit',()=>{expect(validateAnnotationDraft(compile(entry,false).draft,base).publishable).toBe(false);for(const row of [{...parking,value:'potato'},{...parking,days:[]},{...parking,allDay:false,start:'17:00',end:'17:00'}])expect(compile({...entry,rows:[row]}).errors.length).toBeGreaterThan(0);});
 it('supports fractions and restores raw form values',()=>{const input={...entry,rows:[{...parking,value:'1/2P'}]};const result=compile(input);expect((result.draft.schedule as ParkingSchedule).rules[0].maxDurationMinutes).toBe(30);expect(quickEntryFrom(result.draft)).toEqual(input);});
 it('splits Sunday overnight hours across the week boundary',()=>{expect(quickPeriods({...parking,days:[0],allDay:false,start:'22:00',end:'02:00'})).toEqual([{dayOfWeek:0,startTime:1320,endTime:1440},{dayOfWeek:1,startTime:0,endTime:120}]);});
 it('replaces general permission during full-section tow-away hours',()=>{const result=compile({...entry,rows:[parking,{...newQuickRow('condition','c'),days:[1],allDay:false,start:'16:00',end:'18:00'}]});expect(result.errors).toEqual([]);expect(validateAnnotationDraft(result.draft,base).publishable).toBe(true);const rules=(result.draft.schedule as ParkingSchedule).rules;expect(rules[0].periods.filter(p=>p.dayOfWeek===1)).toEqual([{dayOfWeek:1,startTime:0,endTime:960},{dayOfWeek:1,startTime:1080,endTime:1440}]);expect(rules[1].type).toBe('towaway');});
 it('keeps general availability when a restriction applies to a small part',()=>{const result=compile({...entry,rows:[parking,{...newQuickRow('condition','c'),local:true,from:0,to:10}]});const rules=(result.draft.schedule as ParkingSchedule).rules;expect(rules[0].periods).toHaveLength(5);expect(rules[1].extent).toEqual({start:0,end:.1});});
 it('blocks permission fully covered by a matching whole-section prohibition',()=>{
 const general={...parking,allDay:false,start:'08:00',end:'18:00'};
 const condition={...newQuickRow('condition','c'),value:'no_stopping',days:[1,2,3,4,5],allDay:false,start:'08:00',end:'18:00'};
 const result=compile({...entry,rows:[general,condition]});expect(result.errors.join(' ')).toContain('Parking period 1 is completely covered');expect(validateAnnotationDraft(result.draft,base).publishable).toBe(false);
 const local=compile({...entry,rows:[general,{...condition,local:true,from:10,to:20}]});expect(local.errors).toEqual([]);expect(validateAnnotationDraft(local.draft,base).publishable).toBe(true);
 const adjacent=compile({...entry,rows:[general,{...condition,start:'18:00',end:'20:00'}]});expect(adjacent.errors).toEqual([]);expect(validateAnnotationDraft(adjacent.draft,base).publishable).toBe(true);
 });
 it('rejects contradictory raw schedules even if the simple editor is bypassed',()=>{
 const result=compile();const schedule=result.draft.schedule as ParkingSchedule;
 const restriction={...schedule.rules[0],id:'raw-restriction',type:'no_stopping' as const,maxDurationMinutes:undefined};schedule.rules.push(restriction);result.draft.panels.push({id:'extra-panel',text:'No stopping',arrow:'both',ruleIds:[restriction.id]});
 expect(validateAnnotationDraft(result.draft,base).errors).toContain('Parking permission conflicts with a whole-section restriction. Adjust overlapping days or hours.');
 });
 it('rejects conflicting parking periods and special conditions',()=>{expect(compile({...entry,rows:[parking,{...parking,id:'duplicate'}]}).errors).toContain('Parking periods overlap. Adjust their days or hours.');expect(compile({...entry,rows:[newQuickRow('condition','a'),newQuickRow('condition','b')]}).errors).toContain('Special conditions overlap. Adjust their days or hours.');});
 it('falls back safely when saved quick metadata is malformed',()=>{expect(quickEntryFrom({...base,quickEntry:{version:1,rows:[null],holidaysApply:true} as unknown as QuickEntry}).rows[0].value).toBe('');});
});

describe('minute parking limits',()=>{
 it.each(['1 min','5 minutes','5min','10 mins','15 m','30 MIN'])("compiles %s into publishable minute limits",value=>{const result=compile({...entry,rows:[{...parking,value}]});expect(result.errors).toEqual([]);expect(validateAnnotationDraft(result.draft,base).publishable).toBe(true);expect((result.draft.schedule as ParkingSchedule).rules[0].maxDurationMinutes).toBe(parseInt(value));expect(result.draft.panels[0].text).toContain(`${parseInt(value)} ${parseInt(value)===1?'minute':'minutes'}`);expect(quickEntryFrom(result.draft).rows[0].value).toBe(value);});
 it.each(['0 min','-1 min','0.5 min','1441 min','5 minP','5 minutes extra'])("rejects %s",value=>expect(quickLimitMinutes(value)).toBeNull());
 it('keeps P and bare numbers in hours',()=>{expect(quickLimitMinutes('5P')).toBe(300);expect(quickLimitMinutes('1')).toBe(60);expect(quickLimitMinutes('1/4P')).toBe(15);});
 it('restores detailed minute rules without decimal-hour conversion',()=>{const draft=compile({...entry,rows:[{...parking,value:'1 min'}]}).draft;delete draft.quickEntry;expect(quickEntryFrom(draft).rows[0].value).toBe('1 min');});
});
