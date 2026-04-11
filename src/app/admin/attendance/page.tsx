"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "react-hot-toast";
import { Loader2, Download, Search, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { AttendanceRecord } from "@/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

export default function AdminAttendance() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    status: "all",
    search: "",
  });

  const inputClasses = "h-11 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 rounded-xl text-sm";

  const fetchAttendance = useCallback(async (loadMore = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, "attendance"),
        orderBy("checkInTime", "desc"),
        limit(PAGE_SIZE)
      );

      if (filters.date) {
        q = query(q, where("date", "==", filters.date));
      }
      if (filters.status !== "all") {
        q = query(q, where("status", "==", filters.status));
      }
      if (loadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      
      // Client-side search (Firestore doesn't support partial string match easily)
      const filteredRecords = filters.search 
        ? newRecords.filter(r => 
            r.userName.toLowerCase().includes(filters.search.toLowerCase()) || 
            r.employeeId.toLowerCase().includes(filters.search.toLowerCase())
          )
        : newRecords;

      if (loadMore) {
        setRecords(prev => [...prev, ...filteredRecords]);
      } else {
        setRecords(filteredRecords);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch attendance records.");
    } finally {
      setLoading(false);
    }
  }, [filters, lastDoc]);

  useEffect(() => {
    fetchAttendance();
  }, [filters.date, filters.status]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch current month's records for export
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      const q = query(
        collection(db, "attendance"),
        orderBy("checkInTime", "desc")
      );
      const snapshot = await getDocs(q);
      const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));

      const csvRows = [
        ["Employee Name", "Employee ID", "Date", "Check In", "Check Out", "Status", "Distance (m)", "Accuracy (m)", "Suspicious", "Reason"].join(",")
      ];

      allRecords.forEach(r => {
        csvRows.push([
          r.userName,
          r.employeeId,
          r.date,
          format(r.checkInTime.toDate(), "HH:mm:ss"),
          r.checkOutTime ? format(r.checkOutTime.toDate(), "HH:mm:ss") : "N/A",
          r.status,
          Math.round(r.distanceFromOffice),
          Math.round(r.gpsAccuracy),
          r.isSuspicious ? "YES" : "NO",
          r.suspiciousReason || ""
        ].join(","));
      });

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `attendance_export_${format(new Date(), "yyyy-MM-dd")}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("CSV exported successfully!");
    } catch (error) {
      toast.error("Failed to export CSV.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-0 animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">Attendance Records</h1>
        <Button onClick={handleExportCSV} disabled={exporting} className="gradient-primary text-white rounded-xl hover:shadow-blue-500/30 hover:shadow-lg transition-all">
          {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export CSV
        </Button>
      </div>

      <Card className="glass-card rounded-2xl opacity-0 animate-fade-in-delay">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name or ID..."
                  className="h-11 pl-8 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 rounded-xl text-sm"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAttendance()}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
               <Button variant="outline" className="w-full" onClick={() => fetchAttendance()}>
                 Apply Filters
               </Button>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : records.length > 0 ? (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.userName}</p>
                          <p className="text-xs text-muted-foreground">{record.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{format(record.checkInTime.toDate(), "hh:mm a")}</TableCell>
                      <TableCell>
                        {record.checkOutTime ? format(record.checkOutTime.toDate(), "hh:mm a") : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-xs font-semibold border-none rounded-full px-3",
                          record.status === 'present' ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                        )}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{Math.round(record.distanceFromOffice)}m</TableCell>
                      <TableCell>
                        {record.isSuspicious ? (
                          <div className="flex items-center gap-1 text-orange-400" title={record.suspiciousReason || "Suspicious activity"}>
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-tight">Suspicious</span>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-400 font-medium uppercase tracking-tight">Clean</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No records found matching filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={() => fetchAttendance(true)} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

