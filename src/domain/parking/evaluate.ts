import type { EvaluationContext, EvaluationResult, ReasonCode } from "./types";
import { validateParkingSchedule, validateParkingStay } from "./validation";
import { instantToMelbourneLocal, melbourneLocalToInstant } from "./time";
import { ruleAppliesOnDate } from "./holidays";
import type { HolidayCalendar } from "./holidays";
export const FRESHNESS_MS = 180 * 86_400_000;
export function evaluationResult(eligibility: EvaluationResult["eligibility"], reason: ReasonCode,
  explanation: string, ruleIds: string[] = []): EvaluationResult {
  return { eligibility, reasonCodes: [reason], appliedRuleIds: ruleIds, explanation, earliestTransition: null };
}
/** Bounded evaluator: ordinary-vehicle intervals, with explicit whole-section holiday overrides. */
export function evaluateSinglePeriod(ctx: EvaluationContext, calendar: HolidayCalendar | null): EvaluationResult {
  const unknown = (reason: ReasonCode, message: string) => evaluationResult("unknown", reason, message);
  if (!validateParkingStay(ctx.stay).valid || !validateParkingStay({ arrival: ctx.evaluatedAt,
      departure: "9999-12-31T23:59:59Z" }).valid || ctx.timezone !== "Australia/Melbourne" ||
      ctx.vehicleContext !== "ordinary_no_permit") return unknown("invalid_input", "Invalid stay or evaluation context");
  if (!validateParkingSchedule(ctx.schedule).valid || ctx.schedule.completeness !== "complete" ||
      ctx.schedule.coverage !== "full_schedule") return unknown("incomplete_schedule", "Complete sign coverage is required");
  if (ctx.schedule.changeState !== "none") return unknown("change_reported", "Changed or disputed signs require review");
  if (ctx.schedule.verification === "unverified") return unknown("unverified", "Schedule has not been verified");
  const evaluated = Date.parse(ctx.evaluatedAt);
  if (ctx.schedule.rules.some(rule => {
    const evidence = rule.source.sourceDate ? Math.min(Date.parse(rule.source.observedAt),
      Date.parse(`${rule.source.sourceDate}T00:00:00Z`)) : Date.parse(rule.source.observedAt);
    return evidence > evaluated || evaluated - evidence > FRESHNESS_MS;
  })) return unknown("stale", "Sign evidence is stale or future-dated");
  const start = instantToMelbourneLocal(new Date(ctx.stay.arrival));
  const end = instantToMelbourneLocal(new Date(ctx.stay.departure));
  const date = start.slice(0, 10);
  const startDay = Date.parse(`${date}T00:00:00Z`);
  const endDay = Date.parse(`${end.slice(0, 10)}T00:00:00Z`);
  const minutes = (s: string) => Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16)) + Number(s.slice(17, 19)) / 60;
  const from = minutes(start) + new Date(ctx.stay.arrival).getUTCMilliseconds() / 60_000;
  const through = endDay === startDay ? minutes(end) + new Date(ctx.stay.departure).getUTCMilliseconds() / 60_000
    : endDay - startDay === 86_400_000 && end.endsWith("T00:00:00") && new Date(ctx.stay.departure).getUTCMilliseconds() === 0 ? 1440 : NaN;
  if (!Number.isFinite(through) || through <= from ||
      Math.abs((through - from) * 60_000 - (Date.parse(ctx.stay.departure) - Date.parse(ctx.stay.arrival))) > 0.001) {
    return unknown("unsupported_semantics", "Stay crosses a date or timezone transition");
  }
  if (ctx.publicHolidays === null || !calendar ||
      [...ctx.publicHolidays].sort().join() !== [...calendar.dates].sort().join()) {
    return unknown("unknown_holiday", "A scoped reviewed holiday calendar is required");
  }
  const day = new Date(startDay).getUTCDay();
  const active = [];
  for (const rule of ctx.schedule.rules) {
    const periods = rule.periods.filter(p => p.dayOfWeek === day && p.startTime < through && p.endTime > from);
    if (!periods.length) continue;
    const applies = ruleAppliesOnDate(rule, date, calendar);
    if (applies === null) return unknown("unknown_holiday", "Holiday or exception semantics have not been verified");
    if (!applies) continue;
    if (!periods.some(p => p.startTime <= from && p.endTime >= through)) {
      return unknown("unsupported_semantics", "Stay crosses a signed period transition");
    }
    active.push(rule);
  }
  if (!active.length) {
    if(ctx.schedule.rules.some(rule=>ruleAppliesOnDate(rule,date,calendar)===null))return unknown("unknown_holiday","Holiday or exception semantics have not been verified");
    const ordinaryParking=ctx.schedule.rules.some(rule=>["free","fee","time_limit"].includes(rule.type)&&rule.permitCondition==="none");
    if(!ordinaryParking||ctx.schedule.rules.some(rule=>["conditional","unknown"].includes(rule.type)||rule.permitCondition==="unknown"))return unknown("incomplete_schedule", "No explicit permission covers this stay");
    return evaluationResult("eligible_free","outside_signed_hours","No signed time limit for the selected duration; the stay is outside the recorded restrictions.");
  }
  let rule = active[0];
  if (active.length !== 1) {
    // Keep all-day permission intact on holidays when a named-day restriction is excluded.
    // On ordinary days, one whole-section restriction overrides that general permission.
    const restrictions=active.filter(candidate=>["clearway","no_parking","no_stopping","towaway","permit","loading","accessible"].includes(candidate.type)&&(!candidate.extent||candidate.extent.start===0&&candidate.extent.end===1));
    const permissions=active.filter(candidate=>["free","fee","time_limit"].includes(candidate.type)&&candidate.permitCondition==="none");
    if(active.length!==2||restrictions.length!==1||permissions.length!==1||restrictions[0].holidayPolicy===permissions[0].holidayPolicy)return unknown("unsupported_semantics", "Overlapping clauses need reviewed precedence");
    rule=restrictions[0];
  }
  const restricted = (reason: ReasonCode, message: string) => evaluationResult("restricted", reason, message, [rule.id]);
  if (["clearway", "no_parking", "no_stopping","towaway"].includes(rule.type)) return restricted("prohibited", "Parking is prohibited during this stay");
  if (rule.permitCondition === "required") return restricted("permit_required", "A permit is required");
  if (["loading", "accessible"].includes(rule.type)) return restricted("special_vehicle_required", "Special vehicle eligibility is required");
  if (["conditional", "unknown"].includes(rule.type) || rule.permitCondition === "unknown") {
    return unknown("unsupported_semantics", "Unsupported sign or permit condition");
  }
  const duration = (Date.parse(ctx.stay.departure) - Date.parse(ctx.stay.arrival)) / 60_000;
  if (rule.maxDurationMinutes !== undefined && duration > rule.maxDurationMinutes) {
    return restricted("duration_exceeded", `Stay exceeds the ${rule.maxDurationMinutes}-minute maximum`);
  }
  if (rule.feeStatus === "unknown" || (rule.feeStatus === "paid" && rule.feeCents === undefined)) {
    return unknown("unknown_fee", "The price has not been established");
  }
  return evaluationResult(rule.feeStatus === "free" ? "eligible_free" : "eligible_paid",
    rule.feeStatus === "free" ? "allowed" : "paid_period", `Entire stay is ${rule.feeStatus}`, [rule.id]);
}


