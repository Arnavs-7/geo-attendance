"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var rules_unit_testing_1 = require("@firebase/rules-unit-testing");
var firestore_1 = require("firebase/firestore");
var fs = __importStar(require("fs"));
/**
 * Firestore Rules Test Suite
 */
var testEnv;
var projectID = "geo-attendance-test";
before(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, rules_unit_testing_1.initializeTestEnvironment)({
                    projectId: projectID,
                    firestore: {
                        rules: fs.readFileSync("firestore.rules", "utf8"),
                        host: "127.0.0.1",
                        port: 8080,
                    },
                })];
            case 1:
                testEnv = _a.sent();
                return [2 /*return*/];
        }
    });
}); });
beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, testEnv.clearFirestore()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
after(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, testEnv.cleanup()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
function getFirestore(auth) {
    if (!auth)
        return testEnv.unauthenticatedContext().firestore();
    var uid = auth.uid, claims = __rest(auth, ["uid"]);
    return testEnv.authenticatedContext(uid, claims).firestore();
}
describe("Users Collection", function () {
    var userIdA = "user_a";
    var userIdB = "user_b";
    var adminId = "admin_user";
    it("Authenticated Employee A CANNOT read Employee B's user document", function () { return __awaiter(void 0, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getFirestore({ uid: userIdA });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertFails)((0, firestore_1.getDoc)((0, firestore_1.doc)(db, "users", userIdB)))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Authenticated Employee A CAN read their own user document", function () { return __awaiter(void 0, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getFirestore({ uid: userIdA });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.getDoc)((0, firestore_1.doc)(db, "users", userIdA)))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Admin CAN read any user document", function () { return __awaiter(void 0, void 0, void 0, function () {
        var adminDb, db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adminDb = getFirestore({ uid: adminId });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.setDoc)((0, firestore_1.doc)(adminDb, "users", adminId), { role: "admin" }))];
                case 1:
                    _a.sent();
                    db = getFirestore({ uid: adminId });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.getDoc)((0, firestore_1.doc)(db, "users", userIdA)))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Admin CAN list all users", function () { return __awaiter(void 0, void 0, void 0, function () {
        var adminDb, db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adminDb = getFirestore({ uid: adminId });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.setDoc)((0, firestore_1.doc)(adminDb, "users", adminId), { role: "admin" }))];
                case 1:
                    _a.sent();
                    db = getFirestore({ uid: adminId });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.getDocs)((0, firestore_1.query)((0, firestore_1.collection)(db, "users"))))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Unauthenticated user CANNOT read any user document", function () { return __awaiter(void 0, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getFirestore();
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertFails)((0, firestore_1.getDoc)((0, firestore_1.doc)(db, "users", userIdA)))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Employee CAN create their own user document on signup", function () { return __awaiter(void 0, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getFirestore({ uid: userIdA });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.setDoc)((0, firestore_1.doc)(db, "users", userIdA), { name: "User A", role: "employee" }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Employee CANNOT create a user document for a different userId", function () { return __awaiter(void 0, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getFirestore({ uid: userIdA });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertFails)((0, firestore_1.setDoc)((0, firestore_1.doc)(db, "users", userIdB), { name: "User B", role: "employee" }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Employee CAN update their own profile", function () { return __awaiter(void 0, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getFirestore({ uid: userIdA });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.setDoc)((0, firestore_1.doc)(db, "users", userIdA), { name: "User A Updated" }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Employee CANNOT update another employee's profile", function () { return __awaiter(void 0, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getFirestore({ uid: userIdA });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertFails)((0, firestore_1.updateDoc)((0, firestore_1.doc)(db, "users", userIdB), { name: "Hacked" }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Admin CAN delete a user document", function () { return __awaiter(void 0, void 0, void 0, function () {
        var adminDb, userDb, db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adminDb = getFirestore({ uid: adminId });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.setDoc)((0, firestore_1.doc)(adminDb, "users", adminId), { role: "admin" }))];
                case 1:
                    _a.sent();
                    userDb = getFirestore({ uid: userIdA });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.setDoc)((0, firestore_1.doc)(userDb, "users", userIdA), { name: "User A" }))];
                case 2:
                    _a.sent();
                    db = getFirestore({ uid: adminId });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.deleteDoc)((0, firestore_1.doc)(db, "users", userIdA)))];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
describe("Attendance Collection", function () {
    var userId = "employee_1";
    var today = new Date().toISOString().split("T")[0];
    var docId = "".concat(userId, "_").concat(today);
    it("Employee CAN create their own attendance record for today's date only", function () { return __awaiter(void 0, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getFirestore({ uid: userId });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.setDoc)((0, firestore_1.doc)(db, "attendance", docId), {
                            userId: userId,
                            checkInTime: (0, firestore_1.serverTimestamp)(),
                            date: today
                        }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Employee CANNOT create an attendance record for yesterday", function () { return __awaiter(void 0, void 0, void 0, function () {
        var db, yesterday;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getFirestore({ uid: userId });
                    yesterday = "2020-01-01";
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertFails)((0, firestore_1.setDoc)((0, firestore_1.doc)(db, "attendance", "".concat(userId, "_").concat(yesterday)), {
                            userId: userId,
                            checkInTime: (0, firestore_1.serverTimestamp)(),
                            date: yesterday
                        }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Employee CANNOT read another employee's attendance record", function () { return __awaiter(void 0, void 0, void 0, function () {
        var otherDb, db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    otherDb = getFirestore({ uid: "other_user" });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.setDoc)((0, firestore_1.doc)(otherDb, "attendance", "other_user_".concat(today)), {
                            userId: "other_user",
                            checkInTime: (0, firestore_1.serverTimestamp)(),
                            date: today
                        }))];
                case 1:
                    _a.sent();
                    db = getFirestore({ uid: userId });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertFails)((0, firestore_1.getDoc)((0, firestore_1.doc)(db, "attendance", "other_user_".concat(today))))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
describe("Office Config", function () {
    it("Any authenticated user CAN read officeConfig", function () { return __awaiter(void 0, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getFirestore({ uid: "any_user" });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)((0, firestore_1.getDoc)((0, firestore_1.doc)(db, "officeConfig", "default")))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("Employee CANNOT write to officeConfig", function () { return __awaiter(void 0, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = getFirestore({ uid: "employee_user" });
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertFails)((0, firestore_1.setDoc)((0, firestore_1.doc)(db, "officeConfig", "default"), { lat: 0, lng: 0 }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
