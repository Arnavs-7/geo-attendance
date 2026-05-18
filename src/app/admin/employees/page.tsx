"use client";

import { useState, useEffect, useCallback } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, firebaseConfig } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Loader2, Search, UserMinus, UserPlus, RefreshCw, Building, UserCheck, Users } from "lucide-react";
import { UserProfile } from "@/types";
import { sanitizeText, sanitizeEmail, sanitizeId } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

const EMPTY_FORM = { name: "", email: "", employeeId: "", department: "" };

/** Cryptographically-random temporary password (employee resets it via email). */
function tempPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return (
    "Aa1!" +
    Array.from(bytes, (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("")
  );
}

export default function AdminEmployees() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);

  const [target, setTarget] = useState<UserProfile | null>(null);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, "users")));
      setEmployees(snapshot.docs.map((d) => d.data() as UserProfile));
    } catch {
      toast.error("Failed to fetch employees.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase();
    const matchesSearch =
      emp.name.toLowerCase().includes(q) ||
      emp.employeeId.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q);
    const matchesDept = deptFilter === "all" || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });
  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  const handleAddEmployee = async () => {
    const name = sanitizeText(form.name, 80);
    const email = sanitizeEmail(form.email);
    const employeeId = sanitizeId(form.employeeId);
    const department = sanitizeText(form.department, 60);

    if (!name || !email || !employeeId || !department) {
      toast.error("Please complete all fields with valid characters.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setAdding(true);
    // A uniquely-named SECONDARY Firebase app — creating the auth user here
    // does NOT disturb the admin's own login session on the default app.
    const secondaryApp = initializeApp(firebaseConfig, `employee-creator-${Date.now()}`);
    try {
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword());
      const newUid = cred.user.uid;

      // Written while signed in AS the new employee on the secondary app,
      // so it satisfies the `isOwner` create rule.
      await setDoc(doc(getFirestore(secondaryApp), "users", newUid), {
        uid: newUid,
        name,
        email,
        employeeId,
        department,
        role: "employee",
        active: true,
        createdAt: serverTimestamp(),
      });

      // Employee sets their own password via the reset email.
      await sendPasswordResetEmail(secondaryAuth, email);
      await secondaryAuth.signOut();

      toast.success(`${name} added — a password-setup email was sent to ${email}.`);
      setForm(EMPTY_FORM);
      setAddOpen(false);
      await fetchEmployees();
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      let message = "Failed to add employee.";
      if (code === "auth/email-already-in-use")
        message = "An account with this email already exists.";
      if (code === "auth/invalid-email") message = "That email address is invalid.";
      toast.error(message);
    } finally {
      await deleteApp(secondaryApp);
      setAdding(false);
    }
  };

  const handleToggleActive = async () => {
    if (!target) return;
    const nextActive = target.active === false; // currently inactive => reactivate
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "users", target.uid), { active: nextActive });
      toast.success(`${target.name} ${nextActive ? "reactivated" : "deactivated"}.`);
      setToggleOpen(false);
      await fetchEmployees();
    } catch {
      toast.error("Failed to update employee.");
    } finally {
      setActionLoading(false);
    }
  };

  const inputClasses =
    "h-11 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl text-sm";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-0 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Add, search and deactivate employee accounts.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={fetchEmployees}
            disabled={loading}
            className="rounded-xl border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="gradient-primary text-white rounded-xl"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <Card className="glass-card rounded-2xl opacity-0 animate-fade-in-delay">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or email..."
                className={cn(inputClasses, "pl-10")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className={inputClasses}>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All Departments" />
                  </div>
                </SelectTrigger>
                <SelectContent className="glass-card border-white/[0.08] rounded-xl">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">ID</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Department</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Role</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.04]">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map((emp) => {
                    const isActive = emp.active !== false;
                    return (
                      <TableRow key={emp.uid} className="border-white/[0.04] hover:bg-white/[0.02]">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center border border-primary/20">
                              <span className="text-xs font-bold text-primary">
                                {emp.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{emp.name}</span>
                              <span className="text-xs text-muted-foreground">{emp.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{emp.employeeId}</TableCell>
                        <TableCell className="text-sm">{emp.department}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[10px] font-bold border-none rounded-full px-2.5 py-0.5",
                            emp.role === "admin"
                              ? "bg-primary/20 text-primary"
                              : "bg-white/10 text-muted-foreground"
                          )}>
                            {emp.role?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[10px] font-bold border-none rounded-full px-2.5 py-0.5",
                            isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                          )}>
                            {isActive ? "ACTIVE" : "INACTIVE"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {emp.role === "admin" ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 rounded-lg",
                                isActive
                                  ? "hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                                  : "hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400"
                              )}
                              onClick={() => {
                                setTarget(emp);
                                setToggleOpen(true);
                              }}
                            >
                              {isActive ? (
                                <><UserMinus className="mr-1.5 h-4 w-4" /> Deactivate</>
                              ) : (
                                <><UserCheck className="mr-1.5 h-4 w-4" /> Reactivate</>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-8 w-8 opacity-40" />
                        <p className="text-sm">
                          {employees.length === 0
                            ? "No employees yet."
                            : "No employees match your filters."}
                        </p>
                        {employees.length === 0 && (
                          <p className="text-xs opacity-70">
                            Click &quot;Add Employee&quot; to invite your first team member.
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Employee dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => !adding && setAddOpen(o)}>
        <DialogContent className="glass-card border-white/[0.08] rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Employee</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Creates the account and emails the employee a link to set their password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/70">Full Name</Label>
              <Input
                className={inputClasses}
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/70">Email</Label>
              <Input
                className={inputClasses}
                placeholder="jane@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground/70">Employee ID</Label>
                <Input
                  className={inputClasses}
                  placeholder="EMP012"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground/70">Department</Label>
                <Input
                  className={inputClasses}
                  placeholder="Engineering"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={adding}
              className="flex-1 rounded-xl border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEmployee}
              disabled={adding}
              className="flex-1 rounded-xl gradient-primary text-white"
            >
              {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate / Deactivate dialog */}
      <Dialog open={toggleOpen} onOpenChange={(o) => !actionLoading && setToggleOpen(o)}>
        <DialogContent className="glass-card border-white/[0.08] rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className={cn("text-xl", target?.active === false ? "text-emerald-400" : "text-red-400")}>
              {target?.active === false ? "Reactivate" : "Deactivate"} Employee
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {target?.active === false ? (
                <>Allow <span className="text-foreground font-semibold">{target?.name}</span> to mark attendance again?</>
              ) : (
                <>Stop <span className="text-foreground font-semibold">{target?.name}</span> from marking attendance? Their history is kept.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setToggleOpen(false)}
              disabled={actionLoading}
              className="flex-1 rounded-xl border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleToggleActive}
              disabled={actionLoading}
              className={cn(
                "flex-1 rounded-xl text-white border-none",
                target?.active === false ? "bg-emerald-500/80 hover:bg-emerald-500" : "bg-red-500/80 hover:bg-red-500"
              )}
            >
              {actionLoading
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : target?.active === false ? "Reactivate" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
