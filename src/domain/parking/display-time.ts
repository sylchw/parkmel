import type {TimePeriod} from "./types";
export function displayTime(minutes:number):string {
 if(minutes===1440)return "midnight";
 const hour=Math.floor(minutes/60),minute=minutes%60;
 return `${hour%12||12}${minute?`:${String(minute).padStart(2,"0")}`:""}${hour<12?"am":"pm"}`;
}
export function displayPeriod(period:TimePeriod):string {
 const day=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][period.dayOfWeek];
 return `${day} · ${period.startTime===0&&period.endTime===1440?"All day":`${displayTime(period.startTime)}–${displayTime(period.endTime)}`}`;
}
