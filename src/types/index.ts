import { Timestamp, GeoPoint } from "firebase/firestore";

export type UserRole = 'admin' | 'employee';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  employeeId: string;
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
  checkInLocation: GeoPoint;
  checkOutLocation: GeoPoint | null;
  status: 'present' | 'late' | 'absent';
  distanceFromOffice: number;
  gpsAccuracy: number;
  deviceInfo: string;
  isSuspicious: boolean;
  suspiciousReason: string | null;
}

export interface OfficeConfig {
  officeName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  lateThresholdTime: string; // HH:MM
  autoCheckoutEnabled: boolean;
  autoCheckoutTime: string; // HH:MM
}
