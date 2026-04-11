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
  getDocs,
  setIndexConfiguration,
  serverTimestamp,
} from "firebase/firestore";
import * as fs from "fs";

/**
 * Firestore Rules Test Suite
 */
describe("Firestore Security Rules", () => {
  let testEnv: RulesTestEnvironment;
  const projectID = "geo-attendance-test";

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

  function getFirestore(auth?: { uid: string; [key: string]: any }) {
    if (!auth) return testEnv.unauthenticatedContext().firestore();
    const { uid, ...claims } = auth;
    return testEnv.authenticatedContext(uid, claims).firestore();
  }

  describe("Users Collection", () => {
    const userIdA = "user_a";
    const userIdB = "user_b";
    const adminId = "admin_user";

    it("Authenticated Employee A CANNOT read Employee B's user document", async () => {
      const db = getFirestore({ uid: userIdA });
      await assertFails(getDoc(doc(db, "users", userIdB)));
    });

    it("Authenticated Employee A CAN read their own user document", async () => {
      const db = getFirestore({ uid: userIdA });
      await assertSucceeds(getDoc(doc(db, "users", userIdA)));
    });

    it("Admin CAN read any user document", async () => {
      // Setup: Create admin doc so isAdmin() helper returns true
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "users", adminId), { role: "admin" });
      });

      const db = getFirestore({ uid: adminId });
      await assertSucceeds(getDoc(doc(db, "users", userIdA)));
    });

    it("Admin CAN list all users", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "users", adminId), { role: "admin" });
      });

      const db = getFirestore({ uid: adminId });
      await assertSucceeds(getDocs(query(collection(db, "users"))));
    });

    it("Unauthenticated user CANNOT read any user document", async () => {
      const db = getFirestore();
      await assertFails(getDoc(doc(db, "users", userIdA)));
    });

    it("Employee CAN create their own user document on signup", async () => {
      const db = getFirestore({ uid: userIdA });
      await assertSucceeds(setDoc(doc(db, "users", userIdA), { name: "User A", role: "employee" }));
    });

    it("Employee CANNOT create a user document for a different userId", async () => {
      const db = getFirestore({ uid: userIdA });
      await assertFails(setDoc(doc(db, "users", userIdB), { name: "User B", role: "employee" }));
    });

    it("Employee CAN update their own profile", async () => {
      const db = getFirestore({ uid: userIdA });
      await assertSucceeds(setDoc(doc(db, "users", userIdA), { name: "User A Updated" }));
    });

    it("Employee CANNOT update another employee's profile", async () => {
      const db = getFirestore({ uid: userIdA });
      await assertFails(updateDoc(doc(db, "users", userIdB), { name: "Hacked" }));
    });

    it("Admin CAN delete a user document", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "users", adminId), { role: "admin" });
        await setDoc(doc(context.firestore(), "users", userIdA), { name: "User A" });
      });

      const db = getFirestore({ uid: adminId });
      await assertSucceeds(deleteDoc(doc(db, "users", userIdA)));
    });
  });

  describe("Attendance Collection", () => {
    const userId = "employee_1";
    const today = new Date().toISOString().split("T")[0];
    const docId = `${userId}_${today}`;

    it("Employee CAN create their own attendance record for today's date only", async () => {
      const db = getFirestore({ uid: userId });
      await assertSucceeds(setDoc(doc(db, "attendance", docId), {
        userId: userId,
        checkInTime: serverTimestamp(),
        date: today
      }));
    });

    it("Employee CANNOT create an attendance record for yesterday", async () => {
      const db = getFirestore({ uid: userId });
      const yesterday = "2020-01-01"; // Old date
      await assertFails(setDoc(doc(db, "attendance", `${userId}_${yesterday}`), {
        userId: userId,
        checkInTime: serverTimestamp(),
        date: yesterday
      }));
    });

    it("Employee CANNOT read another employee's attendance record", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "attendance", "other_user_today"), { userId: "other_user" });
      });

      const db = getFirestore({ uid: userId });
      await assertFails(getDoc(doc(db, "attendance", "other_user_today")));
    });
  });

  describe("Office Config", () => {
    it("Any authenticated user CAN read officeConfig", async () => {
      const db = getFirestore({ uid: "any_user" });
      await assertSucceeds(getDoc(doc(db, "officeConfig", "default")));
    });

    it("Employee CANNOT write to officeConfig", async () => {
      const db = getFirestore({ uid: "employee_user" });
      await assertFails(setDoc(doc(db, "officeConfig", "default"), { lat: 0, lng: 0 }));
    });
  });
});
