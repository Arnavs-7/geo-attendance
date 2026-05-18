"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format, eachDayOfInterval, startOfMonth } from "date-fns";
import { toast } from "react-hot-toast";
import { Download, BarChart3, CheckCircle2, Clock, UserX } from "lucide-react";
import { AttendanceRecord, OfficeConfig, UserProfile } from "@/types";
import { computeStatus, workedHours, localDateString } from "@/lib/attendance";
import { escapeCsv } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

interface EmployeeSummary {
  uid: string;
  name: string;
  employeeId: string;
  department: string;
  present: number;
  late: number;
  absent: number;
  rate: number;
}

export default function AdminReports() {
  const today = localDateString();
  const [range, setRange] = useState({
    start: localDateString(startOfMonth(new Date())),
    end: today,
  });
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null);
  const [summaries, setSummaries] = useState<EmployeeSummary[]>([]);

  const buildReport = useCallback(
    (
      emps: UserProfile[],
      recs: AttendanceRecord[],
      config: OfficeConfig | null,
      start: string,
      end: string
    ) => {
      const dayCount = Math.max(
        1,
        eachDayOfInterval({ start: new Date(start), end: new Date(end) }).length
      );
      const recsByUser = new Map<string, AttendanceRecord[]>();
      for (const r of recs) {
        const list = recsByUser.get(r.userId) ?? [];
        list.push(r);
        recsByUser.set(r.userId, list);
      }

      const rows: EmployeeSummary[] = emps
        .map((emp) => {
          const userRecs = recsByUser.get(emp.uid) ?? [];
          let present = 0;
          let late = 0;
          for (const r of userRecs) {
            if (computeStatus(r.checkInTime, config?.lateThresholdTime) === "late") late++;
            else present++;
          }
          const absent = Math.max(0, dayCount - userRecs.length);
          const rate = dayCount > 0 ? Math.round(((present + late) / dayCount) * 100) : 0;
          return {
            uid: emp.uid,
            name: emp.name,
            employeeId: emp.employeeId,
            department: emp.department,
            present,
            late,
            absent,
            rate,
          };
        })
        .sort((a, b) => a.rate - b.rate);

      setSummaries(rows);
    },
    []
  );

  const fetchReport = useCallback(async () => {
    if (range.start > range.end) {
      toast.error("Start date must be before the end date.");
      return;
    }
    setLoading(true);
    try {
      const [officeSnap, empSnap, attSnap] = await Promise.all([
        getDoc(doc(db, "officeConfig", "default")),
        getDocs(query(collection(db, "users"), where("role", "==", "employee"))),
        getDocs(
          query(
            collection(db, "attendance"),
            where("date", ">=", range.start),
            where("date", "<=", range.end),
            orderBy("date", "asc")
          )
        ),
      ]);

      const config = officeSnap.exists() ? (officeSnap.data() as OfficeConfig) : null;
      const emps = empSnap.docs.map((d) => d.data() as UserProfile);
      const recs = attSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord));

      setOfficeConfig(config);
      setEmployees(emps);
      setRecords(recs);
      buildReport(emps, recs, config, range.start, range.end);
    } catch (error) {
      console.error("Report error:", error);
      toast.error("Failed to generate the report.");
    } finally {
      setLoading(false);
    }
  }, [range, buildReport]);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = summaries.reduce(
    (acc, s) => ({
      present: acc.present + s.present,
      late: acc.late + s.late,
      absent: acc.absent + s.absent,
    }),
    { present: 0, late: 0, absent: 0 }
  );

  const handleExportCSV = () => {
    if (employees.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    const days = eachDayOfInterval({
      start: new Date(range.start),
      end: new Date(range.end),
    }).map((d) => localDateString(d));

    const recordIndex = new Map<string, AttendanceRecord>();
    for (const r of records) recordIndex.set(`${r.userId}_${r.date}`, r);

    const header = [
      "Employee Name",
      "Date",
      "Check-In Time",
      "Check-Out Time",
      "Duration (hours)",
      "Status",
    ];
    const lines = [header.join(",")];

    for (const emp of employees) {
      for (const day of days) {
        const rec = recordIndex.get(`${emp.uid}_${day}`);
        if (rec) {
          const status = computeStatus(rec.checkInTime, officeConfig?.lateThresholdTime);
          const hrs = workedHours(rec.checkInTime, rec.checkOutTime);
          lines.push(
            [
              escapeCsv(emp.name),
              escapeCsv(day),
              escapeCsv(format(rec.checkInTime.toDate(), "HH:mm")),
              escapeCsv(rec.checkOutTime ? format(rec.checkOutTime.toDate(), "HH:mm") : ""),
              escapeCsv(hrs ?? ""),
              escapeCsv(status === "late" ? "Late" : "Present"),
            ].join(",")
          );
        } else {
          lines.push(
            [escapeCsv(emp.name), escapeCsv(day), "", "", "", "Absent"].join(",")
          );
        }
      }
    }

    const blob = new Blob(["﻿" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${range.start}_to_${range.end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded.");
  };

  const inputClasses = "h-11 bg-secondary/50 border-border/50 rounded-xl text-sm";

  const statCards = [
    { label: "Present", value: totals.present, icon: CheckCircle2, color: "text-emerald-400", gradient: "from-emerald-500/20 to-emerald-500/5" },
    { label: "Late Arrivals", value: totals.late, icon: Clock, color: "text-amber-400", gradient: "from-amber-500/20 to-amber-500/5" },
    { label: "Absences", value: totals.absent, icon: UserX, color: "text-red-400", gradient: "from-red-500/20 to-red-500/5" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-0 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Attendance summary for a date range. Late = check-in after{" "}
            {officeConfig?.lateThresholdTime || "09:30"}.
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={loading}
          className="gradient-primary text-white rounded-xl"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Date range */}
      <Card className="glass-card rounded-2xl opacity-0 animate-fade-in-delay">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                className={inputClasses}
                value={range.start}
                max={range.end}
                onChange={(e) => setRange({ ...range, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                className={inputClasses}
                value={range.end}
                min={range.start}
                max={today}
                onChange={(e) => setRange({ ...range, end: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={fetchReport}
                disabled={loading}
                className="w-full rounded-xl gradient-primary text-white"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 opacity-0 animate-fade-in-delay-2">
        {statCards.map((stat, i) => (
          <Card key={i} className="glass-card rounded-2xl">
            <CardContent className="p-4 sm:p-5">
              <div className={cn("h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3", stat.gradient)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-employee table */}
      <Card className="glass-card rounded-2xl opacity-0 animate-fade-in-delay-3">
        <CardHeader>
          <CardTitle className="text-lg">By Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.04]">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : summaries.length > 0 ? (
                  summaries.map((s) => (
                    <TableRow
                      key={s.uid}
                      className={cn(
                        "border-white/[0.04] hover:bg-white/[0.02]",
                        s.rate < 75 && "bg-red-500/[0.04]"
                      )}
                    >
                      <TableCell>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.employeeId}</p>
                      </TableCell>
                      <TableCell className="text-sm">{s.department}</TableCell>
                      <TableCell className="text-center text-sm text-emerald-300">{s.present}</TableCell>
                      <TableCell className={cn(
                        "text-center text-sm font-semibold",
                        s.late > 0 ? "text-amber-300" : "text-muted-foreground"
                      )}>
                        {s.late}
                      </TableCell>
                      <TableCell className={cn(
                        "text-center text-sm font-semibold",
                        s.absent > 0 ? "text-red-300" : "text-muted-foreground"
                      )}>
                        {s.absent}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-xs font-bold border-none rounded-full px-3",
                          s.rate >= 90
                            ? "bg-emerald-500/20 text-emerald-300"
                            : s.rate >= 75
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-red-500/20 text-red-300"
                        )}>
                          {s.rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <BarChart3 className="h-8 w-8 opacity-40" />
                        <p className="text-sm">No data for this date range.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && summaries.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Rows shaded red are below 75% attendance. Absences count every
              calendar day in the range with no check-in.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
