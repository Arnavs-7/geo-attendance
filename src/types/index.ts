import { Timestamp, GeoPoint } from "firebase/firestore";

export type UserRole = 'admin' | 'employee';

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  employeeId: string;
  /** Whether the account may mark attendance. Missing => treated as active. */
  active?: boolean;
  createdAt: Timestamp;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkInTime: Timestamp;
  checkOutTime: Timestamp | null;
  /** Anchor timestamp for the rate-limit rule; updated on every write. */
  lastActionAt: Timestamp;
  checkInLocation: GeoPoint;
  checkOutLocation: GeoPoint | null;
  status: AttendanceStatus;
  distanceFromOffice: number;
  gpsAccuracy: number;
  deviceInfo: string;
  isSuspicious: boolean;
  suspiciousReason: string | null;
  /** Set when an admin closes a forgotten check-out. */
  closedByAdmin?: boolean;
}

export interface OfficeConfig {
  officeName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  lateThresholdTime: string; // HH:MM — working-hours start / late cutoff
  autoCheckoutEnabled: boolean;
  autoCheckoutTime: string; // HH:MM
}

/** A row in the admin live-overview / reports tables. */
export interface EmployeeAttendanceRow {
  employee: UserProfile;
  record: AttendanceRecord | null;
}
