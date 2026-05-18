import { Timestamp } from "firebase/firestore";
import type { AttendanceStatus } from "@/types";

/** Local-time YYYY-MM-DD string for a given date (default: now). */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Authoritative late/present decision, recomputed from the SERVER check-in
 * timestamp. The stored `status` field is client-supplied and advisory only;
 * admin views call this so a late employee cannot mask themselves as present.
 */
export function computeStatus(
  checkIn: Timestamp | Date,
  lateThresholdTime: string | undefined
): Exclude<AttendanceStatus, "absent"> {
  const checkInDate = checkIn instanceof Timestamp ? checkIn.toDate() : checkIn;
  const parts = (lateThresholdTime || "09:30").split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const threshold = new Date(checkInDate);
  threshold.setHours(
    Number.isFinite(h) ? h : 9,
    Number.isFinite(m) ? m : 30,
    0,
    0
  );
  return checkInDate > threshold ? "late" : "present";
}

/** Worked hours between check-in and check-out, rounded to 2 decimals. */
export function workedHours(
  checkIn: Timestamp | null | undefined,
  checkOut: Timestamp | null | undefined
): number | null {
  if (!checkIn || !checkOut) return null;
  const ms = checkOut.toDate().getTime() - checkIn.toDate().getTime();
  if (ms <= 0) return null;
  return Math.round((ms / 3_600_000) * 100) / 100;
}

/** Human-readable worked duration, e.g. "8h 15m" or "—". */
export function formatDuration(
  checkIn: Timestamp | null | undefined,
  checkOut: Timestamp | null | undefined
): string {
  if (!checkIn || !checkOut) return "—";
  const ms = checkOut.toDate().getTime() - checkIn.toDate().getTime();
  if (ms <= 0) return "—";
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