/** Whole-stay partitioning. Complex time-limit and DST carryover stays unknown. */
export function evaluateStay(ctx: EvaluationContext, calendar: HolidayCalendar | null): EvaluationResult {
  const single = evaluateSinglePeriod(ctx, calendar);
  if (!single.reasonCodes.includes("unsupported_semantics")) return single;
  const unknown = (message: string) => evaluationResult("unknown", "unsupported_semantics", message);
  const arrival = Date.parse(ctx.stay.arrival), departure = Date.parse(ctx.stay.departure);
  const localStart = instantToMelbourneLocal(new Date(arrival));
  const localEnd = instantToMelbourneLocal(new Date(departure));
  if (Date.parse(`${localEnd}Z`) - Date.parse(`${localStart}Z`) + new Date(departure).getUTCMilliseconds() - new Date(arrival).getUTCMilliseconds() !== departure - arrival) {
    return unknown("Timezone-transition carryover has not been reviewed");
  }
  const firstDate = Date.parse(`${localStart.slice(0, 10)}T00:00:00Z`);
  const lastDate = Date.parse(`${localEnd.slice(0, 10)}T00:00:00Z`);
  if (lastDate - firstDate > 31 * 86_400_000) return unknown("Stay exceeds the supported 31-day evaluation bound");
  const boundaries = new Set<number>([arrival, departure]);
  for (let day = firstDate; day <= lastDate; day += 86_400_000) {
    const date = new Date(day).toISOString().slice(0, 10);
    const weekday = new Date(day).getUTCDay();
    const minutes = new Set<number>([0, 1440]);
    for (const rule of ctx.schedule.rules) for (const period of rule.periods) {
      if (period.dayOfWeek === weekday) { minutes.add(period.startTime); minutes.add(period.endTime); }
    }
    for (const minute of minutes) {
      const local = minute === 1440 ? `${new Date(day + 86_400_000).toISOString().slice(0, 10)}T00:00:00`
        : `${date}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00`;
      const instant = melbourneLocalToInstant(local);
      if (instant && instant.getTime() > arrival && instant.getTime() < departure) boundaries.add(instant.getTime());
    }
  }
  const times = [...boundaries].sort((a, b) => a - b);
  const pieces = times.slice(0, -1).map((time, i) => evaluateSinglePeriod({ ...ctx,
    stay: { arrival: new Date(time).toISOString(), departure: new Date(times[i + 1]).toISOString() } }, calendar));
  const ids = [...new Set(pieces.flatMap(piece => piece.appliedRuleIds))];
  const firstRestricted = pieces.find(piece => piece.eligibility === "restricted");
  const firstUnknown = pieces.find(piece => piece.eligibility === "unknown");
  let result: EvaluationResult;
  if (firstRestricted) result = { ...firstRestricted };
  else if (firstUnknown) result = { ...firstUnknown };
  else if(pieces.every(piece=>piece.reasonCodes.includes("outside_signed_hours")))result=evaluationResult("eligible_free","outside_signed_hours","No signed time limit for the selected duration; the stay is outside the recorded restrictions.");
  else if (pieces.length > 1 && ctx.schedule.rules.some(rule => ids.includes(rule.id) && rule.maxDurationMinutes !== undefined)) {
    result = unknown("Maximum-stay carryover across transitions has not been reviewed");
  } else {
    const paid = pieces.some(piece => piece.eligibility === "eligible_paid");
    result = evaluationResult(paid ? "eligible_paid" : "eligible_free", paid ? "paid_period" : "allowed",
      paid ? "A paid period occurs during your stay" : "Every interval of this stay is explicitly free");
  }
  return { ...result, appliedRuleIds: ids, earliestTransition: times.length > 2 ? new Date(times[1]).toISOString() : null };
}
