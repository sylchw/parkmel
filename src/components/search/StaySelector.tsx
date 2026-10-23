"use client";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import type { ParkingStay } from "../../domain/parking/types";
import { melbourneLocalToInstant, instantToMelbourneLocal, isAmbiguousMelbourneLocal } from "../../domain/parking/time";
import type { FoldDisambiguation } from "../../domain/parking/time";
import { isMelbournePublicHoliday } from "../../domain/parking/holidays";
import type { HolidayCalendar } from "../../domain/parking/holidays";
export type StayShortcut = "weekday" | "saturday" | "sunday" | "holiday";
export function shortcutDate(kind: StayShortcut, now: number, calendar: HolidayCalendar | null): string | null {
  if (!Number.isFinite(now)) return null;
  const today = instantToMelbourneLocal(new Date(now)).slice(0, 10);
  if (kind === "holiday") {
    return calendar?.dates.filter(date => date >= today && isMelbournePublicHoliday(date, calendar) === true).sort()[0] ?? null;
  }
  const first = Date.parse(`${today}T00:00:00Z`);
  for (let i = 0; i < 7; i++) {
    const date = new Date(first + i * 86_400_000), day = date.getUTCDay();
    if (kind === "weekday" ? day >= 1 && day <= 5 : day === (kind === "saturday" ? 6 : 0)) return date.toISOString().slice(0, 10);
  }
  return null;
}
export function selectedStay(localInput: string, duration: number, choice?: FoldDisambiguation): ParkingStay | null {
  const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localInput) ? `${localInput}:00` : localInput;
  if (!Number.isSafeInteger(duration) || duration <= 0 || duration > 31 * 1440) return null;
  const arrival = melbourneLocalToInstant(local, choice);
  if (!arrival) return null;
  const departure = new Date(arrival.getTime() + duration * 60_000);
  if (!Number.isFinite(departure.getTime())) return null;
  return { arrival: arrival.toISOString(), departure: departure.toISOString() };
}
interface Props {
  initialArrival: string;
  initialDurationMinutes?: number;
  now: number;
  calendar: HolidayCalendar | null;
  onSelect: (stay: ParkingStay) => void;
}
/** Local-only form leaf. Parent owns retention/auth and passes a stable concrete clock. */
export default function StaySelector({ initialArrival, initialDurationMinutes = 15, now, calendar, onSelect }: Props) {
  const id = useId();
  const [arrival, setArrival] = useState(initialArrival);
  const [duration, setDuration] = useState(String(initialDurationMinutes));
  const [choice, setChoice] = useState<FoldDisambiguation | undefined>();
  const [error, setError] = useState("");
  const seconds = arrival.length === 16 ? `${arrival}:00` : arrival;
  const ambiguous = isAmbiguousMelbourneLocal(seconds);
  const holiday = isMelbournePublicHoliday(arrival.slice(0, 10), calendar);
  const changeArrival = (value: string) => { setArrival(value); setChoice(undefined); setError(""); };
  const controlStyle = { width: "100%", minWidth: 0, minHeight: 44 };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const stay = selectedStay(arrival, Number(duration), choice);
    if (!stay) { setError("Choose a valid Melbourne date/time and positive duration; repeated times need an occurrence."); return; }
    setError(""); onSelect(stay);
  }
  return <form onSubmit={submit} style={{ width: "100%", maxWidth: "28rem", minWidth: 0 }} aria-label="Parking stay">
    <fieldset style={{ minWidth: 0 }}>
      <legend>Arrival and intended stay</legend>
      <div className="stay-shortcuts" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(["weekday", "saturday", "sunday", "holiday"] as const).map(kind => {
          const date = shortcutDate(kind, now, calendar);
          return <button key={kind} type="button" disabled={!date} style={{ minHeight: 44 }}
            onClick={() => date && changeArrival(`${date}T${arrival.slice(11) || "09:00:00"}`)}>
            {kind === "holiday" ? "Public holiday" : kind} {date ?? "unavailable"}
          </button>;
        })}
      </div>
      <label htmlFor={`${id}-arrival`}>Arrival in Melbourne</label>
      <input id={`${id}-arrival`} type="datetime-local" step="1" required value={arrival}
        style={controlStyle} aria-describedby={`${id}-holiday ${id}-error`} aria-invalid={!!error}
        onChange={event => changeArrival(event.target.value)} />
      <p id={`${id}-holiday`} role="status">{holiday === null ? "Holiday calendar unavailable for this date"
        : holiday ? "Public holiday — each sign’s holiday terms still apply" : "Not a public holiday"}</p>
      {ambiguous && <><label htmlFor={`${id}-fold`}>Repeated local time: choose occurrence</label>
        <select id={`${id}-fold`} required value={choice ?? ""} style={controlStyle}
          onChange={event => setChoice(event.target.value as FoldDisambiguation)}>
          <option value="">Choose occurrence</option><option value="earlier">Earlier occurrence</option>
          <option value="later">Later occurrence</option>
        </select></>}
      <label htmlFor={`${id}-duration`}>Duration in minutes</label>
      <input id={`${id}-duration`} type="number" min="1" max={31 * 1440} step="1" required value={duration}
        style={controlStyle} aria-describedby={`${id}-error`} onChange={event => setDuration(event.target.value)} />
      <p id={`${id}-error`} role="alert">{error}</p>
      <button type="submit" style={{ minHeight: 44 }}>Use this stay</button>
    </fieldset>
  </form>;
}
