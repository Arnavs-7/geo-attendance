"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { Loader2, Search, Edit, UserMinus, UserPlus, RefreshCw, Mail, Shield, Building } from "lucide-react";
import { UserProfile, UserRole } from "@/types";
import { cn } from "@/lib/utils";

export default function AdminEmployees() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => doc.data() as UserProfile);
      setEmployees(data);
    } catch (error) {
      toast.error("Failed to fetch employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || 
                         emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
                         emp.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === "all" || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const departments = Array.from(new Set(employees.map(e => e.department)));

  const handleUpdateRole = async (newRole: UserRole) => {
    if (!selectedEmployee) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "users", selectedEmployee.uid), { role: newRole });
      toast.success(`Updated ${selectedEmployee.name} to ${newRole}`);
      fetchEmployees();
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error("Failed to update role.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedEmployee) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "users", selectedEmployee.uid), { active: false });
      toast.success(`Deactivated ${selectedEmployee.name}`);
      fetchEmployees();
      setIsDeactivateModalOpen(false);
    } catch (error) {
      toast.error("Failed to deactivate.");
    } finally {
      setActionLoading(false);
    }
  };

  const inputClasses = "h-11 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 rounded-xl text-sm";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-0 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground mt-1">Manage user roles and department assignments.</p>
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
          <Button disabled className="gradient-primary text-white rounded-xl hover:shadow-blue-500/30 hover:shadow-lg transition-all">
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
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">ID</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Department</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Role</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Joined</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                      <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary/50" />
                      <p className="text-sm text-muted-foreground mt-4 animate-pulse">Fetching employees...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => (
                    <TableRow key={emp.uid} className="border-white/[0.04] hover:bg-white/[0.02]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center border border-primary/20">
                            <span className="text-xs font-bold text-primary">{emp.name?.charAt(0)}</span>
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
                          emp.role === 'admin' 
                            ? "bg-primary/20 text-primary" 
                            : "bg-white/10 text-muted-foreground"
                        )}>
                          {emp.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp.createdAt ? format(emp.createdAt.toDate(), "MMM dd, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-white/10"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setIsDeactivateModalOpen(true);
                            }}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                      No employees found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="glass-card border-white/[0.08] rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Employee Role</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Change the access level for <span className="text-foreground font-semibold">{selectedEmployee?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/70 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                Select Role
              </Label>
              <Select 
                defaultValue={selectedEmployee?.role} 
                onValueChange={(val) => handleUpdateRole(val as UserRole)}
              >
                <SelectTrigger className={inputClasses}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/[0.08] rounded-xl">
                  <SelectItem value="employee">Employee (Basic Access)</SelectItem>
                  <SelectItem value="admin">Admin (Full Control)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              className="w-full rounded-xl border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Modal */}
      <Dialog open={isDeactivateModalOpen} onOpenChange={setIsDeactivateModalOpen}>
        <DialogContent className="glass-card border-white/[0.08] rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-400">Deactivate Employee</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to deactivate <span className="text-foreground font-semibold">{selectedEmployee?.name}</span>? 
              This will prevent them from marking attendance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDeactivateModalOpen(false)}
              className="flex-1 rounded-xl border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeactivate} 
              disabled={actionLoading}
              className="flex-1 rounded-xl bg-red-500/80 hover:bg-red-500 text-white border-none"
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
