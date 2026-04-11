const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, setDoc } = require("firebase/firestore");
const fs = require("fs");

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId: "test-date",
    firestore: { rules: fs.readFileSync("scratch.rules", "utf8") }
  });
  const db = testEnv.unauthenticatedContext().firestore();
  const today = new Date().toISOString().split("T")[0];
  try {
    await assertSucceeds(setDoc(doc(db, "attendance", "123"), { date: today }));
    console.log("SUCCESS");
  } catch(e) {
    console.log("FAIL", e);
  }
  await testEnv.cleanup();
}
run();
