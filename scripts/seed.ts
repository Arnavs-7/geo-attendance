import { db } from "@/lib/firebase";
import { setDoc, doc, collection, serverTimestamp, GeoPoint, Timestamp } from "firebase/firestore";
import { format, subDays } from "date-fns";

/**
 * SEED SCRIPT: To be triggered from an admin-only page or environment with credentials.
 */
export async function seedDatabase() {
  console.log("Starting seed...");

  // 1. Office Config
  await setDoc(doc(db, "officeConfig", "default"), {
    officeName: "Headquarters (Bangalore)",
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 100,
    lateThresholdTime: "09:30",
    autoCheckoutEnabled: true,
    autoCheckoutTime: "18:00",
  });

  // 2. Admin User
  const adminId = "admin_uid_123";
  await setDoc(doc(db, "users", adminId), {
    uid: adminId,
    name: "System Admin",
    email: "admin@office.com",
    role: "admin",
    department: "Administration",
    employeeId: "ADM001",
    createdAt: serverTimestamp(),
  });

  // 3. Employees (10)
  const departments = ["Engineering", "Product", "Sales"];
  const employees = [];
  for (let i = 1; i <= 10; i++) {
    const uid = `emp_uid_${i}`;
    const employee = {
      uid,
      name: `Employee ${i}`,
      email: `emp${i}@office.com`,
      role: "employee",
      department: departments[i % departments.length],
      employeeId: `EMP${100 + i}`,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", uid), employee);
    employees.push(employee);
  }

  // 4. Attendance Data (Last 30 days)
  for (let i = 30; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, "yyyy-MM-dd");

    // Randomize for each employee
    for (const emp of employees) {
      // 80% chance of being present
      if (Math.random() > 0.2) {
        const checkInTime = new Date(date);
        // Random check-in between 08:30 and 10:30
        const hour = Math.floor(Math.random() * 2) + 8;
        const min = Math.floor(Math.random() * 60);
        checkInTime.setHours(hour, min, 0);

        const status = (hour === 9 && min > 30) || hour > 9 ? "late" : "present";

        const docId = `${emp.uid}_${dateStr}`;
        await setDoc(doc(db, "attendance", docId), {
          userId: emp.uid,
          userName: emp.name,
          employeeId: emp.employeeId,
          date: dateStr,
          checkInTime: Timestamp.fromDate(checkInTime),
          checkOutTime: Timestamp.fromDate(new Date(date.setHours(18, 0, 0))),
          checkInLocation: new GeoPoint(12.9716, 77.5946),
          checkOutLocation: new GeoPoint(12.9716, 77.5946),
          status,
          distanceFromOffice: Math.floor(Math.random() * 50),
          gpsAccuracy: Math.floor(Math.random() * 20) + 5,
          deviceInfo: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
          isSuspicious: Math.random() > 0.95, // 5% chance of suspicious
          suspiciousReason: "Impossible movement speed",
        });
      }
    }
  }

  console.log("Seed complete!");
}
