import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import * as fs from "fs";

/**
 * Firestore Rules Test Suite — validates the hardened security model:
 *  - no client-side admin promotion
 *  - employees cannot rewrite protected attendance fields
 *  - employees cannot read other employees' data
 */
let testEnv: RulesTestEnvironment;
const projectID = "geo-attendance-test";
const today = new Date().toISOString().split("T")[0];

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: projectID,
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

function getFirestore(auth?: { uid: string }) {
  if (!auth) return testEnv.unauthenticatedContext().firestore();
  return testEnv.authenticatedContext(auth.uid).firestore();
}

/** Seed a document bypassing security rules (for test fixtures). */
async function seed(path: string, id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path, id), data);
  });
}

describe("Users Collection", () => {
  const userA = "user_a";
  const userB = "user_b";
  const adminId = "admin_user";

  it("Employee A CANNOT read Employee B's profile", async () => {
    await seed("users", userB, { uid: userB, role: "employee" });
    const db = getFirestore({ uid: userA });
    await assertFails(getDoc(doc(db, "users", userB)));
  });

  it("Employee A CAN read their own profile", async () => {
    await seed("users", userA, { uid: userA, role: "employee" });
    const db = getFirestore({ uid: userA });
    await assertSucceeds(getDoc(doc(db, "users", userA)));
  });

  it("Admin CAN read & list any user", async () => {
    await seed("users", adminId, { uid: adminId, role: "admin" });
    await seed("users", userA, { uid: userA, role: "employee" });
    const db = getFirestore({ uid: adminId });
    await assertSucceeds(getDoc(doc(db, "users", userA)));
    await assertSucceeds(getDocs(query(collection(db, "users"))));
  });

  it("Employee CANNOT list all users", async () => {
    await seed("users", userA, { uid: userA, role: "employee" });
    const db = getFirestore({ uid: userA });
    await assertFails(getDocs(query(collection(db, "users"))));
  });

  it("Employee CAN create their own profile as role=employee", async () => {
    const db = getFirestore({ uid: userA });
    await assertSucceeds(
      setDoc(doc(db, "users", userA), { uid: userA, role: "employee", active: true })
    );
  });

  it("Employee CANNOT self-create as role=admin (privilege escalation)", async () => {
    const db = getFirestore({ uid: userA });
    await assertFails(
      setDoc(doc(db, "users", userA), { uid: userA, role: "admin" })
    );
  });

  it("Employee CANNOT create a profile for another userId", async () => {
    const db = getFirestore({ uid: userA });
    await assertFails(
      setDoc(doc(db, "users", userB), { uid: userB, role: "employee" })
    );
  });

  it("Employee CANNOT promote themselves to admin via update", async () => {
    await seed("users", userA, { uid: userA, role: "employee", name: "A" });
    const db = getFirestore({ uid: userA });
    await assertFails(updateDoc(doc(db, "users", userA), { role: "admin" }));
  });

  it("Employee CAN update only their name/department", async () => {
    await seed("users", userA, { uid: userA, role: "employee", name: "A", department: "Eng" });
    const db = getFirestore({ uid: userA });
    await assertSucceeds(
      updateDoc(doc(db, "users", userA), { name: "A New", department: "Sales" })
    );
  });

  it("Admin CAN deactivate an employee", async () => {
    await seed("users", adminId, { uid: adminId, role: "admin" });
    await seed("users", userA, { uid: userA, role: "employee" });
    const db = getFirestore({ uid: adminId });
    await assertSucceeds(updateDoc(doc(db, "users", userA), { active: false }));
  });
});

describe("Attendance Collection", () => {
  const userId = "employee_1";
  const otherId = "employee_2";
  const docId = `${userId}_${today}`;

  const validRecord = {
    userId,
    date: today,
    checkInTime: serverTimestamp(),
    lastActionAt: serverTimestamp(),
    checkOutTime: null,
    status: "present",
    distanceFromOffice: 12,
    gpsAccuracy: 18,
  };

  it("Active employee CAN check in for today", async () => {
    await seed("users", userId, { uid: userId, role: "employee", active: true });
    const db = getFirestore({ uid: userId });
    await assertSucceeds(setDoc(doc(db, "attendance", docId), validRecord));
  });

  it("Deactivated employee CANNOT check in", async () => {
    await seed("users", userId, { uid: userId, role: "employee", active: false });
    const db = getFirestore({ uid: userId });
    await assertFails(setDoc(doc(db, "attendance", docId), validRecord));
  });

  it("Employee CANNOT check in with a mismatched document id", async () => {
    await seed("users", userId, { uid: userId, role: "employee", active: true });
    const db = getFirestore({ uid: userId });
    await assertFails(
      setDoc(doc(db, "attendance", `${userId}_2020-01-01`), validRecord)
    );
  });

  it("Employee CANNOT check in with an invalid status", async () => {
    await seed("users", userId, { uid: userId, role: "employee", active: true });
    const db = getFirestore({ uid: userId });
    await assertFails(
      setDoc(doc(db, "attendance", docId), { ...validRecord, status: "hacked" })
    );
  });

  it("Employee CANNOT read another employee's attendance", async () => {
    await seed("attendance", `${otherId}_${today}`, { userId: otherId, date: today });
    const db = getFirestore({ uid: userId });
    await assertFails(getDoc(doc(db, "attendance", `${otherId}_${today}`)));
  });

  it("Employee CAN check out their own open record", async () => {
    await seed("users", userId, { uid: userId, role: "employee", active: true });
    await seed("attendance", docId, {
      userId,
      date: today,
      checkInTime: new Date(Date.now() - 60000),
      lastActionAt: new Date(Date.now() - 60000),
      checkOutTime: null,
      status: "present",
      distanceFromOffice: 12,
      gpsAccuracy: 18,
    });
    const db = getFirestore({ uid: userId });
    await assertSucceeds(
      updateDoc(doc(db, "attendance", docId), {
        checkOutTime: serverTimestamp(),
        lastActionAt: serverTimestamp(),
      })
    );
  });

  it("Employee CANNOT alter status or distance on check-out", async () => {
    await seed("users", userId, { uid: userId, role: "employee", active: true });
    await seed("attendance", docId, {
      userId,
      date: today,
      checkInTime: new Date(Date.now() - 60000),
      lastActionAt: new Date(Date.now() - 60000),
      checkOutTime: null,
      status: "late",
      distanceFromOffice: 12,
      gpsAccuracy: 18,
    });
    const db = getFirestore({ uid: userId });
    await assertFails(
      updateDoc(doc(db, "attendance", docId), {
        checkOutTime: serverTimestamp(),
        lastActionAt: serverTimestamp(),
        status: "present",
      })
    );
  });
});

describe("Office Config", () => {
  it("Any authenticated user CAN read officeConfig", async () => {
    const db = getFirestore({ uid: "any_user" });
    await assertSucceeds(getDoc(doc(db, "officeConfig", "default")));
  });

  it("Employee CANNOT write officeConfig", async () => {
    await seed("users", "emp", { uid: "emp", role: "employee" });
    const db = getFirestore({ uid: "emp" });
    await assertFails(setDoc(doc(db, "officeConfig", "default"), { radiusMeters: 0 }));
  });

  it("Admin CAN write officeConfig", async () => {
    await seed("users", "adm", { uid: "adm", role: "admin" });
    const db = getFirestore({ uid: "adm" });
    await assertSucceeds(setDoc(doc(db, "officeConfig", "default"), { radiusMeters: 100 }));
  });
});
