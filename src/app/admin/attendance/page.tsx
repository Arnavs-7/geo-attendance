"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { Loader2, Search, AlertTriangle, ClipboardList, LogOut } from "lucide-react";
import { AttendanceRecord, OfficeConfig } from "@/types";
import { computeStatus, formatDuration, localDateString } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export default function AdminAttendance() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null);
  const [filters, setFilters] = useState({
    date: localDateString(),
    status: "all",
    search: "",
  });
  const [target, setTarget] = useState<AttendanceRecord | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const constraints = [
        where("date", "==", filters.date),
        orderBy("checkInTime", "desc"),
      ];
      const snapshot = await getDocs(query(collection(db, "attendance"), ...constraints));
      let rows = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as AttendanceRecord)
      );
      if (filters.status !== "all") {
        rows = rows.filter((r) => r.status === filters.status);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.userName.toLowerCase().includes(q) ||
            r.employeeId.toLowerCase().includes(q)
        );
      }
      setRecords(rows);
    } catch (error) {
      console.error("Attendance fetch error:", error);
      toast.error("Failed to fetch attendance records.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    getDoc(doc(db, "officeConfig", "default")).then((snap) => {
      if (snap.exists()) setOfficeConfig(snap.data() as OfficeConfig);
    });
  }, []);

  const handleManualCheckout = async () => {
    if (!target) return;
    setClosing(true);
    try {
      await updateDoc(doc(db, "attendance", target.id), {
        checkOutTime: serverTimestamp(),
        lastActionAt: serverTimestamp(),
        closedByAdmin: true,
      });
      toast.success(`Closed ${target.userName}'s record.`);
      setCloseOpen(false);
      await fetchAttendance();
    } catch {
      toast.error("Failed to close the record.");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Attendance Records</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Browse daily records and close forgotten check-outs.
        </p>
      </div>

      <Card className="glass-card rounded-2xl opacity-0 animate-fade-in-delay">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name or ID..."
                  className="h-11 pl-8 bg-secondary/50 border-border/50 rounded-xl text-sm"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                className="h-11 bg-secondary/50 border-border/50 rounded-xl text-sm"
                value={filters.date}
                max={localDateString()}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="h-11 bg-secondary/50 border-border/50 rounded-xl text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead>Employee</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.04]">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : records.length > 0 ? (
                  records.map((record) => {
                    const realStatus = computeStatus(
                      record.checkInTime,
                      officeConfig?.lateThresholdTime
                    );
                    return (
                      <TableRow key={record.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                        <TableCell>
                          <p className="font-medium text-sm">{record.userName}</p>
                          <p className="text-xs text-muted-foreground">{record.employeeId}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(record.checkInTime.toDate(), "hh:mm a")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.checkOutTime ? (
                            <span className="flex items-center gap-1.5">
                              {format(record.checkOutTime.toDate(), "hh:mm a")}
                              {record.closedByAdmin && (
                                <span className="text-[10px] uppercase text-violet-400">(admin)</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-amber-400 text-xs">Still open</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDuration(record.checkInTime, record.checkOutTime)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-xs font-semibold border-none rounded-full px-3",
                            realStatus === "present"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-amber-500/20 text-amber-300"
                          )}>
                            {realStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {Math.round(record.distanceFromOffice)}m
                          {record.isSuspicious && (
                            <AlertTriangle
                              className="inline ml-1.5 h-3.5 w-3.5 text-orange-400"
                              aria-label={record.suspiciousReason || "Suspicious"}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!record.checkOutTime ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10"
                              onClick={() => {
                                setTarget(record);
                                setCloseOpen(true);
                              }}
                            >
                              <LogOut className="mr-1.5 h-4 w-4" />
                              Close
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ClipboardList className="h-8 w-8 opacity-40" />
                        <p className="text-sm">No records for the selected filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Manual check-out dialog */}
      <Dialog open={closeOpen} onOpenChange={(o) => !closing && setCloseOpen(o)}>
        <DialogContent className="glass-card border-white/[0.08] rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl">Close Check-Out</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Manually check out{" "}
              <span className="text-foreground font-semibold">{target?.userName}</span> for{" "}
              {target?.date}? The check-out time will be recorded as now and flagged
              as admin-closed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setCloseOpen(false)}
              disabled={closing}
              className="flex-1 rounded-xl border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualCheckout}
              disabled={closing}
              className="flex-1 rounded-xl gradient-primary text-white"
            >
              {closing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Close Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
